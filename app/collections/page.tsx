'use client'

import { useState } from 'react'
import DashboardLayout from '../dashboard-layout'
import { useCollections } from '../../lib/hooks/useCollections'
import { useParties } from '../../lib/hooks/useParties'
import { useInfiniteScroll } from '../../lib/hooks/useInfiniteScroll'
import { Card } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { Spinner } from '../../components/ui/Spinner'
import { EmptyState } from '../../components/ui/EmptyState'
import { Modal } from '../../components/ui/Modal'
import { TableSkeleton } from '../../components/ui/TableSkeleton'

const COLLECTORS = ['Kalpesh', 'Sanjay', 'Supan', 'Vipul']

export default function CollectionsPage() {
  const { entries, loading, updateEntry, deleteEntry, getFiltered, reload } = useCollections()
  const { parties } = useParties()

  const [filterDate, setFilterDate] = useState('')
  const [filterAccount, setFilterAccount] = useState('')
  const [editEntry, setEditEntry] = useState<{ id: number; date: string; amount: string; collector: string } | null>(null)

  const handleFilter = async (e: React.FormEvent) => {
    e.preventDefault()
    await getFiltered(filterDate || null, filterAccount || null)
  }

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editEntry) return
    await updateEntry(editEntry.id, {
      date: editEntry.date,
      amount: parseFloat(editEntry.amount),
      collector: editEntry.collector,
    })
    setEditEntry(null)
  }

  const formatDate = (d: string) => new Date(d).toLocaleDateString('en-GB')

  const { visibleCount, sentinelRef, hasMore } = useInfiniteScroll({
    totalItems: entries.length,
    initialBatch: 20,
    batchSize: 20,
  })

  if (loading) return <DashboardLayout><Spinner /></DashboardLayout>

  return (
    <DashboardLayout>
      <div className="w-full space-y-5 animate-fade-in">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 tracking-tight">Collections</h1>
          <p className="text-sm text-gray-500 mt-1">View and manage all collection entries</p>
        </div>

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
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            <h2 className="text-lg font-semibold text-gray-900">All Collections</h2>
            <span className="badge badge-primary">{entries.length} total</span>
          </div>

          {entries.length === 0 ? (
            <EmptyState title="No collections found" message="Try adjusting your filters or add a new collection." />
          ) : (
            <div className="overflow-x-auto -mx-4 md:-mx-0">
              <table className="min-w-full">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">Date</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">Party</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">Account</th>
                    <th className="text-right px-4 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">Amount</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">Collector</th>
                    <th className="text-right px-4 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {entries.slice(0, visibleCount).map(entry => {
                    const party = parties.find(p => p.account_no === entry.account_no)
                    return (
                      <tr key={entry.id} className="hover:bg-gray-50/50 transition-colors">
                        <td className="px-4 py-3 text-sm text-gray-600">{formatDate(entry.date)}</td>
                        <td className="px-4 py-3 text-sm font-medium text-gray-900">{party?.name || 'Unknown'}</td>
                        <td className="px-4 py-3 text-sm font-mono text-gray-500">{entry.account_no}</td>
                        <td className="px-4 py-3 text-sm font-semibold text-green-600 text-right">Rs. {entry.amount.toFixed(2)}</td>
                        <td className="px-4 py-3"><span className="badge badge-primary">{entry.collector}</span></td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex justify-end gap-1">
                            <button onClick={() => setEditEntry({ id: entry.id!, date: entry.date, amount: entry.amount.toString(), collector: entry.collector })}
                              className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors" title="Edit">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                              </svg>
                            </button>
                            <button onClick={() => { if (confirm('Delete this entry?')) deleteEntry(entry.id!) }}
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
                  <TableSkeleton rows={2} columns={6} />
                </div>
              )}
            </div>
          )}
        </Card>
      </div>

      <Modal open={!!editEntry} onClose={() => setEditEntry(null)} title="Edit Collection">
        {editEntry && (
          <form onSubmit={handleEdit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">Date</label>
              <input type="date" value={editEntry.date} onChange={e => setEditEntry({ ...editEntry, date: e.target.value })} className="input-field" required />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">Amount</label>
              <input type="number" step="0.01" value={editEntry.amount} onChange={e => setEditEntry({ ...editEntry, amount: e.target.value })} className="input-field" required />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">Collector</label>
              <select value={editEntry.collector} onChange={e => setEditEntry({ ...editEntry, collector: e.target.value })} className="input-field">
                {COLLECTORS.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="secondary" onClick={() => setEditEntry(null)}>Cancel</Button>
              <Button type="submit">Update</Button>
            </div>
          </form>
        )}
      </Modal>
    </DashboardLayout>
  )
}
