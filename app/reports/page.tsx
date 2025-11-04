'use client'

import { useState, useEffect } from 'react'
import DashboardLayout from '../dashboard-layout'
import { CashCollectionEntry, Party } from '../../lib/supabaseClient'
import { 
  getAllEntries, 
  getAllParties, 
  getFilteredEntries,
  getTotalCollectionForDate
} from '../../lib/cashCollectionService'

export default function ReportsPage() {
  const [entries, setEntries] = useState<CashCollectionEntry[]>([])
  const [parties, setParties] = useState<Party[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  // Filter state
  const [filterDate, setFilterDate] = useState('')
  const [filterAccountNo, setFilterAccountNo] = useState('')
  
  // Report data
  const [totalCollection, setTotalCollection] = useState(0)
  const [partyCollections, setPartyCollections] = useState<{name: string, amount: number}[]>([])

  // Load data on component mount
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
      
      // Calculate total collection for today
      const today = new Date().toISOString().split('T')[0]
      const total = await getTotalCollectionForDate(today)
      setTotalCollection(total)
      
      // Calculate collections by party
      calculatePartyCollections(entriesData, partiesData)
    } catch (err) {
      setError('Failed to load data')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const calculatePartyCollections = (entriesData: CashCollectionEntry[], partiesData: Party[]) => {
    // Create a map of account numbers to party names
    const partyMap = new Map<string, string>()
    partiesData.forEach(party => {
      partyMap.set(party.account_no, party.name)
    })
    
    // Calculate total collections by party
    const collectionsMap = new Map<string, number>()
    entriesData.forEach(entry => {
      const currentAmount = collectionsMap.get(entry.account_no) || 0
      collectionsMap.set(entry.account_no, currentAmount + entry.amount)
    })
    
    // Convert to array format
    const partyCollectionsData = Array.from(collectionsMap.entries()).map(([accountNo, amount]) => ({
      name: partyMap.get(accountNo) || `Unknown (${accountNo})`,
      amount
    }))
    
    setPartyCollections(partyCollectionsData)
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
      
      // Recalculate party collections based on filtered data
      calculatePartyCollections(data, parties)
    } catch (err) {
      setError('Failed to filter entries')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const clearFilters = async () => {
    setFilterDate('')
    setFilterAccountNo('')
    loadData()
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-GB') // dd/mm/yyyy format
  }

  return (
    <DashboardLayout>
      <div className="max-w-6xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-800">Reports & Analytics</h1>
          <p className="text-gray-600">Detailed insights into your cash collections</p>
        </div>
        
        {error && (
          <div className="bg-red-50 text-red-700 p-4 rounded-lg mb-6 shadow-md flex items-center">
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {error}
          </div>
        )}
        
        {/* Summary Cards */}
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
                  <p className="text-gray-500 text-sm">Total Collection</p>
                  <p className="text-xl font-bold text-gray-800">
                    Rs. {totalCollection.toFixed(2)}
                  </p>
                  <p className="text-gray-500 text-sm mt-1">
                    {filterDate ? `For ${formatDate(filterDate)}` : 'Today'}
                  </p>
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
                  <p className="text-xl font-bold text-gray-800">
                    {parties.length}
                  </p>
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
                  <p className="text-xl font-bold text-gray-800">
                    {entries.length}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Filter Section */}
        <div className="card mb-6">
          <div className="p-4 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-800 flex items-center">
              <svg className="w-5 h-5 mr-2 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
              </svg>
              Filter Data
            </h2>
          </div>
          <div className="p-4">
            <form onSubmit={handleFilter} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
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
                  placeholder="Enter 3-digit account no"
                />
              </div>
              
              <div className="flex items-end space-x-2">
                <button
                  type="submit"
                  className="btn-primary flex items-center w-full sm:w-auto justify-center"
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
                  className="btn-secondary flex items-center w-full sm:w-auto justify-center"
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
        
        {/* Party Collections Report */}
        <div className="card mb-6">
          <div className="p-4 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-800 flex items-center">
              <svg className="w-5 h-5 mr-2 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              Collections by Party
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Party Name</th>
                  <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total Collection</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {partyCollections.length === 0 ? (
                  <tr>
                    <td colSpan={2} className="px-4 py-4 text-center text-gray-500">
                      <div className="flex flex-col items-center justify-center py-4">
                        <svg className="w-10 h-10 text-gray-400 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <p className="text-gray-500">No data available</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  partyCollections.map((party, index) => (
                    <tr key={index} className="hover:bg-gray-50 transition-colors duration-200">
                      <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                        <div className="flex items-center">
                          <div className="bg-gray-200 border-2 border-dashed rounded-xl w-6 h-6 mr-2" />
                          <div>{party.name}</div>
                        </div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                        <span className="font-bold text-green-600">Rs. {party.amount.toFixed(2)}</span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
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
            <div className="text-sm text-gray-500">
              Showing {entries.length} entries
            </div>
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
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {loading ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-4 text-center text-gray-500">
                      <div className="flex justify-center items-center py-4">
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-600 mr-2"></div>
                        <span>Loading data...</span>
                      </div>
                    </td>
                  </tr>
                ) : entries.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-4 text-center text-gray-500">
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