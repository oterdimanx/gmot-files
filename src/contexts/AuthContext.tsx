import React, { createContext, useContext, useEffect, useState } from 'react'
import { User } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { fileService } from '@/lib/supabase/fileService'

interface AuthContextType {
  user: User | null
  isLoading: boolean
  signIn: (email: string, password: string) => Promise<void>
  signUp: (email: string, password: string, username?: string) => Promise<void>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  
  const supabase = createClient()

  useEffect(() => {
    // Initial user check
    const initializeAuth = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        setUser(user)
      } catch (error) {
        console.error('Error checking user:', error)
        setUser(null)
      } finally {
        setIsLoading(false)
      }
    }

    initializeAuth()
    
    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        console.log('Auth state changed:', event)
        setUser(session?.user ?? null)
        setIsLoading(false)
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  const signIn = async (email: string, password: string): Promise<void> => {
    setIsLoading(true)
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password
      })
      
      if (error) throw error
      
      toast.success('Signed in successfully')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Sign in failed')
      throw error
    } finally {
      setIsLoading(false)
    }
  }

const signUp = async (email: string, password: string, username?: string): Promise<void> => {
  setIsLoading(true);
  try {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { username }
      }
    });

    if (error) throw error;
    
    // CRITICAL PART: Create user profile after successful auth
    if (data.user) {
      try {
        // Use fileService to create profile in gmot.users
        await fileService.ensureUserProfile(data.user.id, data.user.email);
        console.log('✅ User profile created in gmot.users');
      } catch (profileError) {
        console.warn('⚠️ Profile creation had an issue (non-critical):', profileError);
        // Don't throw - auth succeeded even if profile has minor issues
      }
    }
    
    toast.success('Account created! Please check your email to confirm.');
  } catch (error) {
    toast.error(error instanceof Error ? error.message : 'Sign up failed');
    throw error;
  } finally {
    setIsLoading(false);
  }
};

const signOut = async (): Promise<void> => {
    setIsLoading(true)
    try {
      const { error } = await supabase.auth.signOut()
      if (error) throw error
      
      toast.success('Signed out successfully')
      setUser(null)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Sign out failed')
      throw error
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <AuthContext.Provider value={{ user, isLoading, signIn, signUp, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}