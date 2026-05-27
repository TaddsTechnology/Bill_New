'use client'

import { useState, useEffect, useCallback } from 'react'
import { supabase, type Party, type CashCollectionEntry } from '../supabaseClient'
import { useToast } from './useToast'

export function useParties() {
  const [parties, setParties] = useState<Party[]>([])
  const [loading, setLoading] = useState(true)
  const { addToast } = useToast()

  const load = useCallback(async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('parties')
        .select('*')
        .order('name', { ascending: true })

      if (error) throw error
      setParties(data || [])
    } catch {
      addToast('Failed to load parties', 'error')
    } finally {
      setLoading(false)
    }
  }, [addToast])

  useEffect(() => { load() }, [load])

  const addParty = useCallback(async (party: Omit<Party, 'id' | 'created_at'>) => {
    const { data, error } = await supabase
      .from('parties')
      .insert([party])
      .select()
      .single()

    if (error) {
      addToast(error.code === '23505' ? 'Account number already exists' : 'Failed to add party', 'error')
      return null
    }
    await load()
    addToast('Party added successfully', 'success')
    return data
  }, [load, addToast])

  const updateParty = useCallback(async (id: number, updates: Partial<Party>) => {
    const { data, error } = await supabase
      .from('parties')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) { addToast('Failed to update party', 'error'); return null }
    await load()
    addToast('Party updated successfully', 'success')
    return data
  }, [load, addToast])

  const deleteParty = useCallback(async (id: number) => {
    const { error } = await supabase
      .from('parties')
      .delete()
      .eq('id', id)

    if (error) { addToast('Failed to delete party', 'error'); return false }
    await load()
    addToast('Party deleted successfully', 'success')
    return true
  }, [load, addToast])

  const getPartyByAccountNo = useCallback(async (accountNo: string) => {
    const { data, error } = await supabase
      .from('parties')
      .select('*')
      .eq('account_no', accountNo)
      .single()
    if (error) return null
    return data
  }, [])

  const getPartyCollectionsTotal = useCallback((entries: CashCollectionEntry[], accountNo: string) => {
    return entries.filter(e => e.account_no === accountNo).reduce((sum, e) => sum + e.amount, 0)
  }, [])

  return { parties, loading, addParty, updateParty, deleteParty, getPartyByAccountNo, getPartyCollectionsTotal, reload: load }
}
