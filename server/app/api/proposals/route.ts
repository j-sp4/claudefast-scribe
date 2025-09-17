import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { db, proposals, documents, users } from '@/lib/db';
import { eq, and, desc } from 'drizzle-orm';
import { z } from 'zod';
import { checkRateLimit } from '@/lib/rate-limiter';
import { runQualityChecks, calculateQualityScore, countWords, extractLinks } from '@/lib/quality-checks';

const CreateProposalSchema = z.object({
  targetDocId: z.string().uuid(),
  changeKind: z.enum(['replace', 'append', 'prepend']),
  title: z.string().min(5).max(200),
  contentMd: z.string().min(10),
  rationale: z.string().min(10),
  baseDocVersion: z.number().optional(),
});

// POST /api/proposals - Create a new proposal
export async function POST(request: NextRequest) {
  try {
    // Check rate limit first
    const rateLimitResult = await checkRateLimit(request, 'proposal');
    if (!rateLimitResult.allowed) {
      return rateLimitResult.response!;
    }

    const supabase = await createClient();
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Parse and validate request body
    const body = await request.json();
    const validatedData = CreateProposalSchema.parse(body);

    // Run quality checks on the content
    const qualityResult = await runQualityChecks(validatedData.contentMd);
    if (!qualityResult.passed) {
      return NextResponse.json(
        { 
          error: 'Quality check failed',
          issues: qualityResult.issues,
          score: qualityResult.score
        },
        { status: 400 }
      );
    }

    // Check if target document exists
    const targetDoc = await db
      .select()
      .from(documents)
      .where(eq(documents.id, validatedData.targetDocId))
      .limit(1);

    if (targetDoc.length === 0) {
      return NextResponse.json(
        { error: 'Target document not found' },
        { status: 404 }
      );
    }

    // Check for version conflicts
    if (validatedData.baseDocVersion && targetDoc[0].version !== validatedData.baseDocVersion) {
      return NextResponse.json(
        { 
          error: 'Document has been updated',
          currentVersion: targetDoc[0].version,
          yourVersion: validatedData.baseDocVersion 
        },
        { status: 409 }
      );
    }

    // Create the proposal
    const [proposal] = await db.insert(proposals).values({
      targetDocId: validatedData.targetDocId,
      authorId: user.id,
      changeKind: validatedData.changeKind,
      title: validatedData.title,
      contentMd: validatedData.contentMd,
      rationale: validatedData.rationale,
      baseDocVersion: targetDoc[0].version,
      status: 'pending',
    }).returning();

    return NextResponse.json(proposal, { status: 201 });
  } catch (error) {
    console.error('Error creating proposal:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// GET /api/proposals - Get proposals with filters
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);
    
    const status = searchParams.get('status') || 'pending';
    const limit = parseInt(searchParams.get('limit') || '10');
    const authorId = searchParams.get('authorId');
    const targetDocId = searchParams.get('targetDocId');

    // Build query conditions
    const conditions = [];
    if (status !== 'all') {
      conditions.push(eq(proposals.status, status as any));
    }
    if (authorId) {
      conditions.push(eq(proposals.authorId, authorId));
    }
    if (targetDocId) {
      conditions.push(eq(proposals.targetDocId, targetDocId));
    }

    // Fetch proposals with author info
    const results = await db
      .select({
        proposal: proposals,
        author: {
          id: users.id,
          name: users.name,
          email: users.email,
          githubUsername: users.githubUsername,
        },
        targetDoc: {
          id: documents.id,
          title: documents.title,
          version: documents.version,
        },
      })
      .from(proposals)
      .leftJoin(users, eq(proposals.authorId, users.id))
      .leftJoin(documents, eq(proposals.targetDocId, documents.id))
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(proposals.createdAt))
      .limit(limit);

    return NextResponse.json(results);
  } catch (error) {
    console.error('Error fetching proposals:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}