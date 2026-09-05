import { Award, Circle, Medal, Trophy } from 'lucide-react'
import type * as React from 'react'

export type PrizeRank = 'GOLD' | 'SILVER' | 'BRONZE' | 'PLAIN'

export function rankOfPlace(place: number): PrizeRank {
  if (place === 1) return 'GOLD'
  if (place === 2) return 'SILVER'
  if (place === 3) return 'BRONZE'
  return 'PLAIN'
}

export const PRIZE_RANK_KEY: Record<PrizeRank, string> = {
  GOLD: 'event:place.rankGold',
  SILVER: 'event:place.rankSilver',
  BRONZE: 'event:place.rankBronze',
  PLAIN: 'event:place.trackPlace',
}

export const PRIZE_RANK_TEXT: Record<PrizeRank, string> = {
  GOLD: 'text-medal-gold',
  SILVER: 'text-medal-silver',
  BRONZE: 'text-medal-bronze',
  PLAIN: 'text-medal-plain',
}

export const PRIZE_RANK_ICON: Record<PrizeRank, React.ComponentType<{ className?: string }>> = {
  GOLD: Trophy,
  SILVER: Medal,
  BRONZE: Award,
  PLAIN: Circle,
}

export const PRIZE_RANKS = Object.keys(PRIZE_RANK_KEY) as PrizeRank[]
