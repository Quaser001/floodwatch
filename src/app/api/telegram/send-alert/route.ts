import { NextRequest, NextResponse } from 'next/server';

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '';
const TELEGRAM_API = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}`;

// Your Telegram chat ID - you can get this by messaging @userinfobot on Telegram
// For demo, we'll use a default or allow passing it
const DEFAULT_CHAT_ID = process.env.TELEGRAM_CHAT_ID || '';

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { sensorId, areaName, waterLevel, threshold, chatId } = body;

        console.log('[Telegram API] Received request:', { sensorId, areaName, waterLevel, threshold });
        console.log('[Telegram API] BOT_TOKEN exists:', !!TELEGRAM_BOT_TOKEN);
        console.log('[Telegram API] DEFAULT_CHAT_ID:', DEFAULT_CHAT_ID);

        // Use provided chatId or default
        const targetChatId = chatId || DEFAULT_CHAT_ID;

        if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_BOT_TOKEN.includes(':')) {
            console.error('[Telegram API] Bot token invalid or missing');
            return NextResponse.json(
                { success: false, error: 'Telegram bot not configured' },
                { status: 400 }
            );
        }

        if (!targetChatId) {
            console.log('[Telegram API] No chat ID, fetching from updates...');
            // Try to get updates to find chat IDs
            const updatesResponse = await fetch(`${TELEGRAM_API}/getUpdates`);
            const updatesData = await updatesResponse.json();
            console.log('[Telegram API] Updates response:', JSON.stringify(updatesData).substring(0, 200));

            if (updatesData.ok && updatesData.result.length > 0) {
                // Get the most recent chat ID
                const recentChat = updatesData.result[updatesData.result.length - 1];
                const chatIdFromUpdates = recentChat.message?.chat?.id || recentChat.callback_query?.message?.chat?.id;

                if (chatIdFromUpdates) {
                    console.log('[Telegram API] Found chat ID from updates:', chatIdFromUpdates);
                    // Send alert to this chat
                    const result = await sendAlertMessage(chatIdFromUpdates, areaName, waterLevel, threshold, sensorId);
                    console.log('[Telegram API] Send result:', result);

                    return NextResponse.json({
                        success: true,
                        message: 'Alert sent to telegram',
                        chatId: chatIdFromUpdates
                    });
                }
            }

            return NextResponse.json(
                { success: false, error: 'No chat ID available. Please message the bot first on Telegram.' },
                { status: 400 }
            );
        }

        // Send the alert
        console.log('[Telegram API] Sending to chat ID:', targetChatId);
        const result = await sendAlertMessage(targetChatId, areaName, waterLevel, threshold, sensorId);
        console.log('[Telegram API] Message sent successfully:', result);

        return NextResponse.json({
            success: true,
            message: 'Alert sent successfully',
            chatId: targetChatId,
            telegramResponse: result
        });

    } catch (error) {
        console.error('[Telegram API] Error:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to send alert', details: String(error) },
            { status: 500 }
        );
    }
}

async function sendAlertMessage(
    chatId: string | number,
    areaName: string,
    waterLevel: number,
    threshold: number,
    sensorId: string
) {
    const severityEmoji = waterLevel >= 70 ? '🔴' : waterLevel >= 50 ? '🟠' : '🟡';
    const severity = waterLevel >= 70 ? 'CRITICAL' : waterLevel >= 50 ? 'WARNING' : 'ELEVATED';

    const message = `🚨 *FloodWatch IoT ALERT*

${severityEmoji} *${severity}* - Water Level Exceeded

📍 *Location:* ${areaName}
📡 *Sensor:* ${sensorId}
💧 *Water Level:* ${waterLevel.toFixed(0)}cm
⚠️ *Threshold:* ${threshold}cm
📊 *Excess:* +${(waterLevel - threshold).toFixed(0)}cm

*Immediate Action Required*
• Avoid this area if possible
• Stay on higher ground
• Monitor official updates

_Sent via FloodWatch Guwahati - IoT Monitoring System_
🕐 ${new Date().toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata' })}`;

    const response = await fetch(`${TELEGRAM_API}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            chat_id: chatId,
            text: message,
            parse_mode: 'Markdown',
            disable_notification: false,
        }),
    });

    if (!response.ok) {
        const error = await response.json();
        console.error('[Telegram] Send error:', error);
        throw new Error(error.description || 'Failed to send message');
    }

    return response.json();
}

// GET endpoint to check bot status and get chat info
export async function GET() {
    if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_BOT_TOKEN.includes(':')) {
        return NextResponse.json({
            configured: false,
            error: 'Telegram bot token not configured'
        });
    }

    try {
        // Get bot info
        const botInfoResponse = await fetch(`${TELEGRAM_API}/getMe`);
        const botInfo = await botInfoResponse.json();

        // Get recent chats
        const updatesResponse = await fetch(`${TELEGRAM_API}/getUpdates?limit=5`);
        const updates = await updatesResponse.json();

        const recentChats: { id: number; type: string; title?: string; username?: string }[] = [];

        if (updates.ok) {
            updates.result.forEach((update: any) => {
                const chat = update.message?.chat || update.callback_query?.message?.chat;
                if (chat && !recentChats.find(c => c.id === chat.id)) {
                    recentChats.push({
                        id: chat.id,
                        type: chat.type,
                        title: chat.title,
                        username: chat.username || chat.first_name
                    });
                }
            });
        }

        return NextResponse.json({
            configured: true,
            bot: botInfo.ok ? {
                username: botInfo.result.username,
                name: botInfo.result.first_name
            } : null,
            recentChats,
            defaultChatId: DEFAULT_CHAT_ID || null
        });
    } catch (error) {
        return NextResponse.json({
            configured: false,
            error: 'Failed to connect to Telegram API'
        });
    }
}
