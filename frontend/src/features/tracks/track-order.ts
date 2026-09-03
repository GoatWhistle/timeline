import type { EventTrackResponse } from '@/shared/api/types.gen'

export const TRACK_NO_MAX = 50

export type TrackNoChange = { id: string; track_no: number }

export function sortedTracks(tracks: EventTrackResponse[]): EventTrackResponse[] {
  return [...tracks].sort((left, right) => left.track_no - right.track_no)
}

export function canMoveTrack(tracks: EventTrackResponse[], id: string, direction: -1 | 1): boolean {
  const ordered = sortedTracks(tracks)
  const index = ordered.findIndex((track) => track.id === id)
  if (index < 0) return false
  const target = index + direction
  return target >= 0 && target < ordered.length
}

function freeTrackNo(tracks: EventTrackResponse[]): number | null {
  const taken = new Set(tracks.map((track) => track.track_no))
  for (let candidate = TRACK_NO_MAX; candidate >= 1; candidate -= 1) {
    if (!taken.has(candidate)) return candidate
  }
  return null
}

export function moveTrack(
  tracks: EventTrackResponse[],
  id: string,
  direction: -1 | 1,
): TrackNoChange[] {
  const ordered = sortedTracks(tracks)
  const index = ordered.findIndex((track) => track.id === id)
  const target = index + direction
  if (index < 0 || target < 0 || target >= ordered.length) return []

  const moved = ordered[index]
  const displaced = ordered[target]
  if (!moved || !displaced) return []

  const parking = freeTrackNo(ordered)
  if (parking === null) return []

  return [
    { id: moved.id, track_no: parking },
    { id: displaced.id, track_no: moved.track_no },
    { id: moved.id, track_no: displaced.track_no },
  ]
}
