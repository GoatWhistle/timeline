import type { SessionResponse } from '@/shared/api/types.gen'

export type RecencyBucket = 'current' | 'today' | 'week' | 'older'

export type SessionGroup = {
  bucket: RecencyBucket
  labelKey: string
  sessions: SessionResponse[]
}

const DAY = 24 * 60 * 60 * 1000

const BUCKET_LABEL: Record<RecencyBucket, string> = {
  current: 'devices.groupCurrent',
  today: 'devices.groupToday',
  week: 'devices.groupWeek',
  older: 'devices.groupOlder',
}

const ORDER: RecencyBucket[] = ['current', 'today', 'week', 'older']

export function bucketOf(session: SessionResponse, now: number): RecencyBucket {
  if (session.current === true) return 'current'
  const seen = session.last_used_at ?? session.created_at
  const at = seen ? Date.parse(seen) : Number.NaN
  if (Number.isNaN(at)) return 'older'
  const age = now - at
  if (age < DAY) return 'today'
  if (age < 7 * DAY) return 'week'
  return 'older'
}

export function groupSessions(items: SessionResponse[], now = Date.now()): SessionGroup[] {
  const buckets = new Map<RecencyBucket, SessionResponse[]>()
  for (const session of items) {
    const bucket = bucketOf(session, now)
    const list = buckets.get(bucket)
    if (list) list.push(session)
    else buckets.set(bucket, [session])
  }

  return ORDER.filter((bucket) => (buckets.get(bucket)?.length ?? 0) > 0).map((bucket) => ({
    bucket,
    labelKey: BUCKET_LABEL[bucket],
    sessions: buckets.get(bucket) ?? [],
  }))
}
