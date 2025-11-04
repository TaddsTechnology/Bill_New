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
  const [showPartyForm, setShowPartyForm] = useState<boolean>(false)
  const [newPartyName, setNewPartyName] = useState<string>('')
  const [newPartyAccountNo, setNewPartyAccountNo] = useState<string>('')
  
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
  const handlePartySelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedParty = parties.find(party => party.account_no === e.target.value)
    if (selectedParty) {
      setAccountNo(selectedParty.account_no)
      setPartyName(selectedParty.name)
    }
  }

  // Handle adding a new party
  const handleAddParty = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Validate inputs
    if (!newPartyName || !newPartyAccountNo) {
      setError('Please fill all party fields')
      return
    }
    
    // Validate account number (should be 3 digits)
    if (newPartyAccountNo.length !== 3 || isNaN(Number(newPartyAccountNo))) {
      setError('Account No must be a 3-digit number')
      return
    }
    
    try {
      const newParty = {
        name: newPartyName,
        account_no: newPartyAccountNo
      }
      
      const result = await addParty(newParty)
      if (result) {
        // Reset form
        setNewPartyName('')
        setNewPartyAccountNo('')
        setShowPartyForm(false)
        
        // Reload parties
        await loadParties()
        setError(null)
        setSuccess('Party added successfully!')
        setTimeout(() => setSuccess(null), 3000)
      } else {
        setError('Failed to add party')
      }
    } catch (err) {
      setError('Failed to add party. Please check your Supabase configuration.')
      console.error(err)
    }
  }

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
      <div className="max-w-6xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-800">Daily Cash Collection</h1>
          <p className="text-gray-600">Manage and track your daily cash collections</p>
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
        
        {/* Success/Error Messages */}
        {success && (
          <div className="bg-green-50 text-green-700 p-4 rounded-lg mb-6 shadow-md flex items-center">
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {success}
          </div>
        )}
        {error && (
          <div className="bg-red-50 text-red-700 p-4 rounded-lg mb-6 shadow-md flex items-center">
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {error}
          </div>
        )}
        
        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
          <div className="card">
            <div className="p-4">
              <div className="flex items-center">
                <div className="p-3 rounded-lg bg-indigo-100 text-indigo-600 mr-4">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <p className="text-gray-500 text-sm">Today&apos;s Collection</p>
                  <p className="text-xl font-bold text-gray-800">Rs. {totalCollection.toFixed(2)}</p>
                </div>
              </div>
            </div>
          </div>
          
          <div className="card">
            <div className="p-4">
              <div className="flex items-center">
                <div className="p-3 rounded-lg bg-green-100 text-green-600 mr-4">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </div>
                <div>
                  <p className="text-gray-500 text-sm">Total Parties</p>
                  <p className="text-xl font-bold text-gray-800">{parties.length}</p>
                </div>
              </div>
            </div>
          </div>
          
          <div className="card">
            <div className="p-4">
              <div className="flex items-center">
                <div className="p-3 rounded-lg bg-blue-100 text-blue-600 mr-4">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                </div>
                <div>
                  <p className="text-gray-500 text-sm">Total Entries</p>
                  <p className="text-xl font-bold text-gray-800">{entries.length}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Add Entry Form */}
        <div className="card mb-6">
          <div className="p-4 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-800 flex items-center">
              <svg className="w-5 h-5 mr-2 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v3m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Add New Entry
            </h2>
          </div>
          <div className="p-4">
            <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
              
              <div>
                <label htmlFor="party" className="block text-sm font-medium text-gray-700 mb-1">
                  Select Party
                </label>
                <div className="flex gap-2">
                  <select
                    id="party"
                    onChange={handlePartySelect}
                    className="flex-1 input-field"
                    disabled={supabaseError ? true : false}
                  >
                    <option value="">Select a party</option>
                    {parties.map((party) => (
                      <option key={party.id} value={party.account_no}>
                        {party.name} ({party.account_no})
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => setShowPartyForm(!showPartyForm)}
                    className="bg-indigo-100 text-indigo-700 p-2 rounded-lg hover:bg-indigo-200 transition-colors duration-300"
                    title="Add new party"
                    disabled={supabaseError ? true : false}
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </button>
                </div>
              </div>
              
              {showPartyForm && (
                <div className="md:col-span-2 bg-indigo-50 p-4 rounded-lg">
                  <h3 className="text-md font-medium text-indigo-800 mb-3 flex items-center">
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v3m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Add New Party
                  </h3>
                  <form onSubmit={handleAddParty} className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label htmlFor="newPartyName" className="block text-sm font-medium text-gray-700 mb-1">
                        Party Name
                      </label>
                      <input
                        type="text"
                        id="newPartyName"
                        value={newPartyName}
                        onChange={(e) => setNewPartyName(e.target.value)}
                        className="input-field"
                        placeholder="Enter party name"
                        required
                        disabled={supabaseError ? true : false}
                      />
                    </div>
                    
                    <div>
                      <label htmlFor="newPartyAccountNo" className="block text-sm font-medium text-gray-700 mb-1">
                        Account No (3 digits)
                      </label>
                      <input
                        type="text"
                        id="newPartyAccountNo"
                        value={newPartyAccountNo}
                        onChange={(e) => setNewPartyAccountNo(e.target.value)}
                        maxLength={3}
                        className="input-field"
                        placeholder="123"
                        required
                        disabled={supabaseError ? true : false}
                      />
                    </div>
                    
                    <div className="flex items-end">
                      <button
                        type="submit"
                        className={`w-full py-2 px-4 rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-2 transition-colors duration-300 ${
                          supabaseError 
                            ? 'bg-gray-400 cursor-not-allowed' 
                            : 'bg-indigo-600 text-white hover:bg-indigo-700 focus:ring-indigo-500'
                        }`}
                        disabled={supabaseError ? true : false}
                      >
                        Add Party
                      </button>
                    </div>
                  </form>
                </div>
              )}
              
              <div>
                <label htmlFor="accountNo" className="block text-sm font-medium text-gray-700 mb-1">
                  Account No (Auto-filled)
                </label>
                <input
                  type="text"
                  id="accountNo"
                  value={accountNo}
                  readOnly
                  className="input-field bg-gray-100"
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
                  className="input-field bg-gray-100"
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
              
              <div className="md:col-span-2 flex justify-end">
                <button
                  type="submit"
                  className={`py-2 px-6 rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-2 transition-colors duration-300 flex items-center ${
                    supabaseError 
                      ? 'bg-gray-400 cursor-not-allowed' 
                      : 'bg-indigo-600 text-white hover:bg-indigo-700 focus:ring-indigo-500'
                  }`}
                  disabled={supabaseError ? true : false}
                >
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  Add Entry
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Party Report Section */}
        <div className="card mb-6">
          <div className="p-4 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-800 flex items-center">
              <svg className="w-5 h-5 mr-2 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              Party Report
            </h2>
          </div>
          <div className="p-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="reportParty" className="block text-sm font-medium text-gray-700 mb-1">
                  Select Party for Report
                </label>
                <select
                  id="reportParty"
                  onChange={(e) => generatePartyReport(e.target.value)}
                  className="input-field"
                  disabled={supabaseError ? true : false}
                >
                  <option value="">Select a party</option>
                  {parties.map((party) => (
                    <option key={`report-${party.id}`} value={party.account_no}>
                      {party.name} ({party.account_no})
                    </option>
                  ))}
                </select>
              </div>
              
              {partyReport && (
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-4 rounded-lg border border-blue-200">
                  <h3 className="text-md font-medium text-gray-800 mb-2">
                    Today&apos;s Collection for {partyReport.name}
                  </h3>
                  <p className="text-xl font-bold text-blue-600">
                    Rs. {partyReport.amount.toFixed(2)}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Filter Records Section */}
        <div className="card mb-6">
          <div className="p-4 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-800 flex items-center">
              <svg className="w-5 h-5 mr-2 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
              </svg>
              Filter Records
            </h2>
          </div>
          <div className="p-4">
            <form onSubmit={handleFilter} className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label htmlFor="filterDate" className="block text-sm font-medium text-gray-700 mb-1">
                  Filter by Date
                </label>
                <input
                  type="date"
                  id="filterDate"
                  value={filterDate}
                  onChange={(e) => setFilterDate(e.target.value)}
                  className="input-field"
                  disabled={supabaseError ? true : false}
                />
              </div>
              
              <div>
                <label htmlFor="filterAccountNo" className="block text-sm font-medium text-gray-700 mb-1">
                  Filter by Account No
                </label>
                <input
                  type="text"
                  id="filterAccountNo"
                  value={filterAccountNo}
                  onChange={(e) => setFilterAccountNo(e.target.value)}
                  maxLength={3}
                  className="input-field"
                  placeholder="Enter 3-digit account no"
                  disabled={supabaseError ? true : false}
                />
              </div>
              
              <div className="flex items-end space-x-2">
                <button
                  type="submit"
                  className={`py-2 px-4 rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-2 transition-colors duration-300 flex items-center ${
                    supabaseError 
                      ? 'bg-gray-400 cursor-not-allowed' 
                      : 'bg-indigo-600 text-white hover:bg-indigo-700 focus:ring-indigo-500'
                  }`}
                  disabled={supabaseError ? true : false}
                >
                  <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                  </svg>
                  <span className="hidden sm:inline">Apply</span>
                  <span className="sm:hidden">Filter</span>
                </button>
                <button
                  type="button"
                  onClick={clearFilters}
                  className="py-2 px-4 rounded-lg bg-gray-200 text-gray-800 hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 transition-colors duration-300 flex items-center"
                  disabled={supabaseError ? true : false}
                >
                  <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  <span className="hidden sm:inline">Clear</span>
                  <span className="sm:hidden">Clear</span>
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Entries Table */}
        <div className="card">
          <div className="p-4 border-b border-gray-200 flex flex-col sm:flex-row sm:items-center sm:justify-between">
            <h2 className="text-xl font-semibold text-gray-800 flex items-center mb-3 sm:mb-0">
              <svg className="w-5 h-5 mr-2 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
              Collection Entries
            </h2>
            <button
              onClick={exportToExcel}
              disabled={entries.length === 0 || supabaseError ? true : false}
              className={`py-2 px-4 rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-2 transition-colors duration-300 flex items-center ${
                entries.length === 0 || supabaseError
                  ? 'bg-gray-400 cursor-not-allowed' 
                  : 'bg-green-600 text-white hover:bg-green-700 focus:ring-green-500'
              }`}
            >
              <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              <span className="hidden sm:inline">Export to Excel</span>
              <span className="sm:hidden">Export</span>
            </button>
          </div>
          
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                  <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Party</th>
                  <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Account</th>
                  <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                  <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Collector</th>
                  <th scope="col" className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-4 text-center text-gray-500">
                      <div className="flex justify-center items-center py-4">
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-600 mr-2"></div>
                        <span>Loading data...</span>
                      </div>
                    </td>
                  </tr>
                ) : entries.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-4 text-center text-gray-500">
                      <div className="flex flex-col items-center justify-center py-4">
                        <svg className="w-10 h-10 text-gray-400 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <p className="text-gray-500">No data for this filter</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  entries.map((entry) => {
                    const party = parties.find(p => p.account_no === entry.account_no)
                    return (
                      <tr key={entry.id} className="hover:bg-gray-50 transition-colors duration-200">
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                          <div className="flex items-center">
                            <div className="bg-indigo-100 p-1 rounded mr-2">
                              <svg className="w-4 h-4 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                              </svg>
                            </div>
                            <div className="font-medium text-gray-900">{formatDate(entry.date)}</div>
                          </div>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                          <div className="flex items-center">
                            <div className="bg-gray-200 border-2 border-dashed rounded-xl w-6 h-6 mr-2" />
                            <div>
                              <div className="font-medium text-gray-900">{party ? party.name : 'Unknown'}</div>
                              <div className="text-gray-500 text-xs">{entry.account_no}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                          <span className="badge badge-primary text-xs">{entry.account_no}</span>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                          <span className="font-bold text-green-600">Rs. {entry.amount.toFixed(2)}</span>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                          <span className="badge badge-success text-xs">{entry.collector}</span>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-right text-sm font-medium">
                          <button
                            onClick={() => handleDelete(entry.id!)}
                            className="text-red-600 hover:text-red-900 p-1 rounded hover:bg-red-50 transition-colors duration-300"
                            disabled={supabaseError ? true : false}
                            title="Delete entry"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}