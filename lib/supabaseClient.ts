import { createClient, type SupabaseClient } from '@supabase/supabase-js'

export type CashCollectionEntry = {
  id?: number
  date: string
  account_no: string
  amount: number
  collector: string
  created_at?: string
}

export type Withdrawal = {
  id?: number
  date: string
  account_no: string
  amount: number
  created_at?: string
}

export type Party = {
  id?: number
  account_no: string
  name: string
  created_at?: string
}

let client: SupabaseClient | null = null

export function getSupabase(): SupabaseClient {
  if (client) return client

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || ''

  if (!supabaseUrl || !supabaseAnonKey || supabaseUrl === 'your_actual_supabase_project_url_here' || supabaseAnonKey === 'your_actual_supabase_anon_key_here') {
    console.warn('Supabase env vars missing — using mock client (data will be empty)')
    const query: Record<string, unknown> = {}
    const handler: ProxyHandler<typeof query> = { get: () => () => new Proxy(query, handler) }
    const mockQuery = new Proxy(query, handler)
    client = {
      from: () => mockQuery,
      rpc: () => mockQuery,
      channel: () => ({ on: () => ({ subscribe: () => undefined }) }),
      removeChannel: () => undefined,
    } as unknown as SupabaseClient
    return client
  }

  client = createClient(supabaseUrl, supabaseAnonKey)
  return client
}

export const supabase = getSupabase()
