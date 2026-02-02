// Live Telegram Bot Integration for FloodWatch Guwahati
// Handles real-time alert broadcasting to Telegram users

import { Alert, User, Coordinates } from './types';
import { isWithinRadius, formatDistance } from './geoUtils';

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '';
const TELEGRAM_API = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}`;

interface TelegramResult {
    success: boolean;
    sentCount: number;
    errors: string[];
}

/**
 * Check if Telegram is configured
 */
export function isTelegramConfigured(): boolean {
    return TELEGRAM_BOT_TOKEN !== '' && TELEGRAM_BOT_TOKEN.includes(':');
}

/**
 * Send a message to a Telegram chat
 */
export async function sendTelegramMessage(
    chatId: string,
    text: string,
    options?: {
        parseMode?: 'HTML' | 'Markdown' | 'MarkdownV2';
        replyMarkup?: object;
    }
): Promise<boolean> {
    if (!isTelegramConfigured()) {
        console.log('[Telegram] Bot not configured, message not sent');
        return false;
    }

    try {
        const response = await fetch(`${TELEGRAM_API}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chat_id: chatId,
                text,
                parse_mode: options?.parseMode || 'Markdown',
                reply_markup: options?.replyMarkup,
                disable_notification: false,
            }),
        });

        if (!response.ok) {
            const error = await response.json();
            console.error('[Telegram] Send error:', error);
            return false;
        }

        return true;
    } catch (error) {
        console.error('[Telegram] Network error:', error);
        return false;
    }
}

/**
 * Format alert message for Telegram
 */
export function formatAlertMessage(alert: Alert): string {
    const typeEmoji: Record<string, string> = {
        flood: '🌊',
        waterlogging: '💧',
        drain_overflow: '🚰',
    };

    const severityLabel: Record<string, string> = {
        critical: '🔴 CRITICAL',
        high: '🟠 HIGH',
        medium: '🟡 MEDIUM',
    };

    const timeDiff = Math.round((Date.now() - new Date(alert.triggeredAt).getTime()) / 60000);
    const timeAgo = timeDiff < 1 ? 'Just now' : `${timeDiff} min ago`;

    return `🚨 *Flood Alert – Guwahati*

${typeEmoji[alert.type] || '⚠️'} *${alert.type.replace('_', ' ').toUpperCase()}* reported near *${alert.areaName}*

🕒 ${timeAgo}
📍 Within ${formatDistance(alert.radius)} radius
⚠️ Severity: ${severityLabel[alert.severity] || alert.severity}
📊 Confidence: ${alert.confidenceScore}/10

*Suggested Actions:*
${alert.suggestedActions.slice(0, 3).map(a => `• ${a}`).join('\n')}

_${alert.notifiedUsers} nearby residents being notified_

Stay safe! Report updates to help your community.`;
}

/**
 * Format follow-up prompt for Telegram
 */
export function formatFollowUpPrompt(alert: Alert): string {
    return `⏱ *Update Request*

Is flooding still ongoing near *${alert.areaName}*?

Your response helps keep the community informed and saves lives.

Reply with:
✅ YES - if flooding continues
❌ NO - if resolved`;
}

/**
 * Get inline keyboard for follow-up
 */
export function getFollowUpKeyboard(alertId: string) {
    return {
        inline_keyboard: [
            [
                { text: '✅ YES - Still flooding', callback_data: `followup_yes_${alertId}` },
            ],
            [
                { text: '❌ NO - Resolved', callback_data: `followup_no_${alertId}` },
            ],
        ],
    };
}

/**
 * Broadcast alert to nearby users
 */
export async function broadcastAlert(
    alert: Alert,
    users: User[]
): Promise<TelegramResult> {
    if (!isTelegramConfigured()) {
        console.log('[Telegram] Broadcasting skipped - bot not configured');
        return { success: false, sentCount: 0, errors: ['Bot not configured'] };
    }

    // Find users within alert radius
    const nearbyUsers = users.filter((user) => {
        if (!user.location) return false;
        return isWithinRadius(alert.location, user.location, alert.radius);
    });

    const message = formatAlertMessage(alert);
    const errors: string[] = [];
    let sentCount = 0;

    for (const user of nearbyUsers) {
        try {
            // Use sessionId as chat_id for demo; in production, use telegram_chat_id
            const success = await sendTelegramMessage(user.sessionId, message);
            if (success) sentCount++;
        } catch (error) {
            errors.push(`Failed to notify user ${user.id}: ${error}`);
        }
    }

    return {
        success: errors.length === 0,
        sentCount,
        errors,
    };
}

/**
 * Send follow-up prompts
 */
export async function sendFollowUpPrompts(
    alert: Alert,
    users: User[]
): Promise<TelegramResult> {
    if (!isTelegramConfigured()) {
        return { success: false, sentCount: 0, errors: ['Bot not configured'] };
    }

    const nearbyUsers = users.filter((user) => {
        if (!user.location) return false;
        return isWithinRadius(alert.location, user.location, alert.radius / 2);
    }).slice(0, 10); // Limit follow-ups

    const message = formatFollowUpPrompt(alert);
    const keyboard = getFollowUpKeyboard(alert.id);
    const errors: string[] = [];
    let sentCount = 0;

    for (const user of nearbyUsers) {
        try {
            const success = await sendTelegramMessage(user.sessionId, message, {
                replyMarkup: keyboard,
            });
            if (success) sentCount++;
        } catch (error) {
            errors.push(`Failed to send follow-up to ${user.id}: ${error}`);
        }
    }

    return {
        success: errors.length === 0,
        sentCount,
        errors,
    };
}

/**
 * Send welcome message to new user
 */
export async function sendWelcomeMessage(
    chatId: string,
    areaName: string = 'Guwahati'
): Promise<boolean> {
    const message = `👋 *Welcome to FloodWatch Guwahati!*

You're now subscribed to flood alerts for the *${areaName}* area.

*What you can do:*
📍 Share your location to receive nearby alerts
🌊 Report flooding when you see it
🗺 View the live map for real-time updates

*Commands:*
/report - Submit a flood report
/status - Check current alerts
/location - Update your location
/help - Get help

Stay safe! 🙏`;

    return sendTelegramMessage(chatId, message);
}

/**
 * Set up webhook for receiving updates (for production)
 */
export async function setupWebhook(webhookUrl: string): Promise<boolean> {
    if (!isTelegramConfigured()) {
        console.error('[Telegram] Cannot setup webhook - bot not configured');
        return false;
    }

    try {
        const response = await fetch(`${TELEGRAM_API}/setWebhook`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                url: webhookUrl,
                allowed_updates: ['message', 'callback_query'],
            }),
        });

        const result = await response.json();
        return result.ok;
    } catch (error) {
        console.error('[Telegram] Webhook setup error:', error);
        return false;
    }
}
