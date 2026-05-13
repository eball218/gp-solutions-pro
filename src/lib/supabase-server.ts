import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'

/**
 * Server-side Supabase client for Route Handlers and Server Components.
 * Uses the request's auth cookie to act as the logged-in user
 * (so Row Level Security policies are enforced).
 *
 * Do NOT use the service-role key here. Service-role bypasses RLS and
 * must only be used in trusted, audited code paths (e.g. cron jobs).
 */
export async function createSupabaseServerClient() {
  const cookieStore = await cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value
        },
        set(name: string, value: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value, ...options })
          } catch {
            // Server Component context — set() not allowed; safe to ignore.
          }
        },
        remove(name: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value: '', ...options })
          } catch {
            // Same as above.
          }
        },
      },
    }
  )
}

/**
 * Require an authenticated user in a Route Handler.
 * Returns either { user } or { error: NextResponse } that the handler must return.
 */
export async function requireAuth() {
  const supabase = await createSupabaseServerClient()
  const { data, error } = await supabase.auth.getUser()
  if (error || !data?.user) {
    return { user: null as null, supabase: null as null, error: 'unauthorized' as const }
  }
  return { user: data.user, supabase, error: null }
}
