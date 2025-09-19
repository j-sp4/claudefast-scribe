'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { User } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/client';

interface UserWithRole extends User {
  role?: 'user' | 'reviewer' | 'admin';
  name?: string;
  github_username?: string;
}

interface AuthContextType {
  user: UserWithRole | null;
  loading: boolean;
  signOut: () => Promise<void>;
  isReviewer: boolean;
  isAdmin: boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  signOut: async () => {},
  isReviewer: false,
  isAdmin: false,
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserWithRole | null>(null);
  const [loading, setLoading] = useState(true);
  const [isInitialized, setIsInitialized] = useState(false);
  const supabase = createClient();

  // Debug: Log environment variables and client info (only once)
  useEffect(() => {
    console.log('AuthContext: Environment check:', {
      supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
      supabaseKeyPrefix: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.substring(0, 20) + '...',
      clientCreated: !!supabase,
      clientAuth: !!supabase?.auth,
      clientFrom: !!supabase?.from,
    });
  }, []);

  // Remove emergency timeout since auth flow is working

  useEffect(() => {
    // Get initial session
    const getSession = async () => {
      console.log('AuthContext: Getting initial session...');
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        console.log('AuthContext: Session result:', { session: !!session, error });
        
        if (session?.user) {
          console.log('AuthContext: Initial session - User found, fetching role from database...');
          
          // Use the same timeout logic as the auth state change handler
          let userData = null;
          let userError = null;
          
          try {
            const queryPromise = supabase
              .from('users')
              .select('role, name, github_username')
              .eq('id', session.user.id)
              .single();
            
            const timeoutPromise = new Promise((_, reject) => 
              setTimeout(() => reject(new Error('Database query timeout')), 3000) // Shorter timeout for initial load
            );
            
            const result = await Promise.race([queryPromise, timeoutPromise]);
            userData = result.data;
            userError = result.error;
            
            console.log('AuthContext: Initial session - User data result:', { userData, userError });
          } catch (timeoutError) {
            console.log('AuthContext: Initial session - Database query timeout, using fallback');
            userError = { message: 'Database query timeout', code: 'TIMEOUT' };
          }
          
          // Always set user, even if database query failed
          const userToSet = {
            ...session.user,
            role: userData?.role || 'user',
            name: userData?.name || session.user.user_metadata?.name || session.user.email?.split('@')[0] || 'User',
            githubUsername: userData?.github_username || session.user.user_metadata?.user_name,
          };
          
          setUser(userToSet);
        } else {
          console.log('AuthContext: No session found');
        }
        
        console.log('AuthContext: Initial session complete - Setting loading to false');
        setLoading(false);
        setIsInitialized(true);
      } catch (err) {
        console.error('AuthContext: Error in getSession:', err);
        setLoading(false);
      }
    };

    getSession();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('AuthContext: Auth state change:', { event, session: !!session });
      
      // Skip INITIAL_SESSION if we already initialized
      if (event === 'INITIAL_SESSION' && isInitialized) {
        console.log('AuthContext: Skipping INITIAL_SESSION - already initialized');
        return;
      }
      
      try {
        if (session?.user) {
          console.log('AuthContext: Auth state change - fetching user role...');
          console.log('AuthContext: User ID from session:', session.user.id);
          // Fetch user role from our database
          let userData = null;
          let userError = null;
          let retries = 0;
          const maxRetries = 3;
          
          // Retry logic in case user was just created and not yet available
          while (retries < maxRetries) {
            try {
              // Add timeout to the database query
              const queryPromise = supabase
                .from('users')
                .select('role, name, github_username')
                .eq('id', session.user.id)
                .single();
              
              const timeoutPromise = new Promise((_, reject) => 
                setTimeout(() => reject(new Error('Database query timeout')), 5000)
              );
              
              const result = await Promise.race([queryPromise, timeoutPromise]);
              userData = result.data;
              userError = result.error;
              
              if (!userError || userError.code !== 'PGRST116') { // PGRST116 = no rows returned
                break;
              }
            } catch (timeoutError) {
              userError = { message: 'Database query timeout', code: 'TIMEOUT' };
              
              // If it's the last attempt, break out of the loop
              if (retries >= maxRetries - 1) {
                break;
              }
            }
            
            retries++;
            if (retries < maxRetries) {
              await new Promise(resolve => setTimeout(resolve, 500)); // Wait 500ms before retry
            }
          }
          
          // Always set user, even if database query failed
          const userToSet = {
            ...session.user,
            role: userData?.role || 'user',
            name: userData?.name || session.user.user_metadata?.name || session.user.email?.split('@')[0] || 'User',
            githubUsername: userData?.github_username || session.user.user_metadata?.user_name,
          };
          
          setUser(userToSet);
        } else {
          console.log('AuthContext: Auth state change - no session, setting user to null');
          setUser(null);
        }
        
        setLoading(false);
      } catch (err) {
        console.error('AuthContext: Error in auth state change:', err);
        setLoading(false);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [supabase]);

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
  };

  const value = {
    user,
    loading,
    signOut,
    isReviewer: user?.role === 'reviewer' || user?.role === 'admin',
    isAdmin: user?.role === 'admin',
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};