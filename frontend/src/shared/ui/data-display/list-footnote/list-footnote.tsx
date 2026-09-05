import { cn } from '@/shared/styling/class-names/class-names'

export const FOOTNOTE_TEXT = 'text-meta text-muted-foreground'

export function ListFootnote({ text, className }: { text: string; className?: string }) {
  return <p className={cn(FOOTNOTE_TEXT, 'max-w-prose text-balance', className)}>{text}</p>
}
