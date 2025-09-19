import { NextRequest, NextResponse } from 'next/server';
import { verifyGitHubWebhook } from '@/lib/github/webhook-verifier';
import { processPullRequestEvent } from '@/lib/github/pr-processor';
import { createServiceClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const signature = request.headers.get('x-hub-signature-256');
    const event = request.headers.get('x-github-event');
    const delivery = request.headers.get('x-github-delivery');

    // Verify webhook signature
    if (!verifyGitHubWebhook(body, signature)) {
      console.log('GitHub webhook: Invalid signature');
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }

    console.log(`GitHub webhook: Received ${event} event (delivery: ${delivery})`);

    // Parse the payload
    const payload = JSON.parse(body);

    // Log the webhook event to database for debugging
    try {
      const supabase = await createServiceClient();
      await supabase.from('webhook_events').insert({
        event_type: event || 'unknown',
        repository_name: payload.repository?.full_name || 'unknown',
        payload: payload,
        processed: false,
      });
    } catch (logError) {
      console.error('Failed to log webhook event:', logError);
      // Continue processing even if logging fails
    }

    // Handle pull request events
    if (event === 'pull_request') {
      const action = payload.action;
      
      // Only process relevant PR actions
      if (['opened', 'synchronize', 'reopened'].includes(action)) {
        console.log(`Processing PR ${action} event for PR #${payload.pull_request.number}`);
        
        // Add to processing queue (async)
        processPullRequestEvent(payload).catch(error => {
          console.error('Error processing PR event:', error);
        });
        
        return NextResponse.json({ 
          message: `PR ${action} event queued for processing`,
          pr_number: payload.pull_request.number,
          repository: payload.repository.full_name
        });
      } else {
        console.log(`Ignoring PR ${action} event`);
        return NextResponse.json({ message: `PR ${action} event ignored` });
      }
    }

    // Handle other events if needed
    console.log(`Unhandled event type: ${event}`);
    return NextResponse.json({ message: `Event ${event} not handled` });

  } catch (error) {
    console.error('GitHub webhook error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({ 
    message: 'GitHub webhook endpoint is active',
    timestamp: new Date().toISOString()
  });
}
