'use client'

import { useState, useEffect } from 'react'
import DashboardLayout from '../dashboard-layout'
import { useWithdrawals } from '../../lib/hooks/useWithdrawals'
import { Card } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { StatsCard } from '../../components/ui/StatsCard'
import { Spinner } from '../../components/ui/Spinner'
import { EmptyState } from '../../components/ui/EmptyState'
import { Modal } from '../../components/ui/Modal'

const CATEGORIES = ['Rent', 'Utilities', 'Supplies', 'Transportation', 'Repairs', 'Salary', 'Miscellaneous']

export default function WithdrawalsPage() {
  const { withdrawals, loading, addWithdrawal, updateWithdrawal, deleteWithdrawal, getFiltered, getTotalForDate, reload } = useWithdrawals()

  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0])
  const [amount, setAmount] = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState(CATEGORIES[0])
  const [filterDate, setFilterDate] = useState('')
  const [filterCategory, setFilterCategory] = useState('')
  const [editW, setEditW] = useState<{ id: number; date: string; amount: string; description: string; category: string } | null>(null)
  const [totalToday, setTotalToday] = useState(0)

  useEffect(() => {
    if (date) getTotalForDate(date).then(setTotalToday)
  }, [date, withdrawals, getTotalForDate])

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!date || !amount || !description) return
    const amt = parseFloat(amount)
    if (isNaN(amt) || amt <= 0) return
    await addWithdrawal({ date, amount: amt, description, category })
    setAmount('')
    setDescription('')
    const t = await getTotalForDate(date)
    setTotalToday(t)
  }

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editW) return
    await updateWithdrawal(editW.id, {
      date: editW.date,
      amount: parseFloat(editW.amount),
      description: editW.description,
      category: editW.category,
    })
    setEditW(null)
  }

  const handleFilter = async (e: React.FormEvent) => {
    e.preventDefault()
    const data = await getFiltered(filterDate || null, filterCategory || null)
    return data
  }

  const formatDate = (d: string) => new Date(d).toLocaleDateString('en-GB')

  if (loading) return <DashboardLayout><Spinner /></DashboardLayout>

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
          <form onSubmit={handleAdd} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">Date</label>
              <input type="date" value={date} onChange={e => setDate(e.target.value)} className="input-field" required />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">Category</label>
              <select value={category} onChange={e => setCategory(e.target.value)} className="input-field">
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">Amount (Rs.)</label>
              <input type="number" step="0.01" min="0" value={amount} onChange={e => setAmount(e.target.value)} className="input-field" placeholder="0.00" required />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">Description</label>
              <input type="text" value={description} onChange={e => setDescription(e.target.value)} className="input-field" placeholder="e.g. Office supplies" required />
            </div>
            <div className="md:col-span-2 flex justify-end">
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
            <select value={filterCategory} onChange={e => setFilterCategory(e.target.value)} className="input-field">
              <option value="">All Categories</option>
              {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <div className="flex gap-2">
              <Button type="submit" variant="primary" className="flex-1">Apply</Button>
              <Button type="button" variant="secondary" className="flex-1" onClick={() => { setFilterDate(''); setFilterCategory(''); reload() }}>Clear</Button>
            </div>
          </form>
        </Card>

        <Card padding="md">
          <div className="flex items-center gap-2 pb-3 border-b border-gray-100 mb-4">
            <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <h2 className="text-lg font-semibold text-gray-900">All Withdrawals</h2>
            <span className="badge badge-warning">{withdrawals.length} total</span>
          </div>

          {withdrawals.length === 0 ? (
            <EmptyState title="No withdrawals found" message="Start by adding a withdrawal above." />
          ) : (
            <div className="overflow-x-auto -mx-4 md:-mx-0">
              <table className="min-w-full">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">Date</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">Category</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">Description</th>
                    <th className="text-right px-4 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">Amount</th>
                    <th className="text-right px-4 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {withdrawals.map(w => (
                    <tr key={w.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-4 py-3 text-sm text-gray-600">{formatDate(w.date)}</td>
                      <td className="px-4 py-3"><span className="badge badge-warning">{w.category}</span></td>
                      <td className="px-4 py-3 text-sm text-gray-700">{w.description}</td>
                      <td className="px-4 py-3 text-sm font-semibold text-red-600 text-right">Rs. {w.amount.toFixed(2)}</td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex justify-end gap-1">
                          <button onClick={() => setEditW({ id: w.id!, date: w.date, amount: w.amount.toString(), description: w.description, category: w.category })}
                            className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors" title="Edit">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </button>
                          <button onClick={() => { if (confirm('Delete this withdrawal?')) deleteWithdrawal(w.id!) }}
                            className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors" title="Delete">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
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
              <label className="block text-xs font-medium text-gray-600 mb-1.5">Category</label>
              <select value={editW.category} onChange={e => setEditW({ ...editW, category: e.target.value })} className="input-field">
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">Amount</label>
              <input type="number" step="0.01" value={editW.amount} onChange={e => setEditW({ ...editW, amount: e.target.value })} className="input-field" required />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">Description</label>
              <input type="text" value={editW.description} onChange={e => setEditW({ ...editW, description: e.target.value })} className="input-field" required />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="secondary" onClick={() => setEditW(null)}>Cancel</Button>
              <Button type="submit">Update</Button>
            </div>
          </form>
        )}
      </Modal>
    </DashboardLayout>
  )
}
