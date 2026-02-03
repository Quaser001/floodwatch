import { TelegramUpdate, TelegramMessage } from './types';
import { telegramClient } from './client';
// import { useFloodStore } from '@/lib/store'; // Store doesn't work on server
import { supabase } from '@/lib/supabase';
import { FloodReport, FloodType } from '../types';

// --- Session Management ---

type SessionState = 'IDLE' | 'AWAITING_FLOOD_TYPE' | 'AWAITING_LOCATION' | 'AWAITING_PHOTO';

interface UserSession {
    state: SessionState;
    draftReport: Partial<FloodReport>;
}

// In-memory session store (Persists in browser during polling)
const sessions = new Map<number, UserSession>();

function getSession(userId: number): UserSession {
    if (!sessions.has(userId)) {
        sessions.set(userId, { state: 'IDLE', draftReport: {} });
    }
    return sessions.get(userId)!;
}

function resetSession(userId: number) {
    sessions.set(userId, { state: 'IDLE', draftReport: {} });
}

// --- Keyboards ---

const KEYBOARDS = {
    MAIN_MENU: {
        keyboard: [
            [{ text: "🚨 Report Flood" }, { text: "📍 Share Location" }],
            [{ text: "🌧 View Active Alerts" }, { text: "ℹ️ Help" }]
        ],
        resize_keyboard: true,
        persistent: true
    },
    FLOOD_TYPE: {
        keyboard: [
            [{ text: "🌊 Flood" }, { text: "💧 Waterlogging" }],
            [{ text: "🚿 Drain Overflow" }, { text: "❌ Cancel" }]
        ],
        resize_keyboard: true,
        one_time_keyboard: true
    },
    LOCATION_REQUEST: {
        keyboard: [
            [{ text: "📍 Share Location", request_location: true }],
            [{ text: "❌ Cancel" }]
        ],
        resize_keyboard: true,
        one_time_keyboard: true
    },
    PHOTO_REQUEST: {
        keyboard: [
            [{ text: "📷 Send Photo" }, { text: "⏭ Skip" }],
            [{ text: "❌ Cancel" }]
        ],
        resize_keyboard: true,
        one_time_keyboard: true
    },
    CONFIRMATION: {
        // Remove keyboard or show main menu
        remove_keyboard: true
    }
};

// --- Main Handler ---

export async function handleTelegramUpdate(update: TelegramUpdate) {
    // 1. Handle Callback Queries (Inline Buttons)
    // (For future expansion or "Open Map" clicks logging)
    if (update.channel_post || update.edited_message) return; // Ignore posts
    if (!update.message) return;

    const msg = update.message;
    const chatId = msg.chat.id;
    const text = msg.text?.trim(); // Normalize text
    const user = msg.from;
    const userId = user?.id || 0;

    console.log(`[Telegram] ${user?.first_name}: ${text || '[Media]'}`);

    // store access - REMOVED (Serverless)
    // const store = typeof window !== 'undefined' ? useFloodStore.getState() : null;

    // Get Session
    const session = getSession(userId);

    // --- Global Cancellation ---
    if (text === '❌ Cancel') {
        resetSession(userId);
        await telegramClient.sendMessage(chatId, "🚫 Action cancelled.", {
            reply_markup: KEYBOARDS.MAIN_MENU
        });
        return;
    }

    // --- State Machine ---

    switch (session.state) {
        case 'IDLE':
            await handleIdleState(chatId, text, msg);
            break;
        case 'AWAITING_FLOOD_TYPE':
            await handleFloodTypeState(userId, chatId, text);
            break;
        case 'AWAITING_LOCATION':
            await handleLocationState(userId, chatId, msg);
            break;
        case 'AWAITING_PHOTO':
            await handlePhotoState(userId, chatId, msg);
            break;
    }
}

// --- Specific State Handlers ---

async function handleIdleState(chatId: number, text: string | undefined, msg: TelegramMessage) {

    // Command: /start
    if (text === '/start') {
        await telegramClient.sendMessage(chatId,
            `👋 <b>Welcome to FloodWatch Guwahati</b>\n\n` +
            `You can:\n` +
            `• Report flooding or waterlogging\n` +
            `• Receive nearby flood alerts\n` +
            `• View city-wide flood status\n\n` +
            `Please choose an option below 👇`,
            { reply_markup: KEYBOARDS.MAIN_MENU }
        );
        return;
    }

    // Button: 🚨 Report Flood
    if (text === '🚨 Report Flood') {
        const session = getSession(msg.from!.id);
        session.state = 'AWAITING_FLOOD_TYPE';

        await telegramClient.sendMessage(chatId,
            `<b>What type of issue are you reporting?</b>`,
            { reply_markup: KEYBOARDS.FLOOD_TYPE }
        );
        return;
    }

    // Button: 🌧 View Active Alerts
    if (text === '🌧 View Active Alerts') {
        // Query Supabase for active alerts
        const { count } = await supabase
            .from('reports')
            .select('*', { count: 'exact', head: true })
            .neq('status', 'rejected');

        if (!count || count === 0) {
            await telegramClient.sendMessage(chatId,
                "✅ <b>No active flood alerts.</b>\nGuwahati is currently safe.",
                { reply_markup: KEYBOARDS.MAIN_MENU }
            );
        } else {
            await telegramClient.sendMessage(chatId,
                `⚠️ <b>${count} Active flood reports in Guwahati.</b>\n\n` +
                `Tap below to view the live map.`,
                {
                    reply_markup: {
                        inline_keyboard: [
                            [{ text: "🗺 Open Map", url: "https://floodwatch-guwahati.vercel.app" }]
                        ]
                    }
                });
        }
        return;
    }

    // Button: 📍 Share Location (Quick Check)
    if (text === '📍 Share Location') {
        // Just ask for location directly
        await telegramClient.sendMessage(chatId,
            "Tap the button below to share your current location for a safety check.",
            {
                reply_markup: {
                    keyboard: [[{ text: "📍 Share Current Location", request_location: true }], [{ text: "⬅ Back" }]],
                    resize_keyboard: true,
                    one_time_keyboard: true
                }
            }
        );
        return;
    }

    // Handle incoming Location in IDLE (Quick Check response or generic)
    if (msg.location) {
        await telegramClient.sendMessage(chatId,
            `📍 <b>Location Received</b>\n` +
            `You are in a safe zone. No active alerts nearby.\n\n` +
            `Tip: Tap "🚨 Report Flood" to report an issue.`,
            { reply_markup: KEYBOARDS.MAIN_MENU }
        );
        return;
    }

    // Button: ℹ️ Help
    if (text === 'ℹ️ Help' || text === '/help') {
        await telegramClient.sendMessage(chatId,
            `<b>FloodWatch Bot Help</b>\n` +
            `Use the menu buttons to navigate.\n\n` +
            `🚨 <b>Report Flood:</b> Submit a new report.\n` +
            `🌧 <b>Alerts:</b> Check current status.\n` +
            `📍 <b>Share:</b> Check your location risk.\n\n` +
            `In emergency, call 100/112.`,
            { reply_markup: KEYBOARDS.MAIN_MENU }
        );
        return;
    }

    // Catch-all for Plain Text
    await telegramClient.sendMessage(chatId,
        `To submit a flood report, please use the buttons below 👇`,
        { reply_markup: KEYBOARDS.MAIN_MENU }
    );
}

