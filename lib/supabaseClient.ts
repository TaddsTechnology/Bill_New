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
  amount: number
  description: string
  category: string
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
    const query = new Proxy({} as any, { get: () => () => query })
    client = { from: () => query, rpc: () => query, channel: () => ({ on: () => ({ subscribe: () => {} }) }), removeChannel: () => {} } as unknown as SupabaseClient
    return client
  }

  client = createClient(supabaseUrl, supabaseAnonKey)
  return client
}

export const supabase = getSupabase()
