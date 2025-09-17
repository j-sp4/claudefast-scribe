import * as vscode from 'vscode';

class LoggerService {
    private outputChannel: vscode.OutputChannel;
    private logLevel: 'debug' | 'info' | 'warn' | 'error' = 'info';

    constructor() {
        this.outputChannel = vscode.window.createOutputChannel('Scribe MCP');
    }

    private formatMessage(level: string, message: string, data?: any): string {
        const timestamp = new Date().toISOString();
        let formatted = `[${timestamp}] [${level.toUpperCase()}] ${message}`;
        
        if (data !== undefined) {
            if (data instanceof Error) {
                formatted += `\n  Error: ${data.message}`;
                if (data.stack) {
                    formatted += `\n  Stack: ${data.stack}`;
                }
            } else if (typeof data === 'object') {
                formatted += `\n  Data: ${JSON.stringify(data, null, 2)}`;
            } else {
                formatted += ` - ${data}`;
            }
        }
        
        return formatted;
    }

    debug(message: string, data?: any): void {
        if (this.logLevel === 'debug') {
            const formatted = this.formatMessage('debug', message, data);
            this.outputChannel.appendLine(formatted);
        }
    }

    info(message: string, data?: any): void {
        const formatted = this.formatMessage('info', message, data);
        this.outputChannel.appendLine(formatted);
    }

    warn(message: string, data?: any): void {
        const formatted = this.formatMessage('warn', message, data);
        this.outputChannel.appendLine(formatted);
    }

    error(message: string, data?: any): void {
        const formatted = this.formatMessage('error', message, data);
        this.outputChannel.appendLine(formatted);
        
        // Also log to console for debugging
        console.error(formatted);
    }

    show(): void {
        this.outputChannel.show();
    }

    clear(): void {
        this.outputChannel.clear();
    }

    setLogLevel(level: 'debug' | 'info' | 'warn' | 'error'): void {
        this.logLevel = level;
        this.info(`Log level set to: ${level}`);
    }
}

// Export singleton instance
export const Logger = new LoggerService();