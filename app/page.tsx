'use client'

import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import DashboardLayout from './dashboard-layout'
import { supabase } from '../lib/supabaseClient'
import { useCollections } from '../lib/hooks/useCollections'
import { useParties } from '../lib/hooks/useParties'
import { useServerInfiniteScroll } from '../lib/hooks/useInfiniteScroll'
import { Card } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { StatsCard } from '../components/ui/StatsCard'
import { Spinner } from '../components/ui/Spinner'
import { EmptyState } from '../components/ui/EmptyState'
import { TableSkeleton } from '../components/ui/TableSkeleton'
import { exportForSelf, writeWorkbookToFile } from '../lib/cashCollectionService'

const COLLECTORS = ['Kalpesh', 'Sanjay', 'Supan', 'Vipul']

export default function DailyCashCollectionDashboard() {
  const { addEntry, getTotalForDate } = useCollections()
  const { parties } = useParties()

  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0])
  const [accountNo, setAccountNo] = useState('')
  const [partyName, setPartyName] = useState('')
  const [amount, setAmount] = useState('')
  const [collector, setCollector] = useState(COLLECTORS[0])
  const [partySearch, setPartySearch] = useState('')
  const [showDropdown, setShowDropdown] = useState(false)
  const [totalToday, setTotalToday] = useState(0)
  const [partyTodayTotal, setPartyTodayTotal] = useState(0)
  const [adding, setAdding] = useState(false)
  const searchRef = useRef<HTMLInputElement>(null)
  const amountRef = useRef<HTMLInputElement>(null)

  const today = new Date().toISOString().split('T')[0]

  useEffect(() => {
    if (date) getTotalForDate(date).then(setTotalToday)
  }, [date, getTotalForDate])

  const todayFetcher = useCallback(async (offset: number, limit: number) => {
    const { data, error, count } = await supabase
      .from('cash_collections')
      .select('*', { count: 'exact' })
      .eq('date', today)
      .order('date', { ascending: false })
      .order('id', { ascending: false })
      .range(offset, offset + limit - 1)
    if (error) return { data: [], total: 0 }
    return { data: data || [], total: count }
  }, [today])

  const { items: todayEntries, isLoading: todayLoading, hasMore, sentinelRef, reload } = useServerInfiniteScroll(todayFetcher, [todayFetcher])

  const filteredParties = useMemo(() => {
    if (!partySearch) return []
    const s = partySearch.toLowerCase()
    return parties.filter(p =>
      p.name.toLowerCase().includes(s) || p.account_no.includes(partySearch)
    )
  }, [parties, partySearch])

  const handlePartySelect = async (party: typeof parties[0]) => {
    setAccountNo(party.account_no)
    setPartyName(party.name)
    setPartySearch(`${party.name} (${party.account_no})`)
    setShowDropdown(false)
    const { data } = await supabase
      .from('cash_collections')
      .select('amount')
      .eq('date', today)
      .eq('account_no', party.account_no)
    setPartyTodayTotal((data || []).reduce((s, e) => s + e.amount, 0))
    setTimeout(() => amountRef.current?.focus(), 0)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!date || !accountNo || !amount) return
    if (accountNo.length !== 3 || isNaN(Number(accountNo))) return
    const amt = parseFloat(amount)
    if (isNaN(amt) || amt <= 0) return

    setAdding(true)
    const result = await addEntry({ date, account_no: accountNo, amount: amt, collector })
    if (result) {
      reload()
      setAmount('')
      setAccountNo('')
      setPartyName('')
      setPartySearch('')
      setPartyTodayTotal(0)
      if (date === today) {
        const t = await getTotalForDate(date)
        setTotalToday(t)
      }
      setTimeout(() => searchRef.current?.focus(), 0)
    }
    setAdding(false)
  }

  const handleExport = async () => {
    const { data } = await supabase
      .from('cash_collections')
      .select('*')
      .eq('date', today)
    const wb = await exportForSelf(data || [], parties, undefined, { fromDate: today, toDate: today })
    writeWorkbookToFile(wb, `DSS_${today}.xlsx`)
  }

  if (todayLoading) return <DashboardLayout><Spinner /></DashboardLayout>

  return (
    <DashboardLayout>
      <div className="w-full space-y-5 animate-fade-in">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 tracking-tight">Collections</h1>
          <p className="text-sm text-gray-500 mt-1">Record today&apos;s cash collections</p>
        </div>

        <StatsCard
          label="Today's Collection"
          value={`Rs. ${totalToday.toFixed(2)}`}
          color="green"
          sub={new Date().toLocaleDateString('en-GB', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          icon={
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
        />

        <Card padding="md">
          <div className="flex items-center gap-2 pb-3 border-b border-gray-100 mb-4">
            <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v3m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <h2 className="text-lg font-semibold text-gray-900">New Entry</h2>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="date" className="block text-xs font-medium text-gray-600 mb-1.5">Date</label>
                <input type="date" id="date" value={date} onChange={e => setDate(e.target.value)} className="input-field" required />
              </div>
              <div>
                <label htmlFor="collector" className="block text-xs font-medium text-gray-600 mb-1.5">Collector</label>
                <select id="collector" value={collector} onChange={e => setCollector(e.target.value)} className="input-field">
                  {COLLECTORS.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            </div>

            <div>
              <label htmlFor="party" className="block text-xs font-medium text-gray-600 mb-1.5">Search Party</label>
              <div className="relative">
                <input
                  ref={searchRef}
                  type="text" id="party" value={partySearch}
                  onChange={e => { setPartySearch(e.target.value); setShowDropdown(true) }}
                  onFocus={() => setShowDropdown(true)}
                  className="input-field pr-10"
                  placeholder="Type name or account number..."
                  autoComplete="off"
                />
                <svg className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>

                {showDropdown && partySearch && (
                  <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg max-h-60 overflow-y-auto animate-fade-in">
                    {filteredParties.length > 0 ? filteredParties.map(p => (
                      <button key={p.id} type="button"
                        onClick={() => handlePartySelect(p)}
                        className="w-full text-left px-4 py-2.5 hover:bg-gray-50 transition-colors border-b border-gray-50 last:border-0"
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

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="accountNo" className="block text-xs font-medium text-gray-600 mb-1.5">Account No</label>
                <input type="text" id="accountNo" value={accountNo} readOnly className="input-field bg-gray-50 text-gray-500 font-mono" placeholder="Auto-filled" />
              </div>
              <div>
                <label htmlFor="partyName" className="block text-xs font-medium text-gray-600 mb-1.5">Party Name</label>
                <input type="text" id="partyName" value={partyName} readOnly className="input-field bg-gray-50 text-gray-500" placeholder="Auto-filled" />
              </div>
              <div>
                <label htmlFor="amount" className="block text-xs font-medium text-gray-600 mb-1.5">Amount (Rs.)</label>
                <input ref={amountRef} type="number" id="amount" value={amount} onChange={e => setAmount(e.target.value)} step="0.01" min="0" className="input-field" placeholder="0.00" required />
              </div>
            </div>

            <div className="flex items-center justify-between pt-2">
              {accountNo && partyName && (
                <div className="flex items-center gap-2 px-3 py-2 bg-blue-50 rounded-xl border border-blue-100">
                  <svg className="w-4 h-4 text-blue-600 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                  </svg>
                  <div>
                    <p className="text-xs text-blue-600 font-medium">Total from {partyName}</p>
                    <p className="text-lg font-bold text-green-700">Rs. {partyTodayTotal.toFixed(2)}</p>
                  </div>
                </div>
              )}
              <Button type="submit" loading={adding} size="lg" className="ml-auto">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                Add Entry
              </Button>
            </div>
          </form>
        </Card>

        <Card padding="md">
          <div className="flex items-center justify-between pb-3 border-b border-gray-100 mb-4">
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              <h2 className="text-lg font-semibold text-gray-900">Today&apos;s Entries</h2>
              <span className="badge badge-primary">{todayEntries.length}</span>
            </div>
            <Button variant="secondary" size="sm" onClick={handleExport}>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Export
            </Button>
          </div>

          {todayEntries.length === 0 ? (
            <EmptyState title="No entries today" message="Start by adding a collection entry above." />
          ) : (
            <div className="overflow-x-auto -mx-4 md:-mx-0">
              <table className="min-w-full">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">Party</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">Account</th>
                    <th className="text-right px-4 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">Amount</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">Collector</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {todayEntries.map(entry => {
                    const party = parties.find(p => p.account_no === entry.account_no)
                    return (
                      <tr key={entry.id} className="hover:bg-gray-50/50 transition-colors">
                        <td className="px-4 py-3 text-sm font-medium text-gray-900">{party?.name || 'Unknown'}</td>
                        <td className="px-4 py-3 text-sm font-mono text-gray-500">{entry.account_no}</td>
                        <td className="px-4 py-3 text-sm font-semibold text-green-600 text-right">Rs. {entry.amount.toFixed(2)}</td>
                        <td className="px-4 py-3 text-sm text-gray-600"><span className="badge badge-primary">{entry.collector}</span></td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
              {hasMore && (
                <div ref={sentinelRef} className="py-2">
                  <TableSkeleton rows={2} columns={4} />
                </div>
              )}
            </div>
          )}
        </Card>
      </div>
    </DashboardLayout>
  )
}
