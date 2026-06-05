'use client'

import { useState, useEffect, useCallback } from 'react'
import { supabase, type CashCollectionEntry } from '../supabaseClient'
import { useToast } from './useToast'

export function useCollections() {
  const [entries, setEntries] = useState<CashCollectionEntry[]>([])
  const [loading, setLoading] = useState(true)
  const { addToast } = useToast()

  const load = useCallback(async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('cash_collections')
        .select('*')
        .order('date', { ascending: false })

      if (error) throw error
      setEntries(data || [])
    } catch {
      addToast('Failed to load collections', 'error')
    } finally {
      setLoading(false)
    }
  }, [addToast])

  useEffect(() => { load() }, [load])

  const addEntry = useCallback(async (entry: Omit<CashCollectionEntry, 'id' | 'created_at'>) => {
    const { data, error } = await supabase
      .from('cash_collections')
      .insert([entry])
      .select()
      .single()

    if (error) { addToast('Failed to add entry', 'error'); return null }
    await load()
    addToast('Entry added successfully', 'success')
    return data
  }, [load, addToast])

  const updateEntry = useCallback(async (id: number, updates: Partial<CashCollectionEntry>) => {
    const { data, error } = await supabase
      .from('cash_collections')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) { addToast('Failed to update entry', 'error'); return null }
    await load()
    addToast('Entry updated successfully', 'success')
    return data
  }, [load, addToast])

  const deleteEntry = useCallback(async (id: number) => {
    const { error } = await supabase
      .from('cash_collections')
      .delete()
      .eq('id', id)

    if (error) { addToast('Failed to delete entry', 'error'); return false }
    await load()
    addToast('Entry deleted successfully', 'success')
    return true
  }, [load, addToast])

  const getFiltered = useCallback(async (date?: string | null, accountNo?: string | null) => {
    let query = supabase.from('cash_collections').select('*').order('date', { ascending: false })
    if (date) query = query.eq('date', date)
    if (accountNo) query = query.eq('account_no', accountNo)
    const { data, error } = await query
    if (error) { addToast('Failed to filter', 'error'); return [] }
    setEntries(data || [])
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

  return { entries, loading, setEntries, addEntry, updateEntry, deleteEntry, getFiltered, getTotalForDate, reload: load }
}