async function handleFloodTypeState(userId: number, chatId: number, text: string | undefined) {
    const session = getSession(userId);

    // Map text to FloodType
    let type: FloodType | undefined;
    if (text === '🌊 Flood') type = 'flood';
    else if (text === '💧 Waterlogging') type = 'waterlogging';
    else if (text === '🚿 Drain Overflow') type = 'drain_overflow';

    if (type) {
        session.draftReport.type = type;
        session.state = 'AWAITING_LOCATION';

        await telegramClient.sendMessage(chatId,
            `<b>Please share your location so we can log the report accurately.</b>`,
            { reply_markup: KEYBOARDS.LOCATION_REQUEST }
        );
    } else {
        await telegramClient.sendMessage(chatId,
            `Please select a valid type from the menu below:`,
            { reply_markup: KEYBOARDS.FLOOD_TYPE }
        );
    }
}

async function handleLocationState(userId: number, chatId: number, msg: TelegramMessage) {
    const session = getSession(userId);

    if (msg.location) {
        session.draftReport.location = {
            lat: msg.location.latitude,
            lng: msg.location.longitude
        };
        session.state = 'AWAITING_PHOTO';

        await telegramClient.sendMessage(chatId,
            `Thanks! You may also share a photo to increase report confidence.\n` +
            `(Optional)`,
            { reply_markup: KEYBOARDS.PHOTO_REQUEST }
        );
    } else {
        await telegramClient.sendMessage(chatId,
            `⚠️ <b>Location required.</b>\n` +
            `Please tap the "📍 Share Location" button below to continue.`,
            { reply_markup: KEYBOARDS.LOCATION_REQUEST }
        );
    }
}

async function handlePhotoState(userId: number, chatId: number, msg: TelegramMessage) {
    const session = getSession(userId);
    const text = msg.text;

    // Determine if we finalize or wait
    let shouldFinalize = false;
    let photoUrl = undefined;

    if (text === '⏭ Skip') {
        shouldFinalize = true;
    } else if (msg.photo) {
        // In a real app, we'd download the photo via getFile API.
        // Here we just mark it as received.
        photoUrl = 'telegram_photo_placeholder.jpg';
        shouldFinalize = true;
    } else if (text === '📷 Send Photo') {
        // User clicked the button thinking it triggers camera?
        // Or instruct them.
        await telegramClient.sendMessage(chatId,
            `Please tap the 📎 icon or Camera icon to take/send a picture.`,
            { reply_markup: KEYBOARDS.PHOTO_REQUEST }
        );
        return;
    } else {
        // User sent text? Assume they want to skip or didn't understand.
        // Just finalize to be prompt? No, stick to flow.
        await telegramClient.sendMessage(chatId,
            `Please send a photo or tap "⏭ Skip".`,
            { reply_markup: KEYBOARDS.PHOTO_REQUEST }
        );
        return;
    }

    if (shouldFinalize) {
        const { draftReport } = session;

        // Insert into Supabase
        await supabase.from('reports').insert({
            location: draftReport.location,
            area_name: 'Telegram User', // Reverse geocoding optional for now
            type: draftReport.type || 'flood',
            description: 'Reported via Telegram',
            source: 'telegram',
            status: 'pending',
            image_url: photoUrl
        });

        const typeLabel = draftReport.type === 'flood' ? '🌊 Flood' :
            draftReport.type === 'waterlogging' ? '💧 Waterlogging' :
                '🚿 Drain Overflow';

        await telegramClient.sendMessage(chatId,
            `✅ <b>Report received</b>\n\n` +
            `📍 Location: Received\n` +
            `🌊 Type: ${typeLabel}\n\n` +
            `Nearby users will be alerted if required.\n` +
            `Thank you for helping keep the community safe.`,
            { reply_markup: KEYBOARDS.MAIN_MENU }
        );

        resetSession(userId);
    }
}
