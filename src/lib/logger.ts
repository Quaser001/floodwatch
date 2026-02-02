/**
 * Logger Utility for FloodWatch
 * 
 * Purpose: Centralized error logging and debugging helper.
 * 
 * PSEUDO CODE:
 * CLASS Logger
 *   PROPERTY active_logs: Array of LogEntries
 *   
 *   FUNCTION log(level, message, context)
 *     CREATE timestamp
 *     FORMAT log_entry = { timestamp, level, message, context }
 *     PRINT to console with color coding
 *     ADD to active_logs
 *     IF level is ERROR
 *        SEND to external monitoring service (mock implementation for hackathon)
 *     END IF
 *   END FUNCTION
 * 
 *   FUNCTION error(message, error_object)
 *     CALL log('ERROR', message, error_object)
 *   END FUNCTION
 * 
 *   FUNCTION info(message)
 *     CALL log('INFO', message)
 *   END FUNCTION
 * END CLASS
 */

type LogLevel = 'INFO' | 'WARN' | 'ERROR' | 'DEBUG';

interface LogEntry {
    timestamp: string;
    level: LogLevel;
    message: string;
    context?: any;
}

class Logger {
    private static instance: Logger;
    private logs: LogEntry[] = [];

    private constructor() { }

    public static getInstance(): Logger {
        if (!Logger.instance) {
            Logger.instance = new Logger();
        }
        return Logger.instance;
    }

    /**
     * Main logging function
     * pseudo code:
     * 1. Get current time
     * 2. Format the message
     * 3. Print to console based on level
     * 4. Store in local history
     */
    public log(level: LogLevel, message: string, context?: any) {
        const entry: LogEntry = {
            timestamp: new Date().toISOString(),
            level,
            message,
            context,
        };

        this.logs.push(entry);

        // Keep active logs size manageable
        if (this.logs.length > 1000) {
            this.logs.shift(); // Remove oldest
        }

        const style = this.getStyle(level);

        console.log(
            `%c[${entry.timestamp}] [${level}] ${message}`,
            style,
            context || ''
        );
    }

    public info(message: string, context?: any) {
        // pseudo code: Delegate to log with INFO level
        this.log('INFO', message, context);
    }

    public warn(message: string, context?: any) {
        // pseudo code: Delegate to log with WARN level
        this.log('WARN', message, context);
    }

    public error(message: string, error?: any) {
        // pseudo code: Delegate to log with ERROR level
        this.log('ERROR', message, error);
    }

    public debug(message: string, context?: any) {
        // pseudo code: Delegate to log with DEBUG level only if not in production
        if (process.env.NODE_ENV !== 'production') {
            this.log('DEBUG', message, context);
        }
    }

    public getLogs() {
        // pseudo code: Return copy of logs array
        return [...this.logs];
    }

    private getStyle(level: LogLevel): string {
        switch (level) {
            case 'ERROR': return 'color: #ff4d4f; font-weight: bold';
            case 'WARN': return 'color: #faad14; font-weight: bold';
            case 'INFO': return 'color: #1890ff; font-weight: bold';
            case 'DEBUG': return 'color: #52c41a; font-weight: bold';
            default: return 'color: inherit';
        }
    }
}

export const logger = Logger.getInstance();
