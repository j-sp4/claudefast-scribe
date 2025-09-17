import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { db, users } from '@/lib/db';
import { eq } from 'drizzle-orm';

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const origin = requestUrl.origin;

  if (code) {
    const supabase = await createClient();
    const { data: { session }, error } = await supabase.auth.exchangeCodeForSession(code);
    
    if (!error && session) {
      // Sync user with our database
      const { user } = session;
      
      if (user) {
        try {
          // Check if user exists in our database
          const existingUser = await db
            .select()
            .from(users)
            .where(eq(users.id, user.id))
            .limit(1);

          if (existingUser.length === 0) {
            // Create user record if doesn't exist
            await db.insert(users).values({
              id: user.id,
              email: user.email!,
              name: user.user_metadata?.name || user.user_metadata?.full_name || 'User',
              githubUsername: user.user_metadata?.user_name || user.user_metadata?.preferred_username,
              role: 'user',
            });
          } else {
            // Update last login
            await db
              .update(users)
              .set({
                updatedAt: new Date(),
                githubUsername: user.user_metadata?.user_name || user.user_metadata?.preferred_username || existingUser[0].githubUsername,
              })
              .where(eq(users.id, user.id));
          }
        } catch (dbError) {
          console.error('Error syncing user with database:', dbError);
        }
      }
    }
  }

  // URL to redirect to after sign in process completes
  return NextResponse.redirect(`${origin}/`);
}