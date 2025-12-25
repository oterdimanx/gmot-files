import { createBrowserClient } from '@supabase/ssr'

// 1. Client WITHOUT schema for auth operations (login, signup, session)
export const createClient = () => {
  return createBrowserClient(
    import.meta.env.VITE_SUPABASE_URL!,
    import.meta.env.VITE_SUPABASE_ANON_KEY!
  )
}

// 2. Client WITH schema for database operations (files, folders, users)
export const createClientWithSchema = () => {
  return createBrowserClient(
    import.meta.env.VITE_SUPABASE_URL!,
    import.meta.env.VITE_SUPABASE_ANON_KEY!,
    {
      db: {
        schema: 'gmot'  // This tells Supabase to use gmot schema
      }
    }
  )
}

// Helper functions (optional)
export const getCurrentUser = async () => {
  const supabase = createClient()  // Use basic client for auth
  const { data: { user } } = await supabase.auth.getUser()
  return user
}

export const isAuthenticated = async () => {
  const user = await getCurrentUser()
  return !!user
}