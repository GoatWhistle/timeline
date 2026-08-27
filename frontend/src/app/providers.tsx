import { QueryClientProvider } from '@tanstack/react-query'
import { useState } from 'react'
import { Toaster } from 'sonner'
import { createQueryClient } from '@/shared/api/query-client'
import { ThemeProvider } from '@/shared/theme/theme-context'
import { AppRouter } from './router'

export function App() {
  const [queryClient] = useState(createQueryClient)
  return (
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        <AppRouter />
        <Toaster position="bottom-right" richColors closeButton />
      </QueryClientProvider>
    </ThemeProvider>
  )
}
