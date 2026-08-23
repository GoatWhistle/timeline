import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './app/providers'
import './styles/index.css'

/** До появления backend запросы обслуживает MSW (раздел «Интеграционные зависимости» tasks.md). */
async function enableMocking(): Promise<void> {
  if (import.meta.env.VITE_ENABLE_MSW !== '1') return
  const { worker } = await import('./mocks/browser')
  await worker.start({ onUnhandledRequest: 'warn' })
}

const container = document.getElementById('root')
if (!container) throw new Error('Не найден корневой элемент #root')

enableMocking().then(() => {
  createRoot(container).render(
    <StrictMode>
      <App />
    </StrictMode>,
  )
})
