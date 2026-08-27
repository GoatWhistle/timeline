export type LaneInput = {
  id: string
  left: number
  width: number
}

export type LanePlacement<T extends LaneInput> = {
  item: T
  lane: number
}

export type PackLanesResult<T extends LaneInput> = {
  placements: LanePlacement<T>[]
  laneCount: number
}

export const LANE_GAP = 4
export const MIN_BAR_WIDTH = 6

export function packLanes<T extends LaneInput>(
  items: readonly T[],
  gap: number = LANE_GAP,
  minWidth: number = MIN_BAR_WIDTH,
): PackLanesResult<T> {
  const normalized = items.map((item) => ({
    item,
    left: item.left,
    right: item.left + Math.max(minWidth, item.width),
  }))

  normalized.sort((a, b) => a.left - b.left || a.right - b.right)

  const laneEnds: number[] = []
  const placements: LanePlacement<T>[] = []

  for (const entry of normalized) {
    let lane = laneEnds.findIndex((end) => end + gap <= entry.left)
    if (lane === -1) {
      lane = laneEnds.length
      laneEnds.push(entry.right)
    } else {
      laneEnds[lane] = entry.right
    }
    placements.push({ item: entry.item, lane })
  }

  return { placements, laneCount: laneEnds.length }
}
