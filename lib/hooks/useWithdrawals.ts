'use client'

import { useCallback } from 'react'
import { supabase, type Withdrawal } from '../supabaseClient'
import { useToast } from './useToast'

export function useWithdrawals() {
  const { addToast } = useToast()

  const addWithdrawal = useCallback(async (withdrawal: Omit<Withdrawal, 'id' | 'created_at'>) => {
    const { data, error } = await supabase
      .from('withdrawals')
      .insert([withdrawal])
      .select()
      .single()

    if (error) { addToast('Failed to add withdrawal', 'error'); return null }
    addToast('Withdrawal added successfully', 'success')
    return data
  }, [addToast])

  const updateWithdrawal = useCallback(async (id: number, updates: Partial<Withdrawal>) => {
    const { data, error } = await supabase
      .from('withdrawals')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) { addToast('Failed to update withdrawal', 'error'); return null }
    addToast('Withdrawal updated successfully', 'success')
    return data
  }, [addToast])

  const deleteWithdrawal = useCallback(async (id: number) => {
    const { error } = await supabase
      .from('withdrawals')
      .delete()
      .eq('id', id)

    if (error) { addToast('Failed to delete withdrawal', 'error'); return false }
    addToast('Withdrawal deleted successfully', 'success')
    return true
  }, [addToast])

  const getFiltered = useCallback(async (date?: string | null, accountNo?: string | null) => {
    let query = supabase.from('withdrawals').select('*').order('date', { ascending: false }).order('id', { ascending: false })
    if (date) query = query.eq('date', date)
    if (accountNo) query = query.eq('account_no', accountNo)
    const { data, error } = await query
    if (error) { addToast('Failed to filter', 'error'); return [] }
    return data || []
  }, [addToast])

  const getTotalForDate = useCallback(async (date: string) => {
    const { data, error } = await supabase
      .from('withdrawals')
      .select('amount')
      .eq('date', date)
    if (error) return 0
    return (data || []).reduce((sum, e) => sum + e.amount, 0)
  }, [])

  return { addWithdrawal, updateWithdrawal, deleteWithdrawal, getFiltered, getTotalForDate }
}
