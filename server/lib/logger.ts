import chalk from 'chalk';

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

class Logger {
  private isDevelopment = process.env.NODE_ENV !== 'production';
  
  private formatTimestamp(): string {
    return new Date().toISOString();
  }

  private formatMessage(level: LogLevel, message: string, data?: any): string {
    const timestamp = this.formatTimestamp();
    const dataStr = data ? `\n${JSON.stringify(data, null, 2)}` : '';
    
    // Force output to stderr to bypass Next.js filtering
    return `[${timestamp}] [${level.toUpperCase()}] ${message}${dataStr}`;
  }

  private writeLog(level: LogLevel, message: string, data?: any) {
    const formattedMessage = this.formatMessage(level, message, data);
    
    // Write to stderr instead of stdout to ensure visibility
    switch (level) {
      case 'debug':
        if (this.isDevelopment) {
          process.stderr.write(chalk.gray(formattedMessage) + '\n');
        }
        break;
      case 'info':
        process.stderr.write(chalk.blue(formattedMessage) + '\n');
        break;
      case 'warn':
        process.stderr.write(chalk.yellow(formattedMessage) + '\n');
        break;
      case 'error':
        process.stderr.write(chalk.red(formattedMessage) + '\n');
        break;
    }
  }

  debug(message: string, data?: any) {
    this.writeLog('debug', message, data);
  }

  info(message: string, data?: any) {
    this.writeLog('info', message, data);
  }

  warn(message: string, data?: any) {
    this.writeLog('warn', message, data);
  }

  error(message: string, data?: any) {
    this.writeLog('error', message, data);
  }

  // Create a logger for API routes that includes request info
  api(req: Request, message: string, data?: any) {
    const url = new URL(req.url);
    const method = req.method;
    const enrichedMessage = `[${method} ${url.pathname}] ${message}`;
    this.info(enrichedMessage, data);
  }
}

// Export a singleton instance
export const logger = new Logger();

// Also export a request logger middleware for API routes
export function logRequest(handler: Function) {
  return async function(req: Request, context?: any) {
    const url = new URL(req.url);
    const startTime = Date.now();
    
    logger.info(`→ ${req.method} ${url.pathname}`, {
      query: Object.fromEntries(url.searchParams),
      headers: Object.fromEntries(req.headers.entries()),
    });
    
    try {
      const response = await handler(req, context);
      const duration = Date.now() - startTime;
      
      logger.info(`← ${req.method} ${url.pathname} [${duration}ms]`, {
        status: response.status,
      });
      
      return response;
    } catch (error) {
      const duration = Date.now() - startTime;
      logger.error(`✗ ${req.method} ${url.pathname} [${duration}ms]`, {
        error: error instanceof Error ? error.message : error,
      });
      throw error;
    }
  };
}