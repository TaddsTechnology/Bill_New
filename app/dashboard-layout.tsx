'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const [isClient, setIsClient] = useState(false)
  const pathname = usePathname()

  // Check if we're on the client side first
  useEffect(() => {
    setIsClient(true)
    
    const checkIsMobile = () => {
      const mobile = window.innerWidth < 768
      setIsMobile(mobile)
      // On desktop, sidebar starts open
      if (!mobile) {
        setIsSidebarOpen(true)
      } else {
        // On mobile, sidebar is controlled separately (always visible bottom nav)
        setIsSidebarOpen(false)
      }
    }
    
    checkIsMobile()
    
    const handleResize = () => {
      const nowMobile = window.innerWidth < 768
      const wasMobile = isMobile
      setIsMobile(nowMobile)
      
      // If switching from mobile to desktop, open sidebar
      if (wasMobile && !nowMobile) {
        setIsSidebarOpen(true)
      }
      // If switching from desktop to mobile, close desktop sidebar
      if (!wasMobile && nowMobile) {
        setIsSidebarOpen(false)
      }
    }
    
    window.addEventListener('resize', handleResize)
    
    return () => {
      window.removeEventListener('resize', handleResize)
    }
  }, [])

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen)
  }

  const navItems = [
    { name: 'Dashboard', href: '/', icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6', mobileIcon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6' },
    { name: 'Collections', href: '/collections', icon: 'M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z', mobileIcon: 'M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z' },
    { name: 'Master Data', href: '/master-data', icon: 'M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4', mobileIcon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2' },
    { name: 'Reports', href: '/reports', icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z', mobileIcon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z' },
    { name: 'Profile', href: '/profile', icon: 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z', mobileIcon: 'M5.121 17.804A13.937 13.937 0 0112 16c2.5 0 4.847.655 6.879 1.804M15 10a3 3 0 11-6 0 3 3 0 016 0z' },
  ]

  // Don't render until client-side hydration is complete
  if (!isClient) {
    return (
      <div className="flex min-h-screen bg-gray-50">
        <div className="flex-1 flex flex-col transition-all duration-300">
          <header className="bg-white border-b border-gray-200 z-20 sticky top-0">
            <div className="flex items-center justify-between p-3 sm:p-4">
              <div className="flex items-center space-x-2 sm:space-x-3">
                <div className="flex items-center">
                  <div className="w-7 h-7 sm:w-8 sm:h-8 mr-2 bg-gray-900 rounded-lg flex items-center justify-center">
                    <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <h1 className="text-lg sm:text-xl font-semibold text-gray-900">CashFlow</h1>
                </div>
              </div>
            </div>
          </header>
          <main className="flex-1 overflow-y-auto p-2 sm:p-4 md:p-6 bg-white">
            <div className="w-full max-w-7xl mx-auto px-1 sm:px-0">
              {children}
            </div>
          </main>
        </div>
      </div>
    )
  }

  return (
    <div className={`flex ${isMobile ? 'flex-col' : ''} min-h-screen bg-gray-50`}>
      {/* Desktop Sidebar */}
      {!isMobile && (
        <aside className={`bg-white border-r border-gray-200 z-30 fixed inset-y-0 left-0 transform transition-all duration-300 ease-in-out shadow-sm ${
          isSidebarOpen ? 'translate-x-0 w-64' : '-translate-x-full w-0'
        }`}>
          <div className="h-full flex flex-col">
            {/* Logo Section */}
            <div className="flex items-center p-6 border-b border-gray-100">
              <h1 className="text-xl font-semibold text-gray-900 flex items-center">
                <div className="w-8 h-8 mr-3 bg-gray-900 rounded-lg flex items-center justify-center">
                  <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                CashFlow
              </h1>
            </div>
            
            {/* Navigation */}
            <nav className="flex-1 p-4 space-y-1">
              {navItems.map((item) => (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`group flex items-center px-3 py-2.5 rounded-lg transition-all duration-200 ${
                    pathname === item.href
                      ? 'bg-gray-900 text-white'
                      : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
                  }`}
                >
                  <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={item.icon} />
                  </svg>
                  <span className="font-medium">{item.name}</span>
                </Link>
              ))}
            </nav>
            
            {/* Footer */}
            <div className="p-4 border-t border-gray-100">
              <div className="flex items-center space-x-3 p-3 rounded-lg bg-gray-50">
                <div className="w-8 h-8 rounded-full bg-gray-900 flex items-center justify-center">
                  <span className="text-white text-sm font-semibold">A</span>
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900">Admin User</p>
                  <p className="text-xs text-gray-500">© 2025 CashFlow</p>
                </div>
              </div>
            </div>
          </div>
        </aside>
      )}
      
      {/* Mobile Bottom Navigation - Always visible on mobile like Piggy UPI */}
      {isMobile && (
        <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50 safe-area-inset-bottom">
          <div className="grid grid-cols-5 h-16">
            {navItems.map((item) => (
              <Link
                key={item.name}
                href={item.href}
                className={`flex flex-col items-center justify-center px-1 py-2 transition-colors duration-200 ${
                  pathname === item.href
                    ? 'text-gray-900 bg-gray-50'
                    : 'text-gray-600'
                }`}
              >
                <svg className="w-5 h-5 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={pathname === item.href ? 2.5 : 2} d={item.mobileIcon || item.icon} />
                </svg>
                <span className={`text-xs font-medium truncate ${
                  pathname === item.href ? 'text-gray-900' : 'text-gray-500'
                }`}>
                  {item.name === 'Master Data' ? 'Masters' : 
                   item.name === 'Collections' ? 'Cash' : item.name}
                </span>
                {pathname === item.href && (
                  <div className="absolute -top-0.5 w-6 h-0.5 bg-gray-900 rounded-full" />
                )}
              </Link>
            ))}
          </div>
        </nav>
      )}

      {/* Main content */}
      <div className={`flex-1 flex flex-col ${isMobile ? 'with-bottom-nav' : (isSidebarOpen ? 'ml-64' : 'ml-0')} transition-all duration-300`}>
        {/* Header */}
        <header className="bg-white border-b border-gray-200 z-20 sticky top-0">
          <div className="flex items-center justify-between p-3 sm:p-4">
            <div className="flex items-center space-x-2 sm:space-x-3">
              {/* Desktop sidebar toggle */}
              {!isMobile && (
                <button
                  onClick={toggleSidebar}
                  className="p-2 rounded-lg transition-all duration-200 focus:outline-none text-gray-600 bg-gray-50 hover:bg-gray-100"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d={isSidebarOpen ? "M11 19l-7-7 7-7m8 14l-7-7 7-7" : "M13 5l7 7-7 7M5 5l7 7-7 7"}
                    />
                  </svg>
                </button>
              )}
              
              {/* Logo */}
              <div className="flex items-center">
                <div className="w-7 h-7 sm:w-8 sm:h-8 mr-2 bg-gray-900 rounded-lg flex items-center justify-center">
                  <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h1 className="text-lg sm:text-xl font-semibold text-gray-900">CashFlow</h1>
              </div>
            </div>
            
            <div className="flex items-center space-x-1 sm:space-x-2">
              {/* Search - Desktop only */}
              <div className="relative hidden lg:block">
                <input 
                  type="text" 
                  placeholder="Search..."
                  className="w-48 xl:w-64 pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent transition-all duration-200"
                />
                <svg className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              
              {/* Mobile search icon */}
              <div className="lg:hidden">
                <button className="p-2 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors duration-200">
                  <svg className="w-4 h-4 sm:w-5 sm:h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </button>
              </div>
              
              {/* Notifications */}
              <div className="relative">
                <button className="p-2 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors duration-200 relative">
                  <svg className="w-4 h-4 sm:w-5 sm:h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                  </svg>
                  <span className="absolute top-1 right-1 block h-1.5 w-1.5 sm:h-2 sm:w-2 rounded-full bg-red-500"></span>
                </button>
              </div>
              
              {/* Profile */}
              <div className="flex items-center space-x-2 bg-gray-50 rounded-lg p-1.5 sm:p-2">
                <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-gray-900 flex items-center justify-center">
                  <span className="text-white text-xs sm:text-sm font-semibold">A</span>
                </div>
                <span className="font-medium text-gray-700 hidden sm:inline text-sm">Admin</span>
              </div>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-2 sm:p-4 md:p-6 bg-white">
          <div className="w-full max-w-7xl mx-auto px-1 sm:px-0">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}