import { createClient } from './supabase/client'

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

export const supabase = createClient()
