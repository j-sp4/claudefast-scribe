import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    // Use service client for admin operations
    const supabase = await createServiceClient();
    
    // For now, skip authentication in development - in production you'd validate JWT tokens
    // TODO: Implement proper JWT token validation for admin API

    // Get query parameters
    const url = new URL(request.url);
    const repository = url.searchParams.get('repository');
    const status = url.searchParams.get('status');
    const limit = parseInt(url.searchParams.get('limit') || '50');
    const offset = parseInt(url.searchParams.get('offset') || '0');

    // Build query
    let query = supabase
      .from('pr_processing_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (repository) {
      query = query.eq('repository_name', repository);
    }

    if (status) {
      query = query.eq('status', status);
    }

    const { data: logs, error } = await query;

    if (error) {
      throw error;
    }

    // Get total count for pagination
    let countQuery = supabase
      .from('pr_processing_logs')
      .select('*', { count: 'exact', head: true });

    if (repository) {
      countQuery = countQuery.eq('repository_name', repository);
    }

    if (status) {
      countQuery = countQuery.eq('status', status);
    }

    const { count, error: countError } = await countQuery;

    if (countError) {
      throw countError;
    }

    return NextResponse.json({ 
      logs,
      pagination: {
        total: count || 0,
        limit,
        offset,
        hasMore: (count || 0) > offset + limit
      }
    });

  } catch (error) {
    console.error('Error fetching PR logs:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
