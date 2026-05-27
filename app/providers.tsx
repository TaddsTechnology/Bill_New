'use client'

import { type ReactNode } from 'react'
import { ToastProvider } from '../lib/hooks/useToast'
import { ToastContainer } from '../components/ui/Toast'

export function Providers({ children }: { children: ReactNode }) {
  return (
    <ToastProvider>
      {children}
      <ToastContainer />
    </ToastProvider>
  )
}
