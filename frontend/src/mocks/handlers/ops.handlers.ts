import { HttpResponse, http } from 'msw'
import { nowIso } from '../fixtures'
import { requireAdmin } from '../guards'
import { API } from '../http'

export const opsHandlers = [
  http.get(`${API}/ops/worker-heartbeat`, () => {
    const { deny } = requireAdmin()
    if (deny) return deny
    return HttpResponse.json({
      healthy: true,
      pending_count: 4,
      processing_count: 1,
      failed_count: 0,
      undeliverable_count: 0,
      oldest_pending_age_seconds: 42,
      worker_last_run_at: nowIso(),
      scheduler_last_run_at: nowIso(),
    })
  }),

  http.get(`${API}/healthz`, () => HttpResponse.json({ status: 'ok', time: nowIso() })),

  http.get(`${API}/readyz`, () => HttpResponse.json({ status: 'ok', database: 'ok' })),
]
