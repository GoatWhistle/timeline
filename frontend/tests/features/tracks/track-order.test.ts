import { describe, expect, it } from 'vitest'
import { canMoveTrack, moveTrack, sortedTracks, TRACK_NO_MAX } from '@/features/tracks/track-order'
import type { EventTrackResponse } from '@/shared/api/types.gen'

function track(id: string, trackNo: number): EventTrackResponse {
  return {
    id,
    event_id: 'ev_gma9hq8a96q5',
    track_no: trackNo,
    name: `Track ${trackNo}`,
    description: '',
    prize_total: '0',
    prizes: [],
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
  }
}

const THREE = [track('tr_b', 2), track('tr_a', 1), track('tr_c', 3)]

describe('tracks are ordered by their track number', () => {
  it('sorts ascending regardless of the order the server listed them', () => {
    expect(sortedTracks(THREE).map((item) => item.id)).toEqual(['tr_a', 'tr_b', 'tr_c'])
  })
})

describe('the ends of the list cannot be moved past', () => {
  it('the first track cannot move up and the last cannot move down', () => {
    expect(canMoveTrack(THREE, 'tr_a', -1)).toBe(false)
    expect(canMoveTrack(THREE, 'tr_c', 1)).toBe(false)
  })

  it('an interior track moves in both directions', () => {
    expect(canMoveTrack(THREE, 'tr_b', -1)).toBe(true)
    expect(canMoveTrack(THREE, 'tr_b', 1)).toBe(true)
  })

  it('a track the list does not hold cannot move at all', () => {
    expect(canMoveTrack(THREE, 'tr_missing', -1)).toBe(false)
    expect(canMoveTrack(THREE, 'tr_missing', 1)).toBe(false)
  })
})

describe('a swap never lets two tracks hold one number at once', () => {
  it('parks the moved track on a free number before taking its neighbour position', () => {
    const changes = moveTrack(THREE, 'tr_b', -1)
    expect(changes).toEqual([
      { id: 'tr_b', track_no: TRACK_NO_MAX },
      { id: 'tr_a', track_no: 2 },
      { id: 'tr_b', track_no: 1 },
    ])
  })

  it('every intermediate state keeps the numbers unique', () => {
    const changes = moveTrack(THREE, 'tr_b', 1)
    const held = new Map(THREE.map((item) => [item.id, item.track_no]))
    for (const change of changes) {
      held.set(change.id, change.track_no)
      expect(new Set(held.values()).size).toBe(held.size)
    }
    expect(held.get('tr_b')).toBe(3)
    expect(held.get('tr_c')).toBe(2)
  })

  it('the parking number is one no track currently holds', () => {
    const full = [track('tr_a', 1), track('tr_b', 2), track('tr_c', TRACK_NO_MAX)]
    const [parked] = moveTrack(full, 'tr_b', -1)
    expect(parked?.track_no).toBe(TRACK_NO_MAX - 1)
  })

  it('moving past an end produces no change at all', () => {
    expect(moveTrack(THREE, 'tr_a', -1)).toEqual([])
    expect(moveTrack(THREE, 'tr_c', 1)).toEqual([])
  })

  it('refuses to move when every track number is taken', () => {
    const packed = Array.from({ length: TRACK_NO_MAX }, (_, at) => track(`tr_${at}`, at + 1))
    expect(moveTrack(packed, 'tr_1', -1)).toEqual([])
  })
})
