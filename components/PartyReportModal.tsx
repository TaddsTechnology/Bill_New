'use client'

import { useState, useMemo, useEffect, useRef, useCallback } from 'react'
import { Modal } from './ui/Modal'
import { Button } from './ui/Button'
import { TableSkeleton } from './ui/TableSkeleton'
import { supabase } from '../lib/supabaseClient'
import { exportForParty, writeWorkbookToFile } from '../lib/cashCollectionService'
import type { Party, CashCollectionEntry, Withdrawal } from '../lib/supabaseClient'

type Props = {
  open: boolean
  onClose: () => void
  parties: Party[]
}

export function PartyReportModal({ open, onClose, parties }: Props) {
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<Party | null>(null)
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [loading, setLoading] = useState(false)
  const [allEntries, setAllEntries] = useState<CashCollectionEntry[]>([])
  const [allWithdrawals, setAllWithdrawals] = useState<Withdrawal[]>([])
  const [dataLoading, setDataLoading] = useState(false)
  const searchRef = useRef<HTMLInputElement>(null)

  const loadData = useCallback(async () => {
    if (!selected) return
    setDataLoading(true)
    try {
      const [ed, wd] = await Promise.all([
        supabase
          .from('cash_collections')
          .select('*')
          .eq('account_no', selected.account_no)
          .order('date', { ascending: false })
          .order('id', { ascending: false }),
        supabase
          .from('withdrawals')
          .select('*')
          .eq('account_no', selected.account_no)
          .order('date', { ascending: false })
          .order('id', { ascending: false }),
      ])
      setAllEntries(ed.data || [])
      setAllWithdrawals(wd.data || [])
    } catch {
      setAllEntries([])
      setAllWithdrawals([])
    } finally {
      setDataLoading(false)
    }
  }, [selected])

  useEffect(() => {
    if (open) {
      setSearch('')
      setSelected(null)
      setFromDate('')
      setToDate('')
      setAllEntries([])
      setAllWithdrawals([])
      setTimeout(() => searchRef.current?.focus(), 50)
    }
  }, [open])

  useEffect(() => {
    if (selected) loadData()
  }, [selected, loadData])

  const filteredParties = useMemo(() => {
    if (!search) return parties
    const s = search.toLowerCase()
    return parties.filter(p =>
      p.name.toLowerCase().includes(s) || p.account_no.includes(search)
    )
  }, [parties, search])

  const partyStats = useMemo(() => {
    if (!selected) return null
    const partyEntries = allEntries
    const partyWithdrawals = allWithdrawals
    const totalCollection = partyEntries.reduce((s, e) => s + e.amount, 0)
    const totalWithdrawal = partyWithdrawals.reduce((s, w) => s + w.amount, 0)
    const firstDate = partyEntries.length > 0
      ? partyEntries.reduce((min, e) => e.date < min ? e.date : min, partyEntries[0].date)
      : ''
    const lastDate = partyEntries.length > 0
      ? partyEntries.reduce((max, e) => e.date > max ? e.date : max, partyEntries[0].date)
      : ''
    return {
      totalCollection,
      totalWithdrawal,
      net: totalCollection - totalWithdrawal,
      entryCount: partyEntries.length,
      withdrawalCount: partyWithdrawals.length,
      firstDate,
      lastDate,
    }
  }, [selected, allEntries, allWithdrawals])

  const handleGenerate = async () => {
    if (!selected) return
    setLoading(true)
    try {
      const wb = await exportForParty(selected, allEntries, allWithdrawals, {
        fromDate: fromDate || undefined,
        toDate: toDate || undefined,
      })
      const safeName = selected.name.replace(/[^A-Za-z0-9]/g, '_')
      writeWorkbookToFile(wb, `Party_${safeName}_${selected.account_no}.xlsx`)
      onClose()
    } catch (e) {
      console.error('Failed to generate report', e)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Generate Party Report" size="lg">
      <div className="space-y-4">
        <p className="text-sm text-gray-500 -mt-1">
          Select a party to generate a detailed Excel ledger with monthly sheets.
        </p>

        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1.5">Search Party</label>
          <div className="relative">
            <input
              ref={searchRef}
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="input-field pr-10"
              placeholder="Type party name or account no..."
              autoComplete="off"
              disabled={loading}
            />
            <svg className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
        </div>

        {selected ? (
          <div className="rounded-xl border-2 border-blue-200 bg-blue-50/50 p-4 space-y-3">
            <div className="flex items-start justify-between gap-2">
              <div>
                <div className="text-xs font-medium text-blue-600 uppercase tracking-wider">Selected Party</div>
                <div className="text-base font-semibold text-gray-900 mt-0.5">{selected.name}</div>
                <div className="text-xs font-mono text-gray-500 mt-0.5">Account: {selected.account_no}</div>
              </div>
              <button
                type="button"
                onClick={() => setSelected(null)}
                disabled={loading}
                className="text-xs text-blue-600 hover:text-blue-800 font-medium disabled:opacity-50"
              >
                Change
              </button>
            </div>
            {dataLoading ? (
              <div className="py-2"><TableSkeleton rows={1} columns={3} /></div>
            ) : partyStats && (
              <div className="grid grid-cols-3 gap-2 pt-2 border-t border-blue-100">
                <div>
                  <div className="text-[10px] font-medium text-gray-500 uppercase">Collection</div>
                  <div className="text-sm font-semibold text-green-600">Rs. {partyStats.totalCollection.toFixed(2)}</div>
                </div>
                <div>
                  <div className="text-[10px] font-medium text-gray-500 uppercase">Withdrawal</div>
                  <div className="text-sm font-semibold text-red-600">Rs. {partyStats.totalWithdrawal.toFixed(2)}</div>
                </div>
                <div>
                  <div className="text-[10px] font-medium text-gray-500 uppercase">Net</div>
                  <div className={`text-sm font-semibold ${partyStats.net >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                    Rs. {partyStats.net.toFixed(2)}
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="border border-gray-200 rounded-xl overflow-hidden">
            {filteredParties.length === 0 ? (
              <div className="p-6 text-center text-sm text-gray-500">
                {search ? 'No parties match your search.' : 'No parties available.'}
              </div>
            ) : (
              <ul className="max-h-64 overflow-y-auto divide-y divide-gray-100">
                {filteredParties.slice(0, 50).map(p => (
                  <li key={p.id}>
                    <button
                      type="button"
                      onClick={() => setSelected(p)}
                      disabled={loading}
                      className="w-full text-left px-4 py-3 hover:bg-gray-50 active:bg-gray-100 transition-colors flex items-center justify-between gap-2 disabled:opacity-50"
                    >
                      <div className="min-w-0">
                        <div className="text-sm font-medium text-gray-900 truncate">{p.name}</div>
                        <div className="text-xs font-mono text-gray-500">Account: {p.account_no}</div>
                      </div>
                      <svg className="w-4 h-4 text-gray-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </button>
                  </li>
                ))}
              </ul>
            )}
            {filteredParties.length > 50 && (
              <div className="px-4 py-2 bg-gray-50 text-xs text-gray-500 text-center border-t border-gray-100">
                Showing 50 of {filteredParties.length} — refine your search to see more.
              </div>
            )}
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1.5">From Date (optional)</label>
            <input
              type="date"
              value={fromDate}
              onChange={e => setFromDate(e.target.value)}
              className="input-field"
              disabled={loading}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1.5">To Date (optional)</label>
            <input
              type="date"
              value={toDate}
              onChange={e => setToDate(e.target.value)}
              className="input-field"
              disabled={loading}
            />
          </div>
        </div>

        {loading && (
          <div className="space-y-2">
            <TableSkeleton rows={3} columns={4} />
            <p className="text-xs text-center text-gray-500">Generating report...</p>
          </div>
        )}

        <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-2 border-t border-gray-100">
          <Button type="button" variant="secondary" onClick={onClose} disabled={loading} className="w-full sm:w-auto">
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleGenerate}
            disabled={!selected || loading || dataLoading}
            className="w-full sm:w-auto"
          >
            {loading ? (
              <>
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
                </svg>
                Generating...
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                Generate Report
              </>
            )}
          </Button>
        </div>
      </div>
    </Modal>
  )
}
