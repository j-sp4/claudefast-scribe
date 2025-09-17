import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { db, proposals, documents, revisions, users } from '@/lib/db';
import { eq, and } from 'drizzle-orm';
import { z } from 'zod';

const ReviewSchema = z.object({
  action: z.enum(['approve', 'reject']),
  reviewNotes: z.string().optional(),
});

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient();
    
    // Check authentication and get user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Check if user is a reviewer or admin
    const [reviewer] = await db
      .select()
      .from(users)
      .where(eq(users.id, user.id))
      .limit(1);

    if (!reviewer || (reviewer.role !== 'reviewer' && reviewer.role !== 'admin')) {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      );
    }

    // Parse request body
    const body = await request.json();
    const { action, reviewNotes } = ReviewSchema.parse(body);

    // Get the proposal
    const [proposal] = await db
      .select()
      .from(proposals)
      .where(eq(proposals.id, params.id))
      .limit(1);

    if (!proposal) {
      return NextResponse.json(
        { error: 'Proposal not found' },
        { status: 404 }
      );
    }

    if (proposal.status !== 'pending') {
      return NextResponse.json(
        { error: 'Proposal has already been reviewed' },
        { status: 400 }
      );
    }

    // Handle approval
    if (action === 'approve') {
      // Get target document
      const [targetDoc] = await db
        .select()
        .from(documents)
        .where(eq(documents.id, proposal.targetDocId))
        .limit(1);

      if (!targetDoc) {
        return NextResponse.json(
          { error: 'Target document not found' },
          { status: 404 }
        );
      }

      // Start a transaction to approve and create new version
      await db.transaction(async (tx) => {
        // Update proposal status
        await tx
          .update(proposals)
          .set({
            status: 'approved',
            reviewerId: user.id,
            reviewNotes,
            reviewedAt: new Date(),
          })
          .where(eq(proposals.id, params.id));

        // Apply the change to create new content
        let newContent = targetDoc.contentMd;
        switch (proposal.changeKind) {
          case 'replace':
            newContent = proposal.contentMd;
            break;
          case 'append':
            newContent = targetDoc.contentMd + '\n\n' + proposal.contentMd;
            break;
          case 'prepend':
            newContent = proposal.contentMd + '\n\n' + targetDoc.contentMd;
            break;
        }

        // Create new document version
        const newVersion = targetDoc.version + 1;
        const [newDoc] = await tx.insert(documents).values({
          topicId: targetDoc.topicId,
          version: newVersion,
          title: targetDoc.title,
          contentMd: newContent,
          summary: targetDoc.summary, // Will need to regenerate
          isLatest: true,
          helpfulCount: targetDoc.helpfulCount,
        }).returning();

        // Mark old version as not latest
        await tx
          .update(documents)
          .set({ isLatest: false })
          .where(and(
            eq(documents.topicId, targetDoc.topicId),
            eq(documents.id, targetDoc.id)
          ));

        // Create revision record
        await tx.insert(revisions).values({
          documentId: newDoc.id,
          version: newVersion,
          contentMd: newContent,
          authorId: proposal.authorId,
          changeType: proposal.changeKind,
          changeDescription: proposal.title,
        });

        // Update author reputation
        await tx
          .update(users)
          .set({
            reputation: reviewer.reputation + 10,
          })
          .where(eq(users.id, proposal.authorId));
      });

      return NextResponse.json({
        success: true,
        action: 'approved',
        proposalId: params.id,
      });
    } 
    // Handle rejection
    else {
      await db
        .update(proposals)
        .set({
          status: 'rejected',
          reviewerId: user.id,
          reviewNotes: reviewNotes || 'No reason provided',
          reviewedAt: new Date(),
        })
        .where(eq(proposals.id, params.id));

      return NextResponse.json({
        success: true,
        action: 'rejected',
        proposalId: params.id,
      });
    }
  } catch (error) {
    console.error('Error reviewing proposal:', error);
    
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