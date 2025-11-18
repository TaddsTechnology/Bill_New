'use client'

import { useState, useEffect } from 'react'
import * as XLSX from 'xlsx'
import DashboardLayout from './dashboard-layout'
import { CashCollectionEntry, Party } from '../lib/supabaseClient'
import { 
  getAllEntries, 
  addEntry, 
  deleteEntry, 
  getFilteredEntries, 
  getTotalCollectionForDate,
  getAllParties,
  addParty,
  getTodaysCollectionsForParty,
  exportEntriesToExcel
} from '../lib/cashCollectionService'

export default function DailyCashCollectionDashboard() {
  // State for form inputs
  const [date, setDate] = useState<string>('')
  const [accountNo, setAccountNo] = useState<string>('')
  const [partyName, setPartyName] = useState<string>('')
  const [amount, setAmount] = useState<string>('')
  const [collector, setCollector] = useState<string>('Kalpesh')
  
  // State for party management
  const [parties, setParties] = useState<Party[]>([])
  const [partySearchTerm, setPartySearchTerm] = useState<string>('')
  const [showPartyDropdown, setShowPartyDropdown] = useState<boolean>(false)
  
  // State for filtering
  const [filterDate, setFilterDate] = useState<string>('')
  const [filterAccountNo, setFilterAccountNo] = useState<string>('')
  
  // State for data
  const [entries, setEntries] = useState<CashCollectionEntry[]>([])
  const [totalCollection, setTotalCollection] = useState<number>(0)
  const [partyReport, setPartyReport] = useState<{name: string, amount: number} | null>(null)
  
  // State for UI
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [supabaseError, setSupabaseError] = useState<string | null>(null)
  const [selectedPartyTotal, setSelectedPartyTotal] = useState<number>(0)

  // Load all entries and parties on component mount
  useEffect(() => {
    // Check if Supabase is properly configured
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    
    if (!supabaseUrl || supabaseUrl === 'your_actual_supabase_project_url_here' ||
        !supabaseAnonKey || supabaseAnonKey === 'your_actual_supabase_anon_key_here') {
      setSupabaseError('Supabase is not properly configured. Please check your .env.local file.')
      setLoading(false)
      return
    }
    
    loadEntries()
    loadParties()
    
    // Set today's date as default
    const today = new Date().toISOString().split('T')[0]
    setDate(today)
  }, [])

  // Load entries from database
  const loadEntries = async () => {
    try {
      setLoading(true)
      const data = await getAllEntries()
      setEntries(data)
      
      // Calculate total for today if no filter is applied
      const today = new Date().toISOString().split('T')[0]
      const total = await getTotalCollectionForDate(today)
      setTotalCollection(total)
    } catch (err) {
      setError('Failed to load entries. Please check your Supabase configuration.')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  // Load parties from database
  const loadParties = async () => {
    try {
      const data = await getAllParties()
      setParties(data)
    } catch (err) {
      setError('Failed to load parties. Please check your Supabase configuration.')
      console.error(err)
    }
  }

  // Handle form submission for adding entry
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Validate inputs
    if (!date || !accountNo || !amount || !collector) {
      setError('Please fill all fields')
      return
    }
    
    // Validate account number (should be 3 digits)
    if (accountNo.length !== 3 || isNaN(Number(accountNo))) {
      setError('Account No must be a 3-digit number')
      return
    }
    
    // Validate amount
    const amountValue = parseFloat(amount)
    if (isNaN(amountValue) || amountValue <= 0) {
      setError('Amount must be a positive number')
      return
    }
    
    try {
      const newEntry = {
        date,
        account_no: accountNo,
        amount: amountValue,
        collector
      }
      
      const result = await addEntry(newEntry)
      if (result) {
        // Reset form
        setAmount('')
        
        // Reload entries
        await loadEntries()
        
        // Update selected party total
        if (accountNo) {
          const updatedEntries = await getAllEntries()
          const total = updatedEntries
            .filter(entry => entry.account_no === accountNo)
            .reduce((sum, entry) => sum + entry.amount, 0)
          setSelectedPartyTotal(total)
        }
        
        setError(null)
        setSuccess('Entry added successfully!')
        setTimeout(() => setSuccess(null), 3000)
      } else {
        setError('Failed to add entry')
      }
    } catch (err) {
      setError('Failed to add entry. Please check your Supabase configuration.')
      console.error(err)
    }
  }

  // Handle party selection
  const handlePartySelect = (party: Party) => {
    setAccountNo(party.account_no)
    setPartyName(party.name)
    setPartySearchTerm(`${party.name} (${party.account_no})`)
    setShowPartyDropdown(false)
    
    // Calculate total collection for this party
    const total = entries
      .filter(entry => entry.account_no === party.account_no)
      .reduce((sum, entry) => sum + entry.amount, 0)
    setSelectedPartyTotal(total)
  }
  
  // Filter parties based on search term and exclude parties with today's payment
  const filteredParties = parties.filter(party => {
    const searchLower = partySearchTerm.toLowerCase()
    const matchesSearch = (
      party.name.toLowerCase().includes(searchLower) ||
      party.account_no.includes(partySearchTerm)
    )
    
    // Check if this party already has an entry for today
    const today = new Date().toISOString().split('T')[0]
    const hasPaymentToday = entries.some(
      entry => entry.account_no === party.account_no && entry.date === today
    )
    
    // Only show if matches search AND doesn't have payment today
    return matchesSearch && !hasPaymentToday
  })


  // Handle delete entry
  const handleDelete = async (id: number) => {
    try {
      const result = await deleteEntry(id)
      if (result) {
        // Reload entries
        await loadEntries()
        setError(null)
        setSuccess('Entry deleted successfully!')
        setTimeout(() => setSuccess(null), 3000)
      } else {
        setError('Failed to delete entry')
      }
    } catch (err) {
      setError('Failed to delete entry. Please check your Supabase configuration.')
      console.error(err)
    }
  }

  // Handle filter submission
  const handleFilter = async (e: React.FormEvent) => {
    e.preventDefault()
    
    try {
      setLoading(true)
      const data = await getFilteredEntries(
        filterDate || null, 
        filterAccountNo || null
      )
      setEntries(data)
      
      // Calculate total for the filtered date if date filter is applied
      if (filterDate) {
        const total = await getTotalCollectionForDate(filterDate)
        setTotalCollection(total)
      } else {
        // If no date filter, show total for today
        const today = new Date().toISOString().split('T')[0]
        const total = await getTotalCollectionForDate(today)
        setTotalCollection(total)
      }
    } catch (err) {
      setError('Failed to filter entries. Please check your Supabase configuration.')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  // Clear filters
  const clearFilters = async () => {
    setFilterDate('')
    setFilterAccountNo('')
    
    // Reload all entries
    await loadEntries()
  }

  // Generate party report
  const generatePartyReport = async (accountNo: string) => {
    try {
      const party = parties.find(p => p.account_no === accountNo)
      if (!party) {
        setError('Party not found')
        return
      }
      
      const amount = await getTodaysCollectionsForParty(accountNo)
      setPartyReport({ name: party.name, amount })
    } catch (err) {
      setError('Failed to generate party report. Please check your Supabase configuration.')
      console.error(err)
    }
  }

  // Export to Excel
  const exportToExcel = async () => {
    try {
      const exportData = await exportEntriesToExcel(entries, parties)
      
      // Create worksheet
      const ws = XLSX.utils.json_to_sheet(exportData)
      
      // Create workbook
      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, ws, 'Cash Collections')
      
      // Generate filename with current date
      const today = new Date().toISOString().split('T')[0]
      const filename = `Cash_Collections_${today}.xlsx`
      
      // Export to file
      XLSX.writeFile(wb, filename)
      
      setSuccess('Excel file exported successfully!')
      setTimeout(() => setSuccess(null), 3000)
    } catch (err) {
      setError('Failed to export Excel file. Please check your Supabase configuration.')
      console.error(err)
    }
  }

  // Format date for display
  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-GB') // dd/mm/yyyy format
  }

  return (
    <DashboardLayout>
      <div className="w-full">
        <div className="mb-4 md:mb-6">
          <h1 className="text-xl md:text-3xl font-bold text-gray-800">Daily Cash Collection</h1>
          <p className="text-sm md:text-base text-gray-600 mt-1">Manage and track your daily cash collections</p>
        </div>
        
        {/* Supabase Configuration Error */}
        {supabaseError && (
          <div className="bg-red-50 text-red-700 p-4 rounded-lg mb-6 shadow-md">
            <div className="flex items-center">
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <h2 className="text-lg font-bold">Configuration Error</h2>
            </div>
            <p className="mt-2">{supabaseError}</p>
            <p className="mt-2 text-sm">
              Please update your <code className="bg-gray-100 px-1 rounded">.env.local</code> file with your actual Supabase credentials.
            </p>
          </div>
        )}
        
        {/* Toast Notifications - Fixed position top-right */}
        {success && (
          <div className="fixed top-4 right-4 z-50 animate-slide-in">
            <div className="bg-green-500 text-white px-6 py-4 rounded-lg shadow-2xl flex items-center space-x-3 min-w-[300px]">
              <div className="flex-shrink-0">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="flex-1">
                <p className="font-semibold text-sm">{success}</p>
              </div>
              <button 
                onClick={() => setSuccess(null)}
                className="flex-shrink-0 hover:bg-green-600 rounded p-1 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        )}
        {error && (
          <div className="fixed top-4 right-4 z-50 animate-slide-in">
            <div className="bg-red-500 text-white px-6 py-4 rounded-lg shadow-2xl flex items-center space-x-3 min-w-[300px]">
              <div className="flex-shrink-0">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="flex-1">
                <p className="font-semibold text-sm">{error}</p>
              </div>
              <button 
                onClick={() => setError(null)}
                className="flex-shrink-0 hover:bg-red-600 rounded p-1 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        )}
        
        {/* Stats Card */}
        <div className="grid grid-cols-1 gap-3 md:gap-4 mb-4 md:mb-6">
          <div className="card">
            <div className="p-3 md:p-4">
              <div className="flex items-center">
                <div className="p-2 md:p-3 rounded-lg bg-gray-100 text-gray-700 mr-3 md:mr-4 flex-shrink-0">
                  <svg className="w-5 h-5 md:w-6 md:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-gray-500 text-xs md:text-sm truncate">Today&apos;s Collection</p>
                  <p className="text-lg md:text-xl font-bold text-gray-800 truncate">Rs. {totalCollection.toFixed(2)}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Add Entry Form */}
        <div className="card mb-4 md:mb-6">
          <div className="p-3 md:p-4 border-b border-gray-200">
            <h2 className="text-lg md:text-xl font-semibold text-gray-800 flex items-center">
              <svg className="w-4 h-4 md:w-5 md:h-5 mr-2 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v3m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Add New Entry
            </h2>
          </div>
          <div className="p-3 md:p-4">
            <form onSubmit={handleSubmit} className="space-y-4 md:space-y-0 md:grid md:grid-cols-2 md:gap-4">
              <div>
                <label htmlFor="date" className="block text-sm font-medium text-gray-700 mb-1">
                  Date
                </label>
                <input
                  type="date"
                  id="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="input-field"
                  required
                  disabled={supabaseError ? true : false}
                />
              </div>
              
              <div className="md:col-span-2">
                <label htmlFor="party" className="block text-sm font-medium text-gray-700 mb-1">
                  Search Party (Name or Account No)
                </label>
                <div className="flex flex-col gap-2">
                  <div className="relative">
                    <input
                      type="text"
                      id="party"
                      value={partySearchTerm}
                      onChange={(e) => {
                        setPartySearchTerm(e.target.value)
                        setShowPartyDropdown(true)
                      }}
                      onFocus={() => setShowPartyDropdown(true)}
                      className="flex-1 input-field pr-10"
                      placeholder="Type party name or account number..."
                      disabled={supabaseError ? true : false}
                      autoComplete="off"
                    />
                    <svg className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    
                    {/* Dropdown list */}
                    {showPartyDropdown && partySearchTerm && filteredParties.length > 0 && (
                      <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                        {filteredParties.map((party) => (
                          <button
                            key={party.id}
                            type="button"
                            onClick={() => handlePartySelect(party)}
                            className="w-full text-left px-4 py-2.5 hover:bg-gray-100 transition-colors duration-200 border-b border-gray-100 last:border-b-0"
                          >
                            <div className="font-medium text-gray-900 text-sm">{party.name}</div>
                            <div className="text-xs text-gray-500">Account No: {party.account_no}</div>
                          </button>
                        ))}
                      </div>
                    )}
                    
                    {/* No results message */}
                    {showPartyDropdown && partySearchTerm && filteredParties.length === 0 && (
                      <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg p-4">
                        <p className="text-sm text-gray-500 text-center">No party found</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
              
              <div>
                <label htmlFor="accountNo" className="block text-sm font-medium text-gray-700 mb-1">
                  Account No (Auto-filled)
                </label>
                <input
                  type="text"
                  id="accountNo"
                  value={accountNo}
                  readOnly
                  className="input-field bg-gray-100 text-gray-900 font-medium"
                  placeholder="Select a party"
                  disabled={supabaseError ? true : false}
                />
              </div>
              
              <div>
                <label htmlFor="partyName" className="block text-sm font-medium text-gray-700 mb-1">
                  Party Name (Auto-filled)
                </label>
                <input
                  type="text"
                  id="partyName"
                  value={partyName}
                  readOnly
                  className="input-field bg-gray-100 text-gray-900 font-medium"
                  placeholder="Select a party"
                  disabled={supabaseError ? true : false}
                />
              </div>
              
              <div>
                <label htmlFor="amount" className="block text-sm font-medium text-gray-700 mb-1">
                  Amount
                </label>
                <input
                  type="number"
                  id="amount"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  step="0.01"
                  min="0"
                  className="input-field"
                  placeholder="0.00"
                  required
                  disabled={supabaseError ? true : false}
                />
              </div>
              
              <div>
                <label htmlFor="collector" className="block text-sm font-medium text-gray-700 mb-1">
                  Collector
                </label>
                <select
                  id="collector"
                  value={collector}
                  onChange={(e) => setCollector(e.target.value)}
                  className="input-field"
                  disabled={supabaseError ? true : false}
                >
                  <option value="Kalpesh">Kalpesh</option>
                  <option value="Sanjay">Sanjay</option>
                  <option value="Supan">Supan</option>
                  <option value="Vipul">Vipul</option>
                </select>
              </div>
              
              <div className="md:col-span-2 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                {/* Party Total Collection Display */}
                {accountNo && partyName && (
                  <div className="flex items-center space-x-2 p-3 bg-blue-50 rounded-lg border border-blue-200">
                    <svg className="w-5 h-5 text-blue-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                    </svg>
                    <div className="flex-1">
                      <p className="text-xs text-blue-600 font-medium">Total from {partyName}</p>
                      <p className="text-lg font-bold text-blue-700">Rs. {selectedPartyTotal.toFixed(2)}</p>
                    </div>
                  </div>
                )}
                
                <button
                  type="submit"
                  className={`py-2.5 px-6 rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-2 transition-colors duration-300 flex items-center justify-center font-medium text-sm w-full md:w-auto ${
                    supabaseError 
                      ? 'bg-gray-400 cursor-not-allowed text-white' 
                      : 'bg-gray-900 text-white hover:bg-gray-800 focus:ring-gray-500'
                  }`}
                  disabled={supabaseError ? true : false}
                >
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  Add Entry
                </button>
              </div>
            </form>
          </div>
        </div>



      </div>
    </DashboardLayout>
  )
}