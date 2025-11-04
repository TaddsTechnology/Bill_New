'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true)
  const [isMobile, setIsMobile] = useState(false)
  const pathname = usePathname()

  // Check if we're on mobile
  useEffect(() => {
    const checkIsMobile = () => {
      const mobile = typeof window !== 'undefined' && window.innerWidth < 768
      setIsMobile(mobile)
      if (mobile) {
        setIsSidebarOpen(false)
      }
    }
    
    checkIsMobile()
    
    const handleResize = () => {
      checkIsMobile()
    }
    
    if (typeof window !== 'undefined') {
      window.addEventListener('resize', handleResize)
    }
    
    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('resize', handleResize)
      }
    }
  }, [])

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen)
  }

  const navItems = [
    { name: 'Dashboard', href: '/', icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6' },
    { name: 'Master Data', href: '/master-data', icon: 'M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4' },
    { name: 'Reports', href: '/reports', icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z' },
  ]

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <aside 
        className={`bg-gradient-to-b from-indigo-700 to-indigo-800 text-white z-30 ${
          isMobile 
            ? `fixed bottom-0 left-0 right-0 h-20 border-t border-indigo-600 flex items-center justify-around ${isSidebarOpen ? 'block' : 'hidden'}` 
            : `fixed inset-y-0 left-0 transform ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0 transition duration-300 ease-in-out w-64 shadow-xl`
        }`}
      >
        <div className={isMobile ? "flex w-full" : "h-full flex-col"}>
          {!isMobile && (
            <div className="flex items-center justify-between p-5 border-b border-indigo-600">
              <h1 className="text-xl font-bold flex items-center">
                <svg className="w-6 h-6 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="hidden lg:inline">CashFlow</span>
              </h1>
            </div>
          )}
          
          <nav className={isMobile ? "flex justify-around w-full" : "flex-1 p-4 mt-4"}>
            <ul className={isMobile ? "flex justify-around w-full" : ""}>
              {navItems.map((item) => (
                <li key={item.name} className={isMobile ? "flex-1" : "mb-2"}>
                  <Link
                    href={item.href}
                    className={`flex items-center p-3 rounded-lg transition-all duration-300 ${
                      pathname === item.href
                        ? 'bg-indigo-600 text-white shadow-md'
                        : 'text-indigo-100 hover:bg-indigo-600 hover:text-white'
                    } ${isMobile ? "justify-center flex-col text-xs" : ""}`}
                  >
                    <svg 
                      className={`w-5 h-5 ${isMobile ? "mb-1" : "mr-3"}`} 
                      fill="none" 
                      stroke="currentColor" 
                      viewBox="0 0 24 24" 
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={item.icon} />
                    </svg>
                    <span className={isMobile ? "text-xs" : ""}>{item.name}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
          
          {!isMobile && (
            <div className="p-4 text-indigo-200 text-sm border-t border-indigo-600">
              <p>© 2025 CashFlow</p>
            </div>
          )}
        </div>
      </aside>

      {/* Main content */}
      <div className={`flex-1 flex flex-col ${isMobile ? '' : 'md:ml-64'} transition-all duration-300`}>
        {/* Header */}
        <header className="bg-white shadow-sm z-20">
          <div className="flex items-center justify-between p-4">
            <div className="flex items-center">
              <button
                onClick={toggleSidebar}
                className="md:hidden text-gray-500 focus:outline-none mr-4"
              >
                <svg
                  className="w-6 h-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d={isSidebarOpen ? "M6 18L18 6M6 6l12 12" : "M4 6h16M4 12h16M4 18h16"}
                  />
                </svg>
              </button>
              
              <h1 className="text-xl font-bold text-gray-800 md:hidden">CashFlow</h1>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="relative">
                <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
                <span className="absolute top-0 right-0 block h-2 w-2 rounded-full bg-red-400"></span>
              </div>
              
              <div className="flex items-center">
                <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center">
                  <span className="text-indigo-800 font-medium">U</span>
                </div>
                <span className="ml-2 text-gray-700 hidden md:inline">User</span>
              </div>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-4 md:p-6 bg-gradient-to-br from-gray-50 to-gray-100">
          <div className="container mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}