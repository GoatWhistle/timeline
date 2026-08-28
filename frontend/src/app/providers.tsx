import { QueryClientProvider } from '@tanstack/react-query'
import { useState } from 'react'
import { Toaster } from 'sonner'
import { createQueryClient } from '@/shared/api/query-client'
import { I18nProvider } from '@/shared/i18n/i18n-context'
import { ShortcutProvider } from '@/shared/keyboard/shortcut-registry'
import { ThemeProvider } from '@/shared/theme/theme-context'
import { AppRouter } from './router'

export function App() {
  const [queryClient] = useState(createQueryClient)
  return (
    <I18nProvider>
      <ThemeProvider>
        <QueryClientProvider client={queryClient}>
          <ShortcutProvider>
            <AppRouter />
            <Toaster position="bottom-right" richColors closeButton />
          </ShortcutProvider>
        </QueryClientProvider>
      </ThemeProvider>
    </I18nProvider>
  )
}
