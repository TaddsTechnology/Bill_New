'use client'

import { useState, useMemo, useCallback, useRef } from 'react'
import DashboardLayout from '../dashboard-layout'
import { supabase, type Withdrawal, type CashCollectionEntry } from '../../lib/supabaseClient'
import { useParties } from '../../lib/hooks/useParties'
import { useToast } from '../../lib/hooks/useToast'
import { useServerInfiniteScroll } from '../../lib/hooks/useInfiniteScroll'
import { Card } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { StatsCard } from '../../components/ui/StatsCard'
import { Spinner } from '../../components/ui/Spinner'
import { EmptyState } from '../../components/ui/EmptyState'
import { ConfirmModal } from '../../components/ui/ConfirmModal'
import { TableSkeleton } from '../../components/ui/TableSkeleton'
import { exportForSelf, exportForBank, writeWorkbookToFile, deleteYearEntries } from '../../lib/cashCollectionService'

export default function ReportsPage() {
  const { parties } = useParties()
  const { addToast } = useToast()
  const [filterFromDate, setFilterFromDate] = useState('')
  const [filterToDate, setFilterToDate] = useState('')
  const [filterAccount, setFilterAccount] = useState('')
  const [exportFromDate, setExportFromDate] = useState('')
  const [exportToDate, setExportToDate] = useState('')
  const filterFromDateRef = useRef('')
  const filterToDateRef = useRef('')
  const filterAccountRef = useRef('')
  const [totalCollection, setTotalCollection] = useState(0)
  const [totalWithdrawal, setTotalWithdrawal] = useState(0)
  const [totalsLoading, setTotalsLoading] = useState(true)
  const [cleanupYear, setCleanupYear] = useState('')
  const [cleanupCount, setCleanupCount] = useState<{ collections: number; withdrawals: number } | null>(null)
  const [cleanupLoading, setCleanupLoading] = useState(false)
  const [showCleanupConfirm, setShowCleanupConfirm] = useState(false)

  const refreshTotals = useCallback(async (from?: string, to?: string) => {
    setTotalsLoading(true)
    try {
      let collQuery = supabase.from('cash_collections').select('amount')
      let wdQuery = supabase.from('withdrawals').select('amount')
      if (from) { collQuery = collQuery.gte('date', from); wdQuery = wdQuery.gte('date', from) }
      if (to) { collQuery = collQuery.lte('date', to); wdQuery = wdQuery.lte('date', to) }
      const [collRes, wdRes] = await Promise.all([collQuery, wdQuery])
      setTotalCollection((collRes.data || []).reduce((s, e) => s + e.amount, 0))
      setTotalWithdrawal((wdRes.data || []).reduce((s, w) => s + w.amount, 0))
    } catch {
      addToast('Failed to load totals', 'error')
    } finally {
      setTotalsLoading(false)
    }
  }, [addToast])

  const entriesFetcher = useCallback(async (offset: number, limit: number) => {
    let query = supabase.from('cash_collections').select('*', { count: 'exact' })
      .order('date', { ascending: false }).order('id', { ascending: false })
    if (filterFromDateRef.current) query = query.gte('date', filterFromDateRef.current)
    if (filterToDateRef.current) query = query.lte('date', filterToDateRef.current)
    if (filterAccountRef.current) query = query.eq('account_no', filterAccountRef.current)
    const { data, error, count } = await query.range(offset, offset + limit - 1)
    if (error) return { data: [], total: 0 }
    return { data: data || [], total: count }
  }, [])

  const { items: entries, isLoading, hasMore, sentinelRef, reload } = useServerInfiniteScroll(entriesFetcher, [])

  const partyCollections = useMemo(() => {
    if (totalsLoading) return []
    const map = new Map<string, number>()
    entries.forEach(e => map.set(e.account_no, (map.get(e.account_no) || 0) + e.amount))
    const pmap = new Map(parties.map(p => [p.account_no, p.name]))
    return Array.from(map.entries()).map(([ac, amt]) => ({ name: pmap.get(ac) || `Unknown (${ac})`, amount: amt }))
  }, [entries, parties, totalsLoading])

  const handleFilter = (e: React.FormEvent) => {
    e.preventDefault()
    filterFromDateRef.current = filterFromDate
    filterToDateRef.current = filterToDate
    filterAccountRef.current = filterAccount
    reload()
    refreshTotals(filterFromDate || undefined, filterToDate || undefined)
  }

  const handleClear = () => {
    setFilterFromDate('')
    setFilterToDate('')
    setFilterAccount('')
    filterFromDateRef.current = ''
    filterToDateRef.current = ''
    filterAccountRef.current = ''
    reload()
    refreshTotals()
  }

  const PAGE_SIZE = 1000

  const fetchAllForExport = useCallback(async (fromDate?: string, toDate?: string) => {
    const fd = fromDate || filterFromDateRef.current
    const td = toDate || filterToDateRef.current
    const allData: CashCollectionEntry[] = []
    let page = 0
    while (true) {
      let query = supabase.from('cash_collections').select('*')
        .order('date', { ascending: false }).order('id', { ascending: false })
        .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1)
      if (fd) query = query.gte('date', fd)
      if (td) query = query.lte('date', td)
      if (filterAccountRef.current) query = query.eq('account_no', filterAccountRef.current)
      const { data } = await query
      if (!data || data.length === 0) break
      allData.push(...data)
      if (data.length < PAGE_SIZE) break
      page++
    }
    return allData
  }, [])

  const fetchAllWithdrawals = useCallback(async (fromDate?: string, toDate?: string) => {
    const fd = fromDate || filterFromDateRef.current
    const td = toDate || filterToDateRef.current
    const allData: Withdrawal[] = []
    let page = 0
    while (true) {
      let query = supabase.from('withdrawals').select('*')
        .order('date', { ascending: false }).order('id', { ascending: false })
        .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1)
      if (fd) query = query.gte('date', fd)
      if (td) query = query.lte('date', td)
      const { data } = await query
      if (!data || data.length === 0) break
      allData.push(...data)
      if (data.length < PAGE_SIZE) break
      page++
    }
    return allData
  }, [])

  const exportSelf = async () => {
    try {
      const fd = exportFromDate || undefined
      const td = exportToDate || undefined
      const [allEntries, allWithdrawals] = await Promise.all([fetchAllForExport(fd, td), fetchAllWithdrawals(fd, td)])
      const wb = await exportForSelf(allEntries, parties, allWithdrawals, { fromDate: fd, toDate: td })
      writeWorkbookToFile(wb, 'For Self.xlsx')
      addToast('Personal report exported', 'success')
    } catch {
      addToast('Failed to export personal report', 'error')
    }
  }

  const exportBank = async () => {
    try {
      const fd = exportFromDate || undefined
      const td = exportToDate || undefined
      const allEntries = await fetchAllForExport(fd, td)
      const ws = await exportForBank(allEntries)
      const XLSX = await import('xlsx-js-style')
      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, ws, 'Bank File')
      XLSX.writeFile(wb, 'For Bank.xlsx')
      addToast('Bank file exported', 'success')
    } catch {
      addToast('Failed to export bank file', 'error')
    }
  }

  const handleCleanupPreview = async () => {
    if (!cleanupYear) return
    setCleanupLoading(true)
    try {
      const [collRes, wdRes] = await Promise.all([
        supabase.from('cash_collections').select('amount', { count: 'exact', head: true })
          .gte('date', `${cleanupYear}-01-01`).lte('date', `${cleanupYear}-12-31`),
        supabase.from('withdrawals').select('amount', { count: 'exact', head: true })
          .gte('date', `${cleanupYear}-01-01`).lte('date', `${cleanupYear}-12-31`),
      ])
      setCleanupCount({
        collections: collRes.count ?? 0,
        withdrawals: wdRes.count ?? 0,
      })
      if ((collRes.count ?? 0) === 0 && (wdRes.count ?? 0) === 0) {
        addToast('No entries found for this year', 'info')
      } else {
        setShowCleanupConfirm(true)
      }
    } catch {
      addToast('Failed to check year data', 'error')
    } finally {
      setCleanupLoading(false)
    }
  }

  const handleCleanupConfirm = async () => {
    if (!cleanupYear) return
    setCleanupLoading(true)
    try {
      const result = await deleteYearEntries(cleanupYear)
      addToast(`Deleted ${result.collectionsDeleted} collections and ${result.withdrawalsDeleted} withdrawals for ${cleanupYear}`, 'success')
      setShowCleanupConfirm(false)
      setCleanupCount(null)
      reload()
      refreshTotals(filterFromDateRef.current || undefined, filterToDateRef.current || undefined)
    } catch {
      addToast('Failed to delete entries', 'error')
    } finally {
      setCleanupLoading(false)
    }
  }

  const formatDate = (d: string) => new Date(d).toLocaleDateString('en-GB')

  if (isLoading && totalsLoading) return <DashboardLayout><Spinner /></DashboardLayout>

  return (
    <DashboardLayout>
      <div className="w-full space-y-5 animate-fade-in">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 tracking-tight">Reports</h1>
          <p className="text-sm text-gray-500 mt-1">Overview and analytics of your cash flow</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <StatsCard label="Total Collection" value={`Rs. ${totalCollection.toFixed(2)}`} color="green"
            icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>} />
          <StatsCard label="Total Withdrawals" value={`Rs. ${totalWithdrawal.toFixed(2)}`} color="red"
            icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
            </svg>} />
          <StatsCard label="Net Cash in Hand" value={`Rs. ${(totalCollection - totalWithdrawal).toFixed(2)}`} color="blue"
            icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
            </svg>} />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-3">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Export From Date</label>
            <input type="date" value={exportFromDate} onChange={e => setExportFromDate(e.target.value)} className="input-field" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Export To Date</label>
            <input type="date" value={exportToDate} onChange={e => setExportToDate(e.target.value)} className="input-field" />
          </div>
        </div>
        <div className="flex flex-col sm:flex-row gap-3">
          <Button onClick={exportSelf} variant="success" size="lg" className="flex-1" disabled={entries.length === 0}>
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Export for Personal Use
          </Button>
          <Button onClick={exportBank} variant="primary" size="lg" className="flex-1" disabled={entries.length === 0}>
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
            Export for Bank
          </Button>
        </div>

        <Card padding="md">
          <div className="flex items-center gap-2 pb-3 border-b border-gray-100 mb-4">
            <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
            </svg>
            <h2 className="text-lg font-semibold text-gray-900">Filters</h2>
          </div>
          <form onSubmit={handleFilter} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">From Date</label>
              <input type="date" value={filterFromDate} onChange={e => setFilterFromDate(e.target.value)} className="input-field" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">To Date</label>
              <input type="date" value={filterToDate} onChange={e => setFilterToDate(e.target.value)} className="input-field" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Account No</label>
              <input type="text" value={filterAccount} onChange={e => setFilterAccount(e.target.value)} maxLength={3} className="input-field" placeholder="All accounts" />
            </div>
            <div className="flex items-end">
              <Button type="submit" variant="primary" className="w-full">Apply</Button>
            </div>
            <div className="flex items-end">
              <Button type="button" variant="secondary" className="w-full" onClick={handleClear}>Clear</Button>
            </div>
          </form>
        </Card>

        <Card padding="md">
          <div className="flex items-center gap-2 pb-3 border-b border-gray-100 mb-4">
            <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            <h2 className="text-lg font-semibold text-gray-900">Collections by Party</h2>
          </div>
          {partyCollections.length === 0 ? (
            <EmptyState title="No data" message="No collections recorded yet." />
          ) : (
            <div className="divide-y divide-gray-50">
              {partyCollections.map((p, i) => (
                <div key={i} className="flex items-center justify-between py-3 px-1 hover:bg-gray-50/50 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center text-xs font-bold text-gray-500">
                      {p.name.charAt(0).toUpperCase()}
                    </div>
                    <span className="text-sm font-medium text-gray-900">{p.name}</span>
                  </div>
                  <span className="text-sm font-semibold text-green-600">Rs. {p.amount.toFixed(2)}</span>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card padding="md">
          <div className="flex items-center justify-between pb-3 border-b border-gray-100 mb-4">
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              <h2 className="text-lg font-semibold text-gray-900">Collection Entries</h2>
              <span className="badge badge-primary">{entries.length}</span>
            </div>
          </div>

          {entries.length === 0 ? (
            <EmptyState title="No entries for this filter" message="Try adjusting your filters." />
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
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {entries.map(entry => {
                    const party = parties.find(p => p.account_no === entry.account_no)
                    return (
                      <tr key={entry.id} className="hover:bg-gray-50/50 transition-colors">
                        <td className="px-4 py-3 text-sm text-gray-600">{formatDate(entry.date)}</td>
                        <td className="px-4 py-3 text-sm font-medium text-gray-900">{party?.name || 'Unknown'}</td>
                        <td className="px-4 py-3 text-sm font-mono text-gray-500">{entry.account_no}</td>
                        <td className="px-4 py-3 text-sm font-semibold text-green-600 text-right">Rs. {entry.amount.toFixed(2)}</td>
                        <td className="px-4 py-3"><span className="badge badge-primary">{entry.collector}</span></td>
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
        </Card>

        <Card padding="md">
          <div className="flex items-center gap-2 pb-3 border-b border-gray-100 mb-4">
            <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
            <h2 className="text-lg font-semibold text-gray-900">Year-End Cleanup</h2>
          </div>
          <div className="space-y-3">
            <p className="text-sm text-gray-500">
              Permanently delete all collections and withdrawals for a given year.
              This action cannot be undone.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-end">
              <div className="w-full sm:w-48">
                <label className="block text-xs font-medium text-gray-600 mb-1.5">Select Year</label>
                <select
                  value={cleanupYear}
                  onChange={e => { setCleanupYear(e.target.value); setCleanupCount(null) }}
                  className="input-field"
                  disabled={cleanupLoading}
                >
                  <option value="">Choose...</option>
                  {Array.from({ length: 10 }, (_, i) => new Date().getFullYear() - i).map(y => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
              </div>
              <Button
                onClick={handleCleanupPreview}
                disabled={!cleanupYear || cleanupLoading}
                variant="danger"
                size="sm"
              >
                {cleanupLoading ? 'Checking...' : 'Check & Delete'}
              </Button>
            </div>
            {cleanupCount && (
              <div className="text-sm text-gray-600">
                {cleanupCount.collections > 0 || cleanupCount.withdrawals > 0 ? (
                  <span>
                    Found <strong>{cleanupCount.collections}</strong> collections and{' '}
                    <strong>{cleanupCount.withdrawals}</strong> withdrawals for {cleanupYear}.
                  </span>
                ) : (
                  <span className="text-gray-400">No entries for {cleanupYear}.</span>
                )}
              </div>
            )}
          </div>
        </Card>
      </div>

      <ConfirmModal
        open={showCleanupConfirm}
        title={`Delete All ${cleanupYear} Data`}
        message={`Are you sure you want to permanently delete ${cleanupCount?.collections ?? 0} collections and ${cleanupCount?.withdrawals ?? 0} withdrawals for the year ${cleanupYear}? This cannot be undone.`}
        confirmLabel="Delete All"
        onConfirm={handleCleanupConfirm}
        onCancel={() => { setShowCleanupConfirm(false); setCleanupCount(null) }}
        loading={cleanupLoading}
      />
    </DashboardLayout>
  )
}
