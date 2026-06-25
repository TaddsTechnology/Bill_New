'use client'

import { useState, useMemo } from 'react'
import DashboardLayout from '../dashboard-layout'
import { useParties } from '../../lib/hooks/useParties'
import { useCollections } from '../../lib/hooks/useCollections'
import { useWithdrawals } from '../../lib/hooks/useWithdrawals'
import { useInfiniteScroll } from '../../lib/hooks/useInfiniteScroll'
import { Card } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { Spinner } from '../../components/ui/Spinner'
import { EmptyState } from '../../components/ui/EmptyState'
import { Modal } from '../../components/ui/Modal'
import { TableSkeleton } from '../../components/ui/TableSkeleton'
import { ConfirmModal } from '../../components/ui/ConfirmModal'
import { PartyReportModal } from '../../components/PartyReportModal'
import { useToast } from '../../lib/hooks/useToast'

export default function MasterDataPage() {
  const { parties, loading, addParty, updateParty, deleteParty } = useParties()
  const { entries } = useCollections()
  const { withdrawals } = useWithdrawals()

  const [name, setName] = useState('')
  const [accountNo, setAccountNo] = useState('')
  const [editP, setEditP] = useState<{ id: number; name: string; accountNo: string } | null>(null)
  const { addToast } = useToast()
  const [search, setSearch] = useState('')
  const [reportOpen, setReportOpen] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState<number | null>(null)

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name || !accountNo) return
    if (accountNo.length !== 3 || isNaN(Number(accountNo))) return
    await addParty({ name, account_no: accountNo })
    setName('')
    setAccountNo('')
  }

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editP) return
    if (editP.accountNo.length !== 3 || isNaN(Number(editP.accountNo))) return
    await updateParty(editP.id, { name: editP.name, account_no: editP.accountNo })
    setEditP(null)
  }

  const filteredParties = useMemo(() => {
    if (!search) return parties
    const s = search.toLowerCase()
    return parties.filter(p =>
      p.name.toLowerCase().includes(s) || p.account_no.includes(search)
    )
  }, [parties, search])

  const partyStats = useMemo(() => {
    const collMap = new Map<string, number>()
    const wdMap = new Map<string, number>()
    entries.forEach(e => collMap.set(e.account_no, (collMap.get(e.account_no) || 0) + e.amount))
    withdrawals.forEach(w => wdMap.set(w.account_no, (wdMap.get(w.account_no) || 0) + w.amount))
    return parties.map(p => ({
      ...p,
      totalCollection: collMap.get(p.account_no) || 0,
      totalWithdrawal: wdMap.get(p.account_no) || 0,
      net: (collMap.get(p.account_no) || 0) - (wdMap.get(p.account_no) || 0),
    }))
  }, [parties, entries, withdrawals])

  const visibleStats = useMemo(() => {
    if (!search) return partyStats
    const s = search.toLowerCase()
    return partyStats.filter(p =>
      p.name.toLowerCase().includes(s) || p.account_no.includes(search)
    )
  }, [partyStats, search])

  const { visibleCount, sentinelRef, hasMore } = useInfiniteScroll({
    totalItems: filteredParties.length,
    initialBatch: 20,
    batchSize: 20,
  })

  if (loading) return <DashboardLayout><Spinner /></DashboardLayout>

  return (
    <DashboardLayout>
      <div className="w-full space-y-5 animate-fade-in">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900 tracking-tight">Master Data</h1>
            <p className="text-sm text-gray-500 mt-1">Manage parties and account information</p>
          </div>
          <Button
            onClick={() => setReportOpen(true)}
            disabled={parties.length === 0}
            size="lg"
            className="w-full sm:w-auto shrink-0"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2a2 2 0 012-2h2a2 2 0 012 2v2m2-10V5a2 2 0 00-2-2h-2a2 2 0 00-2 2v2M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
            </svg>
            <span className="sm:inline">Generate Party Report</span>
          </Button>
        </div>

        <Card padding="md">
          <div className="flex items-center gap-2 pb-3 border-b border-gray-100 mb-4">
            <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v3m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <h2 className="text-lg font-semibold text-gray-900">Add New Party</h2>
          </div>
          <form onSubmit={handleAdd} className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">Party Name</label>
              <input type="text" value={name} onChange={e => setName(e.target.value)} className="input-field" placeholder="Enter name" required />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">Account No (3 digits)</label>
              <input type="text" value={accountNo} onChange={e => setAccountNo(e.target.value)} maxLength={3} className="input-field" placeholder="123" required />
            </div>
            <div className="flex items-end">
              <Button type="submit" size="lg" className="w-full">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                Add Party
              </Button>
            </div>
          </form>
        </Card>

        <Card padding="md">
          <div className="flex items-center gap-2 pb-3 border-b border-gray-100 mb-4">
            <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            <h2 className="text-lg font-semibold text-gray-900">Party-wise Summary</h2>
            <span className="badge badge-primary">{parties.length}</span>
          </div>
          {parties.length === 0 ? (
            <EmptyState title="No parties yet" message="Add a party to see the summary." />
          ) : (
            <div className="overflow-x-auto -mx-4 md:-mx-0">
              <table className="min-w-full">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">Account</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">Name</th>
                    <th className="text-right px-4 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">Total Collection</th>
                    <th className="text-right px-4 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">Total Withdrawal</th>
                    <th className="text-right px-4 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">Net</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {visibleStats.slice(0, visibleCount).map(p => (
                    <tr key={p.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-4 py-3 text-sm font-mono text-gray-500">{p.account_no}</td>
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">{p.name}</td>
                      <td className="px-4 py-3 text-sm font-semibold text-green-600 text-right">Rs. {p.totalCollection.toFixed(2)}</td>
                      <td className="px-4 py-3 text-sm font-semibold text-red-600 text-right">Rs. {p.totalWithdrawal.toFixed(2)}</td>
                      <td className={`px-4 py-3 text-sm font-semibold text-right ${p.net >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                        Rs. {p.net.toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {hasMore && (
                <div ref={sentinelRef} className="py-2">
                  <TableSkeleton rows={2} columns={5} />
                </div>
              )}
            </div>
          )}
        </Card>

        <Card padding="md">
          <div className="flex items-center gap-2 pb-3 border-b border-gray-100 mb-4">
            <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            <h2 className="text-lg font-semibold text-gray-900">Party List</h2>
            <span className="badge badge-primary">{parties.length} total</span>
          </div>

          <div className="mb-4">
            <div className="relative">
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="input-field pr-10"
                placeholder="Search by name or account no..."
                autoComplete="off"
              />
              <svg className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
          </div>

          {filteredParties.length === 0 ? (
            <EmptyState title="No parties match your search" message="Try a different name or account number." />
          ) : (
            <div className="overflow-x-auto -mx-4 md:-mx-0">
              <table className="min-w-full">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">Name</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">Account No</th>
                    <th className="text-right px-4 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filteredParties.slice(0, visibleCount).map(p => (
                    <tr key={p.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">{p.name}</td>
                      <td className="px-4 py-3 text-sm font-mono text-gray-500">{p.account_no}</td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex justify-end gap-1">
                          <button onClick={() => setEditP({ id: p.id!, name: p.name, accountNo: p.account_no })}
                            className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors" title="Edit">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </button>
                           <button onClick={() => setConfirmDelete(p.id!)}
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
              {hasMore && (
                <div ref={sentinelRef} className="py-2">
                  <TableSkeleton rows={2} columns={3} />
                </div>
              )}
            </div>
          )}
        </Card>
      </div>

      <Modal open={!!editP} onClose={() => setEditP(null)} title="Edit Party">
        {editP && (
          <form onSubmit={handleEdit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">Party Name</label>
              <input type="text" value={editP.name} onChange={e => setEditP({ ...editP, name: e.target.value })} className="input-field" required />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">Account No (3 digits)</label>
              <input type="text" value={editP.accountNo} onChange={e => setEditP({ ...editP, accountNo: e.target.value })} maxLength={3} className="input-field" required />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="secondary" onClick={() => setEditP(null)}>Cancel</Button>
              <Button type="submit">Update</Button>
            </div>
          </form>
        )}
      </Modal>

      <ConfirmModal
        open={confirmDelete !== null}
        title="Delete Party"
        message="Are you sure you want to delete this party? All associated data will remain."
        onConfirm={async () => {
          if (confirmDelete === null) return
          await deleteParty(confirmDelete)
          addToast('Party deleted', 'success')
          setConfirmDelete(null)
        }}
        onCancel={() => setConfirmDelete(null)}
      />

      <PartyReportModal
        open={reportOpen}
        onClose={() => setReportOpen(false)}
        parties={parties}
        entries={entries}
        withdrawals={withdrawals}
      />
    </DashboardLayout>
  )
}
