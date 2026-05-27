'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import * as XLSX from 'xlsx'
import DashboardLayout from '../dashboard-layout'
import { supabase, type CashCollectionEntry, type Party, type Withdrawal } from '../../lib/supabaseClient'
import { useToast } from '../../lib/hooks/useToast'
import { Card } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { StatsCard } from '../../components/ui/StatsCard'
import { Spinner } from '../../components/ui/Spinner'
import { EmptyState } from '../../components/ui/EmptyState'
import { exportForSelf, exportForBank } from '../../lib/cashCollectionService'

export default function ReportsPage() {
  const [entries, setEntries] = useState<CashCollectionEntry[]>([])
  const [parties, setParties] = useState<Party[]>([])
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([])
  const [loading, setLoading] = useState(true)
  const [filterDate, setFilterDate] = useState('')
  const [filterAccount, setFilterAccount] = useState('')
  const { addToast } = useToast()

  const loadData = useCallback(async () => {
    try {
      setLoading(true)
      const [ed, pd, wd] = await Promise.all([
        supabase.from('cash_collections').select('*').order('date', { ascending: false }),
        supabase.from('parties').select('*').order('name', { ascending: true }),
        supabase.from('withdrawals').select('*').order('date', { ascending: false }),
      ])
      setEntries(ed.data || [])
      setParties(pd.data || [])
      setWithdrawals(wd.data || [])
    } catch {
      addToast('Failed to load report data', 'error')
    } finally {
      setLoading(false)
    }
  }, [addToast])

  useEffect(() => { loadData() }, [loadData])

  const handleFilter = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      setLoading(true)
      let eq = supabase.from('cash_collections').select('*').order('date', { ascending: false })
      if (filterDate) eq = eq.eq('date', filterDate)
      if (filterAccount) eq = eq.eq('account_no', filterAccount)
      const { data } = await eq
      setEntries(data || [])
    } catch {
      addToast('Failed to filter', 'error')
    } finally {
      setLoading(false)
    }
  }

  const totalCollection = useMemo(() => entries.reduce((s, e) => s + e.amount, 0), [entries])
  const totalWithdrawal = useMemo(() => withdrawals.reduce((s, w) => s + w.amount, 0), [withdrawals])

  const partyCollections = useMemo(() => {
    const map = new Map<string, number>()
    entries.forEach(e => map.set(e.account_no, (map.get(e.account_no) || 0) + e.amount))
    const pmap = new Map(parties.map(p => [p.account_no, p.name]))
    return Array.from(map.entries()).map(([ac, amt]) => ({ name: pmap.get(ac) || `Unknown (${ac})`, amount: amt }))
  }, [entries, parties])

  const exportSelf = async () => {
    const data = await exportForSelf(entries, parties, withdrawals)
    const ws = XLSX.utils.json_to_sheet(data)
    ws['!cols'] = [{ wch: 8 }, { wch: 12 }, { wch: 25 }, { wch: 12 }, { wch: 12 }, { wch: 15 }, { wch: 12 }]
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Personal Report')
    XLSX.writeFile(wb, 'For Self.xlsx')
    addToast('Personal report exported', 'success')
  }

  const exportBank = async () => {
    const exportData = await exportForBank(entries, parties, withdrawals)
    const totalCredit = entries.reduce((s, e) => s + e.amount, 0)
    const totalDebit = withdrawals.reduce((s, w) => s + w.amount, 0)
    const uniqueAcc = new Set(entries.map(e => e.account_no)).size
    const netBal = totalCredit - totalDebit

    const row = () => ({ 'Transaction Date': '', 'Account Number': '', 'Particulars': '', 'Credit (Rs.)': '', 'Debit (Rs.)': '', 'Balance (Rs.)': '' })

    const header = [
      { ...row(), 'Transaction Date': 'CASH COLLECTION STATEMENT' },
      { ...row(), 'Transaction Date': '' },
      { ...row(), 'Transaction Date': `Generated: ${new Date().toLocaleDateString('en-GB')}` },
      { ...row(), 'Transaction Date': '' },
    ]

    const footer = [
      { ...row(), 'Particulars': 'TOTAL CREDIT', 'Credit (Rs.)': totalCredit.toFixed(2) },
      { ...row(), 'Particulars': 'TOTAL DEBITS', 'Debit (Rs.)': totalDebit.toFixed(2) },
      { ...row(), 'Particulars': 'NET BALANCE', 'Balance (Rs.)': netBal.toFixed(2) },
      { ...row() },
      { ...row(), 'Transaction Date': 'SUMMARY' },
      { ...row(), 'Transaction Date': `Collections: ${entries.length}` },
      { ...row(), 'Transaction Date': `Withdrawals: ${withdrawals.length}` },
      { ...row(), 'Transaction Date': `Net Cash in Hand: Rs. ${netBal.toFixed(2)}` },
      { ...row(), 'Transaction Date': `Unique Accounts: ${uniqueAcc}` },
    ]

    const ws = XLSX.utils.json_to_sheet([...header, ...exportData, ...footer], { skipHeader: false })
    ws['!cols'] = [{ wch: 15 }, { wch: 12 }, { wch: 35 }, { wch: 15 }, { wch: 15 }, { wch: 15 }]
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Bank Statement')
    XLSX.writeFile(wb, 'For Bank.xlsx')
    addToast('Bank report exported', 'success')
  }

  const formatDate = (d: string) => new Date(d).toLocaleDateString('en-GB')

  if (loading) return <DashboardLayout><Spinner /></DashboardLayout>

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
          <form onSubmit={handleFilter} className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <input type="date" value={filterDate} onChange={e => setFilterDate(e.target.value)} className="input-field" />
            <input type="text" value={filterAccount} onChange={e => setFilterAccount(e.target.value)} maxLength={3} className="input-field" placeholder="Account no..." />
            <div className="flex gap-2">
              <Button type="submit" variant="primary" className="flex-1">Apply</Button>
              <Button type="button" variant="secondary" className="flex-1" onClick={() => { setFilterDate(''); setFilterAccount(''); loadData() }}>Clear</Button>
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
            </div>
          )}
        </Card>
      </div>
    </DashboardLayout>
  )
}
