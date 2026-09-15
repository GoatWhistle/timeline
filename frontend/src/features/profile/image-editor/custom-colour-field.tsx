import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { cn } from '@/shared/styling/class-names/class-names'
import { isValidHexColour, normaliseHexColour } from './editor-model'

export function CustomColourField({
  colour,
  onColourChange,
}: {
  colour: string
  onColourChange: (next: string) => void
}) {
  const { t } = useTranslation()
  const [draft, setDraft] = useState(colour)

  useEffect(() => setDraft(colour), [colour])

  const invalid = draft.trim() !== '' && !isValidHexColour(draft)

  function commit(value: string) {
    const normalised = normaliseHexColour(value)
    if (normalised) onColourChange(normalised)
  }

  return (
    <div
      data-custom-colour
      className={cn(
        'flex h-9 items-center gap-2 rounded-control border border-input bg-surface-1 pr-2 pl-1.5',
        'transition-colors duration-fast ease-out',
        'focus-within:outline-2 focus-within:-outline-offset-1 focus-within:outline-ring',
        invalid && 'border-destructive focus-within:outline-destructive',
      )}
    >
      <label
        className="relative size-6 shrink-0 cursor-pointer overflow-hidden rounded-badge border border-border-strong"
        style={{ backgroundColor: colour }}
      >
        <span className="sr-only">{t('imageEditor.customColour')}</span>
        <input
          type="color"
          value={colour}
          onChange={(event) => {
            setDraft(event.target.value)
            onColourChange(event.target.value)
          }}
          className="absolute inset-0 size-full cursor-pointer opacity-0"
        />
      </label>
      <input
        aria-label={t('imageEditor.hexCode')}
        aria-invalid={invalid}
        value={draft}
        placeholder={t('imageEditor.hexPlaceholder')}
        spellCheck={false}
        className={cn(
          'w-[8ch] min-w-0 bg-transparent font-mono text-caption uppercase outline-none',
          'placeholder:text-faint-foreground',
        )}
        onChange={(event) => setDraft(event.target.value)}
        onBlur={(event) => commit(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === 'Enter') commit(event.currentTarget.value)
        }}
      />
    </div>
  )
}
