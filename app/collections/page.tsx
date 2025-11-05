'use client'

import { useState, useEffect } from 'react'
import DashboardLayout from '../dashboard-layout'
import { CashCollectionEntry, Party } from '../../lib/supabaseClient'
import { 
  getAllEntries, 
  getAllParties, 
  deleteEntry,
  getFilteredEntries 
} from '../../lib/cashCollectionService'

export default function CollectionsPage() {
  const [entries, setEntries] = useState<CashCollectionEntry[]>([])
  const [parties, setParties] = useState<Party[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  
  // Filter state
  const [filterDate, setFilterDate] = useState('')
  const [filterAccountNo, setFilterAccountNo] = useState('')

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      setLoading(true)
      const [entriesData, partiesData] = await Promise.all([
        getAllEntries(),
        getAllParties()
      ])
      
      setEntries(entriesData)
      setParties(partiesData)
    } catch (err) {
      setError('Failed to load collections data')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this entry?')) return
    
    try {
      const result = await deleteEntry(id)
      if (result) {
        await loadData()
        setSuccess('Entry deleted successfully!')
        setTimeout(() => setSuccess(null), 3000)
      } else {
        setError('Failed to delete entry')
      }
    } catch (err) {
      setError('Failed to delete entry')
      console.error(err)
    }
  }

  const handleFilter = async (e: React.FormEvent) => {
    e.preventDefault()
    
    try {
      setLoading(true)
      const data = await getFilteredEntries(
        filterDate || null, 
        filterAccountNo || null
      )
      setEntries(data)
    } catch (err) {
      setError('Failed to filter entries')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const clearFilters = () => {
    setFilterDate('')
    setFilterAccountNo('')
    loadData()
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-GB')
  }

  const formatCurrency = (amount: number) => {
    return `Rs. ${amount.toFixed(2)}`
  }

  return (
    <DashboardLayout>
      <div className="w-full">
        <div className="mb-4 md:mb-6">
          <h1 className="text-xl md:text-3xl font-bold text-gray-800">Collections History</h1>
          <p className="text-sm md:text-base text-gray-600 mt-1">View and manage all cash collection entries</p>
        </div>
        
        {/* Success/Error Messages */}
        {success && (
          <div className="bg-green-50 text-green-700 p-3 md:p-4 rounded-lg mb-4 md:mb-6 flex items-center">
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {success}
          </div>
        )}
        {error && (
          <div className="bg-red-50 text-red-700 p-3 md:p-4 rounded-lg mb-4 md:mb-6 flex items-center">
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {error}
          </div>
        )}

        {/* Filter Section */}
        <div className="card mb-4 md:mb-6">
          <div className="p-3 md:p-4 border-b border-gray-200">
            <h2 className="text-lg md:text-xl font-semibold text-gray-800 flex items-center">
              <svg className="w-4 h-4 md:w-5 md:h-5 mr-2 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
              </svg>
              Filter Collections
            </h2>
          </div>
          <div className="p-3 md:p-4">
            <form onSubmit={handleFilter} className="space-y-4 md:space-y-0 md:grid md:grid-cols-2 lg:grid-cols-3 md:gap-4">
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
                  placeholder="Enter account no"
                />
              </div>
              
              <div className="md:col-span-2 lg:col-span-1 flex flex-col md:flex-row md:items-end md:space-x-2 space-y-2 md:space-y-0">
                <button
                  type="submit"
                  className="btn-primary w-full"
                >
                  Apply Filter
                </button>
                <button
                  type="button"
                  onClick={clearFilters}
                  className="btn-secondary w-full"
                >
                  Clear
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Collections Table */}
        <div className="card">
          <div className="p-3 md:p-4 border-b border-gray-200">
            <h2 className="text-lg md:text-xl font-semibold text-gray-800 flex items-center">
              <svg className="w-4 h-4 md:w-5 md:h-5 mr-2 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              All Collections ({entries.length})
            </h2>
          </div>
          
          <div className="overflow-x-auto mobile-table-container">
            <table className="min-w-full divide-y divide-gray-200 mobile-table">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-1 sm:px-4 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-16 sm:w-auto">Date</th>
                  <th scope="col" className="px-1 sm:px-4 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-20 sm:w-auto">Party</th>
                  <th scope="col" className="px-1 sm:px-4 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-16 sm:w-auto">Account</th>
                  <th scope="col" className="px-1 sm:px-4 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-16 sm:w-auto">Amount</th>
                  <th scope="col" className="px-1 sm:px-4 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-16 sm:w-auto">Collector</th>
                  <th scope="col" className="px-1 sm:px-4 py-2 sm:py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider w-12 sm:w-auto">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="px-2 md:px-4 py-4 text-center text-gray-500">
                      <div className="flex justify-center items-center py-4">
                        <div className="animate-spin rounded-full h-5 w-5 md:h-6 md:w-6 border-b-2 border-gray-600 mr-2"></div>
                        <span className="text-sm">Loading collections...</span>
                      </div>
                    </td>
                  </tr>
                ) : entries.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-2 md:px-4 py-4 text-center text-gray-500">
                      <div className="flex flex-col items-center justify-center py-4">
                        <svg className="w-10 h-10 text-gray-400 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <p className="text-gray-500">No collections found</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  entries.map((entry) => {
                    const party = parties.find(p => p.account_no === entry.account_no)
                    return (
                      <tr key={entry.id} className="hover:bg-gray-50 transition-colors duration-200">
                        <td className="px-1 sm:px-4 py-2 sm:py-3 text-xs text-gray-900 truncate">
                          {formatDate(entry.date)}
                        </td>
                        <td className="px-1 sm:px-4 py-2 sm:py-3">
                          <div className="text-xs font-medium text-gray-900 truncate max-w-20">
                            {party ? party.name : 'Unknown'}
                          </div>
                        </td>
                        <td className="px-1 sm:px-4 py-2 sm:py-3">
                          <span className="text-xs font-mono">{entry.account_no}</span>
                        </td>
                        <td className="px-1 sm:px-4 py-2 sm:py-3 text-xs font-bold text-green-600">
                          {formatCurrency(entry.amount)}
                        </td>
                        <td className="px-1 sm:px-4 py-2 sm:py-3">
                          <span className="text-xs truncate">{entry.collector}</span>
                        </td>
                        <td className="px-1 sm:px-4 py-2 sm:py-3 text-right">
                          <button
                            onClick={() => handleDelete(entry.id!)}
                            className="text-red-600 hover:text-red-900 p-1 rounded-lg hover:bg-red-50 transition-colors duration-300"
                            title="Delete entry"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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