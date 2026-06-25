'use client'

import { useCallback } from 'react'
import { supabase, type CashCollectionEntry } from '../supabaseClient'
import { useToast } from './useToast'

export function useCollections() {
  const { addToast } = useToast()

  const addEntry = useCallback(async (entry: Omit<CashCollectionEntry, 'id' | 'created_at'>) => {
    const { data, error } = await supabase
      .from('cash_collections')
      .insert([entry])
      .select()
      .single()

    if (error) { addToast('Failed to add entry', 'error'); return null }
    addToast('Entry added successfully', 'success')
    return data
  }, [addToast])

  const updateEntry = useCallback(async (id: number, updates: Partial<CashCollectionEntry>) => {
    const { data, error } = await supabase
      .from('cash_collections')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) { addToast('Failed to update entry', 'error'); return null }
    addToast('Entry updated successfully', 'success')
    return data
  }, [addToast])

  const deleteEntry = useCallback(async (id: number) => {
    const { error } = await supabase
      .from('cash_collections')
      .delete()
      .eq('id', id)

    if (error) { addToast('Failed to delete entry', 'error'); return false }
    addToast('Entry deleted successfully', 'success')
    return true
  }, [addToast])

  const getFiltered = useCallback(async (date?: string | null, accountNo?: string | null) => {
    let query = supabase.from('cash_collections').select('*').order('date', { ascending: false }).order('id', { ascending: false })
    if (date) query = query.eq('date', date)
    if (accountNo) query = query.eq('account_no', accountNo)
    const { data, error } = await query
    if (error) { addToast('Failed to filter', 'error'); return [] }
    return data || []
  }, [addToast])

  const getTotalForDate = useCallback(async (date: string) => {
    const { data, error } = await supabase
      .from('cash_collections')
      .select('amount')
      .eq('date', date)
    if (error) return 0
    return (data || []).reduce((sum, e) => sum + e.amount, 0)
  }, [])

  return { addEntry, updateEntry, deleteEntry, getFiltered, getTotalForDate }
}
