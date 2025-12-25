import { createBrowserClient } from '@supabase/ssr'

// 1. Basic client WITHOUT schema settings (for auth)
export const createClient = () => {
  return createBrowserClient(
    import.meta.env.VITE_SUPABASE_URL!,
    import.meta.env.VITE_SUPABASE_ANON_KEY!
    // NO schema settings here - auth doesn't need them
  )
}

// 2. Client WITH schema settings (for file operations)
export const createClientWithSchema = () => {
  return createBrowserClient(
    import.meta.env.VITE_SUPABASE_URL!,
    import.meta.env.VITE_SUPABASE_ANON_KEY!,
    {
      db: {
        schema: 'gmot'
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