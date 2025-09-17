'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { User } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/client';

interface UserWithRole extends User {
  role?: 'user' | 'reviewer' | 'admin';
  name?: string;
  githubUsername?: string;
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
  const supabase = createClient();

  useEffect(() => {
    // Get initial session
    const getSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session?.user) {
        // Fetch user role from our database
        const { data: userData } = await supabase
          .from('users')
          .select('role, name, githubUsername')
          .eq('id', session.user.id)
          .single();
        
        setUser({
          ...session.user,
          role: userData?.role || 'user',
          name: userData?.name,
          githubUsername: userData?.githubUsername,
        });
      }
      
      setLoading(false);
    };

    getSession();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        // Fetch user role from our database
        const { data: userData } = await supabase
          .from('users')
          .select('role, name, githubUsername')
          .eq('id', session.user.id)
          .single();
        
        setUser({
          ...session.user,
          role: userData?.role || 'user',
          name: userData?.name,
          githubUsername: userData?.githubUsername,
        });
      } else {
        setUser(null);
      }
      
      setLoading(false);
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