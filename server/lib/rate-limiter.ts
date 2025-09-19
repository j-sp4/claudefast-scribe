/**
 * Simple in-memory rate limiter
 * In production, you'd want to use Redis or a similar solution
 */

interface RateLimitConfig {
  windowMs: number;  // Time window in milliseconds
  maxRequests: number; // Max requests per window
}

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

class RateLimiter {
  private limits: Map<string, RateLimitConfig> = new Map();
  private entries: Map<string, RateLimitEntry> = new Map();

  constructor() {
    // Configure rate limits
    this.limits.set('proposal', { windowMs: 3600000, maxRequests: 5 }); // 5 per hour
    this.limits.set('comment', { windowMs: 300000, maxRequests: 20 });  // 20 per 5 min
    this.limits.set('vote', { windowMs: 60000, maxRequests: 30 });      // 30 per minute
    this.limits.set('api', { windowMs: 60000, maxRequests: 100 });      // 100 per minute (general API)
    
    // Clean up old entries periodically
    setInterval(() => this.cleanup(), 60000); // Every minute
  }

  /**
   * Check if a request is allowed
   */
  async checkLimit(
    identifier: string, // Usually userId or IP
    action: string
  ): Promise<{ allowed: boolean; remaining: number; resetTime: number }> {
    const config = this.limits.get(action) || this.limits.get('api')!;
    const key = `${action}:${identifier}`;
    const now = Date.now();
    
    let entry = this.entries.get(key);
    
    // If no entry or window expired, create new entry
    if (!entry || entry.resetTime <= now) {
      entry = {
        count: 0,
        resetTime: now + config.windowMs,
      };
      this.entries.set(key, entry);
    }
    
    // Check if limit exceeded
    if (entry.count >= config.maxRequests) {
      return {
        allowed: false,
        remaining: 0,
        resetTime: entry.resetTime,
      };
    }
    
    // Increment count
    entry.count++;
    
    return {
      allowed: true,
      remaining: config.maxRequests - entry.count,
      resetTime: entry.resetTime,
    };
  }

  /**
   * Reset rate limit for a specific identifier and action
   */
  reset(identifier: string, action: string): void {
    const key = `${action}:${identifier}`;
    this.entries.delete(key);
  }

  /**
   * Clean up expired entries
   */
  private cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.entries.entries()) {
      if (entry.resetTime <= now) {
        this.entries.delete(key);
      }
    }
  }
}

// Export singleton instance
export const rateLimiter = new RateLimiter();

/**
 * Express/Next.js middleware for rate limiting
 */
export function createRateLimitMiddleware(action: string = 'api') {
  return async (req: any, res: any, next?: any) => {
    // Get identifier (prefer user ID, fallback to IP)
    const userId = req.user?.id;
    const ip = req.headers['x-forwarded-for'] || 
                req.headers['x-real-ip'] || 
                req.connection?.remoteAddress ||
                'unknown';
    const identifier = userId || ip;
    
    const result = await rateLimiter.checkLimit(identifier, action);
    
    // Set rate limit headers
    res.setHeader('X-RateLimit-Limit', 
      rateLimiter['limits'].get(action)?.maxRequests || 100);
    res.setHeader('X-RateLimit-Remaining', result.remaining);
    res.setHeader('X-RateLimit-Reset', new Date(result.resetTime).toISOString());
    
    if (!result.allowed) {
      res.setHeader('Retry-After', 
        Math.ceil((result.resetTime - Date.now()) / 1000));
      
      if (res.status) {
        return res.status(429).json({
          error: 'Too many requests',
          message: `Rate limit exceeded. Please try again after ${new Date(result.resetTime).toISOString()}`,
        });
      }
      
      // For Next.js API routes
      return new Response(
        JSON.stringify({
          error: 'Too many requests',
          message: `Rate limit exceeded. Please try again after ${new Date(result.resetTime).toISOString()}`,
        }),
        {
          status: 429,
          headers: {
            'Content-Type': 'application/json',
            'Retry-After': Math.ceil((result.resetTime - Date.now()) / 1000).toString(),
          },
        }
      );
    }
    
    if (next) {
      next();
    }
  };
}

/**
 * Rate limit check for Next.js API routes
 */
export async function checkRateLimit(
  request: Request,
  action: string = 'api'
): Promise<{ 
  allowed: boolean; 
  response?: Response;
  remaining?: number;
  resetTime?: number;
}> {
  // Try to get user ID from auth header or cookie
  const authHeader = request.headers.get('authorization');
  const cookies = request.headers.get('cookie');
  
  // Get IP address
  const ip = request.headers.get('x-forwarded-for') || 
             request.headers.get('x-real-ip') || 
             'unknown';
  
  // For now, use IP as identifier (in production, extract user ID from auth)
  const identifier = ip;
  
  const result = await rateLimiter.checkLimit(identifier, action);
  
  if (!result.allowed) {
    return {
      allowed: false,
      response: new Response(
        JSON.stringify({
          error: 'Too many requests',
          message: `Rate limit exceeded. Please try again after ${new Date(result.resetTime).toISOString()}`,
        }),
        {
          status: 429,
          headers: {
            'Content-Type': 'application/json',
            'X-RateLimit-Limit': rateLimiter['limits'].get(action)?.maxRequests.toString() || '100',
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': new Date(result.resetTime).toISOString(),
            'Retry-After': Math.ceil((result.resetTime - Date.now()) / 1000).toString(),
          },
        }
      ),
    };
  }
  
  return {
    allowed: true,
    remaining: result.remaining,
    resetTime: result.resetTime,
  };
}