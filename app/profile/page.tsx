'use client'

import { useState, useEffect } from 'react'
import DashboardLayout from '../dashboard-layout'
import { useToast } from '../../lib/hooks/useToast'
import { useAuth } from '../../lib/hooks/useAuth'
import { ConfirmModal } from '../../components/ui/ConfirmModal'
import { Button } from '../../components/ui/Button'
import { supabase, type Party } from '../../lib/supabaseClient'
import {
  getEntriesForCleanup,
  deleteSelectedEntries,
  type CleanupEntry,
} from '../../lib/cashCollectionService'

export default function ProfilePage() {
  const [activeTab, setActiveTab] = useState('profile')
  const { user, signOut } = useAuth()
  const { addToast } = useToast()
  const [cleanupFromDate, setCleanupFromDate] = useState('')
  const [cleanupToDate, setCleanupToDate] = useState('')
  const [cleanupAccount, setCleanupAccount] = useState('')
  const [cleanupEntries, setCleanupEntries] = useState<CleanupEntry[]>([])
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set())
  const [cleanupLoading, setCleanupLoading] = useState(false)
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [showCleanupConfirm, setShowCleanupConfirm] = useState(false)
  const [parties, setParties] = useState<Party[]>([])

  const tabs = [
    { id: 'profile', name: 'Profile', icon: 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z' },
    { id: 'settings', name: 'Settings', icon: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z' },
    { id: 'about', name: 'About', icon: 'M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z' },
  ]

  useEffect(() => {
    if (activeTab !== 'settings') return
    supabase.from('parties').select('*').order('account_no', { ascending: true })
      .then(({ data }) => setParties(data || []))
  }, [activeTab])

  const handleCleanupCheck = async () => {
    if (!cleanupFromDate || !cleanupToDate) return
    setCleanupLoading(true)
    try {
      const entries = await getEntriesForCleanup(cleanupFromDate, cleanupToDate, cleanupAccount || undefined)
      setCleanupEntries(entries)
      setSelectedKeys(new Set())
      if (entries.length === 0) {
        addToast('No entries found for this period', 'info')
      }
    } catch {
      addToast('Failed to fetch entries', 'error')
    } finally {
      setCleanupLoading(false)
    }
  }

  const toggleAll = () => {
    if (selectedKeys.size === cleanupEntries.length) {
      setSelectedKeys(new Set())
    } else {
      setSelectedKeys(new Set(cleanupEntries.map(e => entryKey(e))))
    }
  }

  const toggleEntry = (key: string) => {
    setSelectedKeys(prev => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  const handleDeleteSelected = async () => {
    if (selectedKeys.size === 0) return
    setShowCleanupConfirm(true)
  }

  const handleCleanupConfirm = async () => {
    setDeleteLoading(true)
    try {
      const collIds = cleanupEntries
        .filter(e => e.type === 'collection' && selectedKeys.has(entryKey(e)))
        .map(e => e.id)
      const wdIds = cleanupEntries
        .filter(e => e.type === 'withdrawal' && selectedKeys.has(entryKey(e)))
        .map(e => e.id)
      const result = await deleteSelectedEntries(collIds, wdIds)
      addToast(`Deleted ${result.collectionsDeleted} collections and ${result.withdrawalsDeleted} withdrawals`, 'success')
      setShowCleanupConfirm(false)
      setCleanupEntries([])
      setSelectedKeys(new Set())
    } catch {
      addToast('Failed to delete entries', 'error')
    } finally {
      setDeleteLoading(false)
    }
  }

  function entryKey(e: CleanupEntry) { return `${e.type}-${e.id}` }

  return (
    <DashboardLayout>
      <div className="w-full">
        <div className="mb-4 md:mb-6 px-2 md:px-0">
          <h1 className="text-2xl md:text-3xl font-bold text-gray-800">Profile</h1>
          <p className="text-sm md:text-base text-gray-600 mt-1">Manage your account settings and preferences</p>
        </div>

        {/* Tab Navigation */}
        <div className="border-b border-gray-200 mb-4 md:mb-6">
          <nav className="flex space-x-8 px-2 md:px-0" aria-label="Tabs">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm flex items-center transition-colors duration-200 ${
                  activeTab === tab.id
                    ? 'border-gray-900 text-gray-900'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={tab.icon} />
                </svg>
                {tab.name}
              </button>
            ))}
          </nav>
        </div>

        {/* Profile Tab */}
        {activeTab === 'profile' && (
          <div className="space-y-4 md:space-y-6">
            <div className="card">
              <div className="p-3 md:p-4 border-b border-gray-200">
                <h2 className="text-lg md:text-xl font-semibold text-gray-800">User Information</h2>
              </div>
              <div className="p-3 md:p-4">
                <div className="flex items-center space-x-4 mb-6">
                  <div className="w-16 h-16 md:w-20 md:h-20 rounded-full bg-gradient-to-br from-gray-400 to-gray-600 flex items-center justify-center">
                    <span className="text-white text-xl md:text-2xl font-bold">
                      {user?.email?.charAt(0).toUpperCase() || '?'}
                    </span>
                  </div>
                  <div>
                    <h3 className="text-lg md:text-xl font-semibold text-gray-900">
                      {user?.email?.split('@')[0] || 'User'}
                    </h3>
                    <p className="text-sm text-gray-500">
                      {user?.role === 'authenticated' ? 'Authenticated User' : 'User'}
                    </p>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                    <input
                      type="email"
                      value={user?.email || ''}
                      className="input-field"
                      readOnly
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">User ID</label>
                    <input
                      type="text"
                      value={user?.id || ''}
                      className="input-field text-xs font-mono"
                      readOnly
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Last Sign In</label>
                    <input
                      type="text"
                      value={user?.last_sign_in_at ? new Date(user.last_sign_in_at).toLocaleString('en-GB') : '-'}
                      className="input-field"
                      readOnly
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Account Created</label>
                    <input
                      type="text"
                      value={user?.created_at ? new Date(user.created_at).toLocaleDateString('en-GB') : '-'}
                      className="input-field"
                      readOnly
                    />
                  </div>
                </div>

                <div className="flex justify-end pt-2">
                  <Button variant="danger" size="sm" onClick={signOut}>
                    Sign Out
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Settings Tab */}
        {activeTab === 'settings' && (
          <div className="space-y-4 md:space-y-6">
            <div className="card">
              <div className="p-3 md:p-4 border-b border-gray-200">
                <h2 className="text-lg md:text-xl font-semibold text-gray-800">Application Settings</h2>
              </div>
              <div className="p-3 md:p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <label className="text-sm font-medium text-gray-900">Dark Mode</label>
                    <p className="text-xs text-gray-500">Toggle dark mode theme</p>
                  </div>
                  <button className="relative inline-flex h-6 w-11 items-center rounded-full bg-gray-200 transition-colors focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2">
                    <span className="inline-block h-4 w-4 transform rounded-full bg-white transition-transform translate-x-1" />
                  </button>
                </div>
                
                <div className="flex items-center justify-between">
                  <div>
                    <label className="text-sm font-medium text-gray-900">Notifications</label>
                    <p className="text-xs text-gray-500">Enable push notifications</p>
                  </div>
                  <button className="relative inline-flex h-6 w-11 items-center rounded-full bg-gray-900 transition-colors focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2">
                    <span className="inline-block h-4 w-4 transform rounded-full bg-white transition-transform translate-x-6" />
                  </button>
                </div>
                
                <div className="flex items-center justify-between">
                  <div>
                    <label className="text-sm font-medium text-gray-900">Auto Backup</label>
                    <p className="text-xs text-gray-500">Automatically backup data daily</p>
                  </div>
                  <button className="relative inline-flex h-6 w-11 items-center rounded-full bg-gray-900 transition-colors focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2">
                    <span className="inline-block h-4 w-4 transform rounded-full bg-white transition-transform translate-x-6" />
                  </button>
                </div>
              </div>
            </div>

            <div className="card">
              <div className="p-3 md:p-4 border-b border-gray-200">
                <h2 className="text-lg md:text-xl font-semibold text-gray-800">Data Management</h2>
              </div>
              <div className="p-3 md:p-4 space-y-4">
                <div>
                  <p className="text-sm font-medium text-gray-700 mb-2">Delete Entries by Date Range</p>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">From Date</label>
                      <input type="date" value={cleanupFromDate} onChange={e => { setCleanupFromDate(e.target.value); setCleanupEntries([]) }} className="input-field" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">To Date</label>
                      <input type="date" value={cleanupToDate} onChange={e => { setCleanupToDate(e.target.value); setCleanupEntries([]) }} className="input-field" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Account No</label>
                      <input
                        type="text"
                        list="cleanup-accounts"
                        value={cleanupAccount}
                        onChange={e => { setCleanupAccount(e.target.value); setCleanupEntries([]) }}
                        placeholder="All Accounts — type to search"
                        className="input-field"
                      />
                      <datalist id="cleanup-accounts">
                        {parties.map(p => (
                          <option key={p.account_no} value={p.account_no}>
                            {p.account_no} - {p.name}
                          </option>
                        ))}
                      </datalist>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      onClick={handleCleanupCheck}
                      disabled={!cleanupFromDate || !cleanupToDate || cleanupLoading}
                      variant="danger"
                      size="sm"
                    >
                      {cleanupLoading ? 'Loading...' : 'Check'}
                    </Button>
                    {cleanupEntries.length > 0 && selectedKeys.size > 0 && (
                      <Button
                        onClick={handleDeleteSelected}
                        variant="danger"
                        size="sm"
                      >
                        Delete Selected ({selectedKeys.size})
                      </Button>
                    )}
                    {cleanupEntries.length > 0 && (
                      <button
                        onClick={() => { setCleanupEntries([]); setSelectedKeys(new Set()) }}
                        className="text-sm text-gray-500 hover:text-gray-700 ml-2"
                      >
                        Cancel
                      </button>
                    )}
                  </div>
                </div>

                {cleanupEntries.length > 0 && (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-gray-200">
                          <th className="py-2 pr-2 w-8">
                            <input
                              type="checkbox"
                              checked={selectedKeys.size === cleanupEntries.length}
                              onChange={toggleAll}
                              className="accent-gray-900"
                            />
                          </th>
                          <th className="py-2 text-left text-gray-600 font-medium whitespace-nowrap">Account</th>
                          <th className="py-2 text-left text-gray-600 font-medium whitespace-nowrap">Date</th>
                          <th className="py-2 text-left text-gray-600 font-medium whitespace-nowrap">Type</th>
                          <th className="py-2 text-right text-gray-600 font-medium whitespace-nowrap">Amount</th>
                          <th className="py-2 text-left text-gray-600 font-medium whitespace-nowrap">Collector</th>
                        </tr>
                      </thead>
                      <tbody>
                        {cleanupEntries.map(e => {
                          const key = entryKey(e)
                          return (
                            <tr key={key} className="border-b border-gray-100 hover:bg-gray-50">
                              <td className="py-1.5 pr-2">
                                <input
                                  type="checkbox"
                                  checked={selectedKeys.has(key)}
                                  onChange={() => toggleEntry(key)}
                                  className="accent-gray-900"
                                />
                              </td>
                              <td className="py-1.5 whitespace-nowrap">{e.account_no}</td>
                              <td className="py-1.5 whitespace-nowrap">{e.date}</td>
                              <td className="py-1.5 whitespace-nowrap">
                                <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${
                                  e.type === 'collection'
                                    ? 'bg-green-100 text-green-700'
                                    : 'bg-red-100 text-red-700'
                                }`}>
                                  {e.type === 'collection' ? 'Collection' : 'Withdrawal'}
                                </span>
                              </td>
                              <td className={`py-1.5 text-right whitespace-nowrap font-medium ${
                                e.type === 'collection' ? 'text-green-600' : 'text-red-600'
                              }`}>
                                {e.type === 'collection' ? '+' : '-'}Rs. {e.amount.toLocaleString('en-IN')}
                              </td>
                              <td className="py-1.5 whitespace-nowrap">{e.type === 'collection' ? (e.collector || '-') : '-'}</td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                    <div className="mt-2 text-xs text-gray-500">
                      Showing {cleanupEntries.length} entry{cleanupEntries.length !== 1 ? 'ies' : 'y'}
                      {cleanupAccount ? ` for account ${cleanupAccount}` : ''}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* About Tab */}
        {activeTab === 'about' && (
          <div className="space-y-4 md:space-y-6">
            <div className="card">
              <div className="p-3 md:p-4 border-b border-gray-200">
                <h2 className="text-lg md:text-xl font-semibold text-gray-800">About CashFlow</h2>
              </div>
              <div className="p-3 md:p-4 space-y-4">
                <div className="text-center">
                  <div className="w-16 h-16 md:w-20 md:h-20 mx-auto mb-4 bg-gradient-to-br from-gray-400 to-gray-600 rounded-xl flex items-center justify-center">
                    <svg className="w-8 h-8 md:w-10 md:h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <h3 className="text-xl md:text-2xl font-bold text-gray-900 mb-2">CashFlow Pro</h3>
                  <p className="text-sm text-gray-600">Daily Cash Collection Management System</p>
                </div>
                
                <div className="bg-gray-50 rounded-lg p-4">
                  <dl className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Version</dt>
                      <dd className="text-sm text-gray-900">1.0.0</dd>
                    </div>
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Last Updated</dt>
                      <dd className="text-sm text-gray-900">November 2025</dd>
                    </div>
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Built With</dt>
                      <dd className="text-sm text-gray-900">Next.js, TypeScript, Tailwind</dd>
                    </div>
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Database</dt>
                      <dd className="text-sm text-gray-900">Supabase</dd>
                    </div>
                  </dl>
                </div>
                
                <div className="text-center">
                  <p className="text-sm text-gray-500">© 2025 CashFlow Pro. All rights reserved.</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      <ConfirmModal
        open={showCleanupConfirm}
        title="Delete Selected Entries"
        message={`Are you sure you want to permanently delete ${selectedKeys.size} selected entry${selectedKeys.size !== 1 ? 'ies' : ''}? This cannot be undone.`}
        confirmLabel={`Delete ${selectedKeys.size} Entry${selectedKeys.size !== 1 ? 'ies' : ''}`}
        onConfirm={handleCleanupConfirm}
        onCancel={() => { setShowCleanupConfirm(false) }}
        loading={deleteLoading}
      />
    </DashboardLayout>
  )
}