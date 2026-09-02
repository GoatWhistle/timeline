export function filled(value: string | null | undefined): value is string {
  return typeof value === 'string' && value.trim() !== ''
}

export function textOf(value: string | null | undefined): string {
  return filled(value) ? value : ''
}

export function countOf(value: number | null | undefined): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0
}
