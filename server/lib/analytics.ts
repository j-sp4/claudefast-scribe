import { db, usageEvents } from '@/lib/db';

export interface UsageEvent {
  userId?: string;
  sessionId?: string;
  toolName: string;
  projectId?: string;
  outcome: 'success' | 'error' | 'rate_limited';
  metadata?: Record<string, any>;
  responseTimeMs?: number;
  ipAddress?: string;
  userAgent?: string;
}

/**
 * Track usage events for analytics and monitoring
 */
export async function trackUsage(event: UsageEvent): Promise<void> {
  try {
    await db.insert(usageEvents).values({
      userId: event.userId || null,
      sessionId: event.sessionId || generateSessionId(),
      toolName: event.toolName,
      projectId: event.projectId || null,
      outcome: event.outcome,
      metadata: event.metadata || {},
      responseTimeMs: event.responseTimeMs,
      ipAddress: event.ipAddress,
      userAgent: event.userAgent,
    });
  } catch (error) {
    // Don't let analytics errors break the application
    console.error('Failed to track usage event:', error);
  }
}

/**
 * Track MCP tool usage
 */
export async function trackMcpToolUsage(
  toolName: string,
  userId?: string,
  success: boolean = true,
  metadata?: Record<string, any>
): Promise<void> {
  await trackUsage({
    userId,
    toolName: `mcp_${toolName}`,
    outcome: success ? 'success' : 'error',
    metadata,
  });
}

/**
 * Track API endpoint usage
 */
export async function trackApiUsage(
  endpoint: string,
  method: string,
  userId?: string,
  statusCode: number = 200,
  responseTimeMs?: number
): Promise<void> {
  await trackUsage({
    userId,
    toolName: `api_${method}_${endpoint}`,
    outcome: statusCode < 400 ? 'success' : 'error',
    metadata: { statusCode, method },
    responseTimeMs,
  });
}

/**
 * Get usage statistics for a time period
 */
export async function getUsageStats(
  startDate: Date,
  endDate: Date,
  userId?: string
) {
  const conditions = [
    `created_at >= '${startDate.toISOString()}'`,
    `created_at <= '${endDate.toISOString()}'`,
  ];
  
  if (userId) {
    conditions.push(`user_id = '${userId}'`);
  }

  const query = `
    SELECT 
      tool_name,
      outcome,
      COUNT(*) as count,
      AVG(response_time_ms) as avg_response_time,
      MIN(response_time_ms) as min_response_time,
      MAX(response_time_ms) as max_response_time,
      DATE_TRUNC('hour', created_at) as hour
    FROM usage_events
    WHERE ${conditions.join(' AND ')}
    GROUP BY tool_name, outcome, hour
    ORDER BY hour DESC
  `;

  try {
    const results = await db.execute(query as any);
    return results;
  } catch (error) {
    console.error('Failed to get usage stats:', error);
    return [];
  }
}

/**
 * Track search queries for improving search
 */
export async function trackSearchQuery(
  query: string,
  resultCount: number,
  searchType: 'fts' | 'semantic' | 'hybrid',
  userId?: string
): Promise<void> {
  await trackUsage({
    userId,
    toolName: `search_${searchType}`,
    outcome: resultCount > 0 ? 'success' : 'error',
    metadata: {
      query: query.substring(0, 200), // Truncate long queries
      resultCount,
      hasResults: resultCount > 0,
    },
  });
}

/**
 * Track proposal lifecycle events
 */
export async function trackProposalEvent(
  proposalId: string,
  event: 'created' | 'approved' | 'rejected' | 'withdrawn',
  userId: string,
  metadata?: Record<string, any>
): Promise<void> {
  await trackUsage({
    userId,
    toolName: `proposal_${event}`,
    outcome: 'success',
    metadata: {
      proposalId,
      ...metadata,
    },
  });
}

/**
 * Generate a simple session ID
 */
function generateSessionId(): string {
  return `session_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Middleware to track API usage
 */
export function createUsageTracker() {
  return async (req: Request, res: Response, next: () => void) => {
    const start = Date.now();
    const url = new URL(req.url);
    const path = url.pathname;
    const method = req.method;

    // Track after response
    res.addEventListener('finish', async () => {
      const responseTime = Date.now() - start;
      const statusCode = (res as any).status || 200;
      
      await trackApiUsage(
        path,
        method,
        undefined, // Get user ID from session if available
        statusCode,
        responseTime
      );
    });

    next();
  };
}

/**
 * Get popular tools and endpoints
 */
export async function getPopularTools(limit: number = 10) {
  const query = `
    SELECT 
      tool_name,
      COUNT(*) as usage_count,
      COUNT(DISTINCT user_id) as unique_users,
      AVG(CASE WHEN outcome = 'success' THEN 1 ELSE 0 END) * 100 as success_rate
    FROM usage_events
    WHERE created_at >= NOW() - INTERVAL '7 days'
    GROUP BY tool_name
    ORDER BY usage_count DESC
    LIMIT ${limit}
  `;

  try {
    const results = await db.execute(query as any);
    return results;
  } catch (error) {
    console.error('Failed to get popular tools:', error);
    return [];
  }
}

/**
 * Dashboard metrics for monitoring
 */
export async function getDashboardMetrics() {
  const now = new Date();
  const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  const [
    dailyStats,
    weeklyStats,
    popularTools,
    errorRate,
  ] = await Promise.all([
    getUsageStats(oneDayAgo, now),
    getUsageStats(oneWeekAgo, now),
    getPopularTools(5),
    getErrorRate(oneDayAgo, now),
  ]);

  return {
    daily: dailyStats,
    weekly: weeklyStats,
    popularTools,
    errorRate,
    timestamp: now.toISOString(),
  };
}

async function getErrorRate(startDate: Date, endDate: Date) {
  const query = `
    SELECT 
      COUNT(CASE WHEN outcome = 'error' THEN 1 END)::float / 
      COUNT(*)::float * 100 as error_rate
    FROM usage_events
    WHERE created_at >= '${startDate.toISOString()}'
    AND created_at <= '${endDate.toISOString()}'
  `;

  try {
    const results = await db.execute(query as any);
    return (results as any)[0]?.error_rate || 0;
  } catch (error) {
    console.error('Failed to get error rate:', error);
    return 0;
  }
}