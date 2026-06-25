'use client'

import { useState, useEffect, useMemo, useRef, useCallback } from 'react'
import DashboardLayout from '../dashboard-layout'
import { useWithdrawals } from '../../lib/hooks/useWithdrawals'
import { useParties } from '../../lib/hooks/useParties'
import { useServerInfiniteScroll } from '../../lib/hooks/useInfiniteScroll'
import { supabase } from '../../lib/supabaseClient'
import { Card } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { StatsCard } from '../../components/ui/StatsCard'
import { Spinner } from '../../components/ui/Spinner'
import { EmptyState } from '../../components/ui/EmptyState'
import { Modal } from '../../components/ui/Modal'
import { TableSkeleton } from '../../components/ui/TableSkeleton'
import { ConfirmModal } from '../../components/ui/ConfirmModal'
import { useToast } from '../../lib/hooks/useToast'

export default function WithdrawalsPage() {
  const { addWithdrawal, updateWithdrawal, deleteWithdrawal, getTotalForDate } = useWithdrawals()
  const { parties } = useParties()

  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0])
  const [amount, setAmount] = useState('')
  const [accountNo, setAccountNo] = useState('')
  const [accountSearch, setAccountSearch] = useState('')
  const [showDropdown, setShowDropdown] = useState(false)
  const [filterDate, setFilterDate] = useState('')
  const [filterAccount, setFilterAccount] = useState('')
  const { addToast } = useToast()
  const [editW, setEditW] = useState<{ id: number; date: string; amount: string; accountNo: string } | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<number | null>(null)
  const [totalToday, setTotalToday] = useState(0)
  const searchRef = useRef<HTMLInputElement>(null)
  const amountRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (date) getTotalForDate(date).then(setTotalToday)
  }, [date, getTotalForDate])

  const filteredParties = useMemo(() => {
    if (!accountSearch) return []
    const s = accountSearch.toLowerCase()
    return parties.filter(p =>
      p.name.toLowerCase().includes(s) || p.account_no.includes(accountSearch)
    )
  }, [parties, accountSearch])

  const handleAccountSelect = (party: typeof parties[0]) => {
    setAccountNo(party.account_no)
    setAccountSearch(`${party.name} (${party.account_no})`)
    setShowDropdown(false)
    setTimeout(() => amountRef.current?.focus(), 0)
  }

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!date || !amount || !accountNo) return
    if (accountNo.length !== 3 || isNaN(Number(accountNo))) return
    const amt = parseFloat(amount)
    if (isNaN(amt) || amt <= 0) return
    await addWithdrawal({ date, account_no: accountNo, amount: amt })
    setAmount('')
    setAccountNo('')
    setAccountSearch('')
    setTimeout(() => searchRef.current?.focus(), 0)
    const t = await getTotalForDate(date)
    setTotalToday(t)
  }

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editW) return
    await updateWithdrawal(editW.id, {
      date: editW.date,
      account_no: editW.accountNo,
      amount: parseFloat(editW.amount),
    })
    setEditW(null)
    reload()
  }

  const handleFilter = (e: React.FormEvent) => {
    e.preventDefault()
    reload()
  }

  const formatDate = (d: string) => new Date(d).toLocaleDateString('en-GB')

  const fetcher = useCallback(async (offset: number, limit: number) => {
    let query = supabase.from('withdrawals').select('*', { count: 'exact' })
      .order('date', { ascending: false }).order('id', { ascending: false })
    if (filterDate) query = query.eq('date', filterDate)
    if (filterAccount) query = query.eq('account_no', filterAccount)
    const { data, error, count } = await query.range(offset, offset + limit - 1)
    if (error) return { data: [], total: 0 }
    return { data: data || [], total: count }
  }, [filterDate, filterAccount])

  const { items: withdrawals, isLoading, hasMore, totalCount, sentinelRef, reload } = useServerInfiniteScroll(
    fetcher,
    [filterDate, filterAccount],
    { initialBatch: 20, batchSize: 20 }
  )

  if (isLoading) return <DashboardLayout><Spinner /></DashboardLayout>

  return (
    <DashboardLayout>
      <div className="w-full space-y-5 animate-fade-in">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 tracking-tight">Withdrawals</h1>
          <p className="text-sm text-gray-500 mt-1">Track expenses and payments from collected cash</p>
        </div>

        <StatsCard
          label="Today's Withdrawals"
          value={`Rs. ${totalToday.toFixed(2)}`}
          color="red"
          sub={new Date().toLocaleDateString('en-GB', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          icon={
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
            </svg>
          }
        />

        <Card padding="md">
          <div className="flex items-center gap-2 pb-3 border-b border-gray-100 mb-4">
            <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v3m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <h2 className="text-lg font-semibold text-gray-900">New Withdrawal</h2>
          </div>
          <form onSubmit={handleAdd} className="space-y-4">
            <div>
              <label htmlFor="wdate" className="block text-xs font-medium text-gray-600 mb-1.5">Date</label>
              <input id="wdate" type="date" value={date} onChange={e => setDate(e.target.value)} className="input-field" required />
            </div>
            <div>
              <label htmlFor="wparty" className="block text-xs font-medium text-gray-600 mb-1.5">Account (Search Party)</label>
              <div className="relative">
                <input
                  ref={searchRef}
                  id="wparty"
                  type="text"
                  value={accountSearch}
                  onChange={e => { setAccountSearch(e.target.value); setShowDropdown(true) }}
                  onFocus={() => setShowDropdown(true)}
                  className="input-field pr-10"
                  placeholder="Type name or 3-digit account no..."
                  autoComplete="off"
                  required
                />
                <svg className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                {showDropdown && accountSearch && (
                  <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg max-h-60 overflow-y-auto animate-fade-in">
                    {filteredParties.length > 0 ? filteredParties.map(p => (
                      <button key={p.id} type="button"
                        onClick={() => handleAccountSelect(p)}
                        className="w-full text-left px-4 py-2.5 hover:bg-red-50 transition-colors border-b border-gray-50 last:border-0"
                      >
                        <div className="text-sm font-medium text-gray-900">{p.name}</div>
                        <div className="text-xs text-gray-400">Account: {p.account_no}</div>
                      </button>
                    )) : (
                      <div className="p-4 text-center text-sm text-gray-400">No parties found</div>
                    )}
                  </div>
                )}
              </div>
            </div>
            <div>
              <label htmlFor="wamount" className="block text-xs font-medium text-gray-600 mb-1.5">Amount (Rs.)</label>
              <input ref={amountRef} id="wamount" type="number" step="0.01" min="0" value={amount} onChange={e => setAmount(e.target.value)} className="input-field" placeholder="0.00" required />
            </div>
            <div className="flex justify-end">
              <Button type="submit" variant="danger" size="lg">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                Add Withdrawal
              </Button>
            </div>
          </form>
        </Card>

        <Card padding="md">
          <div className="flex items-center gap-2 pb-3 border-b border-gray-100 mb-4">
            <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
            </svg>
            <h2 className="text-lg font-semibold text-gray-900">Filters</h2>
          </div>
          <form onSubmit={handleFilter} className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <input type="date" value={filterDate} onChange={e => setFilterDate(e.target.value)} className="input-field" />
            <input type="text" value={filterAccount} onChange={e => setFilterAccount(e.target.value)} maxLength={3} className="input-field" placeholder="Account no..." />
            <div className="flex gap-2">
              <Button type="submit" variant="primary" className="flex-1">Apply</Button>
              <Button type="button" variant="secondary" className="flex-1" onClick={() => { setFilterDate(''); setFilterAccount(''); reload() }}>Clear</Button>
            </div>
          </form>
        </Card>

        <Card padding="md">
          <div className="flex items-center gap-2 pb-3 border-b border-gray-100 mb-4">
            <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <h2 className="text-lg font-semibold text-gray-900">All Withdrawals</h2>
            <span className="badge badge-error">{totalCount ?? withdrawals.length} total</span>
          </div>

          {withdrawals.length === 0 ? (
            <EmptyState title="No withdrawals found" message="Start by adding a withdrawal above." />
          ) : (
            <div className="overflow-x-auto -mx-4 md:-mx-0">
              <table className="min-w-full">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">Date</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">Party</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">Account</th>
                    <th className="text-right px-4 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">Amount</th>
                    <th className="text-right px-4 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {withdrawals.map(w => {
                    const party = parties.find(p => p.account_no === w.account_no)
                    return (
                      <tr key={w.id} className="hover:bg-gray-50/50 transition-colors">
                        <td className="px-4 py-3 text-sm text-gray-600">{formatDate(w.date)}</td>
                        <td className="px-4 py-3 text-sm font-medium text-gray-900">{party?.name || 'Unknown'}</td>
                        <td className="px-4 py-3 text-sm font-mono text-gray-500">{w.account_no}</td>
                        <td className="px-4 py-3 text-sm font-semibold text-red-600 text-right">Rs. {w.amount.toFixed(2)}</td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex justify-end gap-1">
                            <button onClick={() => setEditW({ id: w.id!, date: w.date, amount: w.amount.toString(), accountNo: w.account_no })}
                              className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors" title="Edit">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                              </svg>
                            </button>
                            <button onClick={() => setConfirmDelete(w.id!)}
                              className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors" title="Delete">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
              {hasMore && (
                <div ref={sentinelRef} className="py-2">
                  <TableSkeleton rows={2} columns={5} />
                </div>
              )}
            </div>
          )}

          {withdrawals.length > 0 && (
            <div className="flex justify-between items-center pt-4 mt-4 border-t border-gray-100">
              <span className="text-sm font-medium text-gray-600">Total</span>
              <span className="text-lg font-bold text-red-600">
                Rs. {withdrawals.reduce((s, w) => s + w.amount, 0).toFixed(2)}
              </span>
            </div>
          )}
        </Card>
      </div>

      <Modal open={!!editW} onClose={() => setEditW(null)} title="Edit Withdrawal">
        {editW && (
          <form onSubmit={handleEdit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">Date</label>
              <input type="date" value={editW.date} onChange={e => setEditW({ ...editW, date: e.target.value })} className="input-field" required />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">Account No (3 digits)</label>
              <input type="text" maxLength={3} value={editW.accountNo} onChange={e => setEditW({ ...editW, accountNo: e.target.value })} className="input-field" required />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">Amount</label>
              <input type="number" step="0.01" value={editW.amount} onChange={e => setEditW({ ...editW, amount: e.target.value })} className="input-field" required />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="secondary" onClick={() => setEditW(null)}>Cancel</Button>
              <Button type="submit">Update</Button>
            </div>
          </form>
        )}
      </Modal>

      <ConfirmModal
        open={confirmDelete !== null}
        title="Delete Withdrawal"
        message="Are you sure you want to delete this withdrawal? This action cannot be undone."
        onConfirm={async () => {
          if (confirmDelete === null) return
          await deleteWithdrawal(confirmDelete)
          addToast('Withdrawal deleted', 'success')
          setConfirmDelete(null)
          reload()
        }}
        onCancel={() => setConfirmDelete(null)}
      />
    </DashboardLayout>
  )
}
