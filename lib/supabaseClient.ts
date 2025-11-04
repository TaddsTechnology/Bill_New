import { createClient } from '@supabase/supabase-js'

// Define types for our cash collection entries
export type CashCollectionEntry = {
  id?: number
  date: string
  account_no: string
  amount: number
  collector: string
  created_at?: string
}

// Define type for party information
export type Party = {
  id?: number
  account_no: string
  name: string
  created_at?: string
}

// Get Supabase URL and anon key from environment variables
// You'll need to set these in your .env.local file
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

// Validate environment variables
if (!supabaseUrl || supabaseUrl === 'your_actual_supabase_project_url_here') {
  console.warn('⚠️  NEXT_PUBLIC_SUPABASE_URL is not set or is still the placeholder value')
}

if (!supabaseAnonKey || supabaseAnonKey === 'your_actual_supabase_anon_key_here') {
  console.warn('⚠️  NEXT_PUBLIC_SUPABASE_ANON_KEY is not set or is still the placeholder value')
}

// Create and export the Supabase client
export const supabase = createClient(supabaseUrl, supabaseAnonKey)