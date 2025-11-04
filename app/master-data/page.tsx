'use client'

import { useState, useEffect } from 'react'
import DashboardLayout from '../dashboard-layout'
import { Party } from '../../lib/supabaseClient'
import { getAllParties, addParty, deleteParty } from '../../lib/cashCollectionService'

export default function MasterDataPage() {
  const [parties, setParties] = useState<Party[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [supabaseError, setSupabaseError] = useState<string | null>(null)
  
  // Form state
  const [name, setName] = useState<string>('')
  const [accountNo, setAccountNo] = useState<string>('')

  // Load parties on component mount
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
    
    loadParties()
  }, [])

  const loadParties = async () => {
    try {
      setLoading(true)
      const data = await getAllParties()
      setParties(data)
    } catch (err) {
      setError('Failed to load parties. Please check your Supabase configuration.')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Validate inputs
    if (!name || !accountNo) {
      setError('Please fill all fields')
      return
    }
    
    // Validate account number (should be 3 digits)
    if (accountNo.length !== 3 || isNaN(Number(accountNo))) {
      setError('Account No must be a 3-digit number')
      return
    }
    
    try {
      const newParty = {
        name,
        account_no: accountNo
      }
      
      const result = await addParty(newParty)
      if (result) {
        // Reset form
        setName('')
        setAccountNo('')
        
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

  const handleDelete = async (id: number) => {
    try {
      const result = await deleteParty(id)
      if (result) {
        // Reload parties
        await loadParties()
        setError(null)
        setSuccess('Party deleted successfully!')
        setTimeout(() => setSuccess(null), 3000)
      } else {
        setError('Failed to delete party')
      }
    } catch (err) {
      setError('Failed to delete party. Please check your Supabase configuration.')
      console.error(err)
    }
  }

  return (
    <DashboardLayout>
      <div className="w-full">
        <div className="mb-4 md:mb-6 px-2 md:px-0">
          <h1 className="text-2xl md:text-3xl font-bold text-gray-800">Master Data</h1>
          <p className="text-sm md:text-base text-gray-600 mt-1">Manage parties and account information</p>
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
        
        {/* Add Party Form */}
        <div className="card mb-4 md:mb-6">
          <div className="p-3 md:p-4 border-b border-gray-200">
            <h2 className="text-lg md:text-xl font-semibold text-gray-800 flex items-center">
              <svg className="w-4 h-4 md:w-5 md:h-5 mr-2 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v3m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Add New Party
            </h2>
          </div>
          <div className="p-3 md:p-4">
            <form onSubmit={handleSubmit} className="space-y-4 md:space-y-0 md:grid md:grid-cols-3 md:gap-4">
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                  Party Name
                </label>
                <input
                  type="text"
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="input-field"
                  placeholder="Enter party name"
                  required
                  disabled={supabaseError ? true : false}
                />
              </div>
              
              <div>
                <label htmlFor="accountNo" className="block text-sm font-medium text-gray-700 mb-1">
                  Account No (3 digits)
                </label>
                <input
                  type="text"
                  id="accountNo"
                  value={accountNo}
                  onChange={(e) => setAccountNo(e.target.value)}
                  maxLength={3}
                  className="input-field"
                  placeholder="123"
                  required
                  disabled={supabaseError ? true : false}
                />
              </div>
              
              <div className="md:flex md:items-end">
                <button
                  type="submit"
                  className={`w-full py-2.5 px-4 rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-2 transition-colors duration-300 font-medium text-sm ${
                    supabaseError 
                      ? 'bg-gray-400 cursor-not-allowed text-white' 
                      : 'bg-gray-900 text-white hover:bg-gray-800 focus:ring-gray-500'
                  }`}
                  disabled={supabaseError ? true : false}
                >
                  Add Party
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Parties Table */}
        <div className="card">
          <div className="p-3 md:p-4 border-b border-gray-200">
            <h2 className="text-lg md:text-xl font-semibold text-gray-800 flex items-center">
              <svg className="w-4 h-4 md:w-5 md:h-5 mr-2 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              Party List
            </h2>
          </div>
          
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                  <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Account No</th>
                  <th scope="col" className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {loading ? (
                  <tr>
                    <td colSpan={3} className="px-2 md:px-4 py-4 text-center text-gray-500">
                      <div className="flex justify-center items-center py-4">
                        <div className="animate-spin rounded-full h-5 w-5 md:h-6 md:w-6 border-b-2 border-gray-600 mr-2"></div>
                        <span className="text-sm">Loading data...</span>
                      </div>
                    </td>
                  </tr>
                ) : parties.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="px-4 py-4 text-center text-gray-500">
                      <div className="flex flex-col items-center justify-center py-4">
                        <svg className="w-10 h-10 text-gray-400 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <p className="text-gray-500">No parties found</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  parties.map((party) => (
                    <tr key={party.id} className="hover:bg-gray-50 transition-colors duration-200">
                      <td className="px-2 md:px-4 py-3 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="bg-gray-200 border-2 border-dashed rounded-xl w-6 h-6 md:w-8 md:h-8 mr-2 md:mr-3 flex-shrink-0" />
                          <div className="text-xs md:text-sm font-medium text-gray-900 truncate">{party.name}</div>
                        </div>
                      </td>
                      <td className="px-2 md:px-4 py-3 whitespace-nowrap">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">{party.account_no}</span>
                      </td>
                      <td className="px-2 md:px-4 py-3 whitespace-nowrap text-right text-sm font-medium">
                        <button
                          onClick={() => handleDelete(party.id!)}
                          className="text-red-600 hover:text-red-900 p-2 rounded-lg hover:bg-red-50 transition-colors duration-300 min-h-10"
                          disabled={supabaseError ? true : false}
                          title="Delete party"
                        >
                          <svg className="w-4 h-4 md:w-5 md:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}