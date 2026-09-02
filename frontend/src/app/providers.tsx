import { QueryClientProvider } from '@tanstack/react-query'
import { useState } from 'react'
import { Toaster } from 'sonner'
import { createQueryClient } from '@/shared/api/query-client'
import { I18nProvider } from '@/shared/i18n/i18n-context'
import { ShortcutProvider } from '@/shared/keyboard/shortcut-registry'
import { RealtimeProvider } from '@/shared/realtime/realtime-context'
import { ThemeProvider } from '@/shared/theme/theme-context'
import { AppRouter } from './router'

export function App() {
  const [queryClient] = useState(createQueryClient)
  return (
    <I18nProvider>
      <ThemeProvider>
        <QueryClientProvider client={queryClient}>
          <RealtimeProvider>
            <ShortcutProvider>
              <AppRouter />
              <Toaster position="bottom-right" richColors closeButton />
            </ShortcutProvider>
          </RealtimeProvider>
        </QueryClientProvider>
      </ThemeProvider>
    </I18nProvider>
  )
}
