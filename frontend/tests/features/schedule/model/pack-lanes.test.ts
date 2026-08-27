import { describe, expect, it } from 'vitest'
import {
  LANE_GAP,
  type LaneInput,
  MIN_BAR_WIDTH,
  packLanes,
} from '@/features/schedule/model/pack-lanes'

function bar(id: string, left: number, width: number): LaneInput {
  return { id, left, width }
}

describe('packLanes', () => {
  it('возвращает пустой результат на пустом входе', () => {
    const result = packLanes([])
    expect(result.placements).toEqual([])
    expect(result.laneCount).toBe(0)
  })

  it('кладёт одиночный элемент на нулевую дорожку', () => {
    const result = packLanes([bar('a', 0, 100)])
    expect(result.laneCount).toBe(1)
    expect(result.placements).toEqual([{ item: bar('a', 0, 100), lane: 0 }])
  })

  it('раскладывает непересекающиеся элементы на одну дорожку', () => {
    const result = packLanes([bar('a', 0, 50), bar('b', 100, 50), bar('c', 200, 50)])
    expect(result.laneCount).toBe(1)
    expect(result.placements.map((p) => p.lane)).toEqual([0, 0, 0])
  })

  it('разводит пересекающиеся элементы по разным дорожкам', () => {
    const result = packLanes([bar('a', 0, 100), bar('b', 50, 100)])
    expect(result.laneCount).toBe(2)
    expect(result.placements.map((p) => p.lane)).toEqual([0, 1])
  })

  it('переиспользует освободившуюся дорожку', () => {
    const result = packLanes([bar('a', 0, 100), bar('b', 50, 100), bar('c', 300, 50)])
    expect(result.laneCount).toBe(2)
    const lanes = new Map(result.placements.map((p) => [p.item.id, p.lane]))
    expect(lanes.get('a')).toBe(0)
    expect(lanes.get('b')).toBe(1)
    expect(lanes.get('c')).toBe(0)
  })

  it('сортирует вход по левой границе независимо от порядка', () => {
    const result = packLanes([bar('c', 200, 50), bar('a', 0, 50), bar('b', 100, 50)])
    expect(result.placements.map((p) => p.item.id)).toEqual(['a', 'b', 'c'])
  })

  it('при равном начале сортирует по правой границе', () => {
    const result = packLanes([bar('wide', 0, 200), bar('narrow', 0, 50)])
    expect(result.placements.map((p) => p.item.id)).toEqual(['narrow', 'wide'])
  })

  it('учитывает зазор между дорожками', () => {
    const touching = packLanes([bar('a', 0, 100), bar('b', 100 + LANE_GAP, 50)])
    expect(touching.laneCount).toBe(1)

    const tooClose = packLanes([bar('a', 0, 100), bar('b', 100 + LANE_GAP - 1, 50)])
    expect(tooClose.laneCount).toBe(2)
  })

  it('расширяет узкий элемент до минимальной ширины полосы', () => {
    const result = packLanes([bar('a', 0, 0), bar('b', MIN_BAR_WIDTH - 1, 10)])
    expect(result.laneCount).toBe(2)
  })

  it('принимает свои значения зазора и минимальной ширины', () => {
    const result = packLanes([bar('a', 0, 10), bar('b', 20, 10)], 30, 1)
    expect(result.laneCount).toBe(2)
  })

  it('растит число дорожек по глубине пересечения', () => {
    const result = packLanes([bar('a', 0, 300), bar('b', 10, 300), bar('c', 20, 300)])
    expect(result.laneCount).toBe(3)
    expect(result.placements.map((p) => p.lane)).toEqual([0, 1, 2])
  })

  it('сохраняет исходный элемент в размещении', () => {
    const item = { id: 'a', left: 5, width: 7, extra: 'сохранено' }
    const result = packLanes([item])
    expect(result.placements[0]?.item).toBe(item)
  })
})
