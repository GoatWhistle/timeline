import { type ClassValue, clsx } from 'clsx'
import { extendTailwindMerge } from 'tailwind-merge'

const FONT_SIZES = ['screen', 'heading', 'copy', 'meta', 'caption'] as const

const TEXT_COLORS = [
  'background',
  'foreground',
  'card',
  'card-foreground',
  'popover',
  'popover-foreground',
  'primary',
  'primary-foreground',
  'secondary',
  'secondary-foreground',
  'muted',
  'muted-foreground',
  'faint-foreground',
  'accent',
  'accent-foreground',
  'accent-surface',
  'accent-surface-foreground',
  'highlight-fill',
  'highlight-fill-foreground',
  'destructive',
  'destructive-foreground',
  'border',
  'border-strong',
  'input',
  'ring',
  'surface-0',
  'surface-1',
  'surface-2',
  'surface-3',
  'state-unpublished',
  'state-upcoming',
  'state-active',
  'state-finished',
  'state-archived',
  'status-todo',
  'status-done',
  'status-not-required',
  'stage-registration',
  'stage-selection',
  'stage-participation',
  'stage-checkpoint',
  'stage-submission',
  'stage-demo',
  'stage-results',
  'stage-other',
  'stage-foreground',
  'urgency-calm',
  'urgency-soon',
  'urgency-today',
  'urgency-overdue',
  'urgency-done',
  'urgency-waived',
  'urgency-foreground',
] as const

const twMerge = extendTailwindMerge({
  extend: {
    classGroups: {
      'font-size': [{ text: [...FONT_SIZES] }],
      'text-color': [{ text: [...TEXT_COLORS] }],
    },
  },
})

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs))
}
