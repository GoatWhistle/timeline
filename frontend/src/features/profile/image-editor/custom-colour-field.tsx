import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { cn } from '@/shared/styling/class-names/class-names'
import { Input } from '@/shared/ui/forms/input'
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
    <div className="flex items-center gap-2">
      <label
        className={cn(
          'relative size-8 shrink-0 cursor-pointer overflow-hidden rounded-control border border-input',
        )}
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
      <Input
        aria-label={t('imageEditor.hexCode')}
        aria-invalid={invalid}
        value={draft}
        placeholder={t('imageEditor.hexPlaceholder')}
        className="h-8 w-24 px-2 text-caption"
        onChange={(event) => setDraft(event.target.value)}
        onBlur={(event) => commit(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === 'Enter') commit(event.currentTarget.value)
        }}
      />
    </div>
  )
}
