import { Bold, Code, Eye, Heading, Italic, Link2, List, ListOrdered } from 'lucide-react'
import { useId, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { cn } from '@/shared/styling/class-names/class-names'
import { Textarea } from '@/shared/ui/forms/textarea'
import { Button } from '@/shared/ui/primitives/button'
import { EditAction } from '@/shared/ui/primitives/row-actions'
import { applyMark, type MarkName } from './apply-mark'
import { MARKDOWN_MAX_LENGTH } from './limits'
import { MarkdownView } from './markdown-view'

const TOOLS: { mark: MarkName; icon: React.ComponentType<{ className?: string }>; key: string }[] =
  [
    { mark: 'bold', icon: Bold, key: 'bold' },
    { mark: 'italic', icon: Italic, key: 'italic' },
    { mark: 'heading', icon: Heading, key: 'heading' },
    { mark: 'bullet', icon: List, key: 'bullet' },
    { mark: 'ordered', icon: ListOrdered, key: 'ordered' },
    { mark: 'link', icon: Link2, key: 'link' },
    { mark: 'code', icon: Code, key: 'code' },
  ]

export type MarkdownEditorProps = {
  id: string
  value: string
  onChange: (value: string) => void
  onBlur?: () => void
  rows?: number
  maxLength?: number
  className?: string
}

export function MarkdownEditor({
  id,
  value,
  onChange,
  onBlur,
  rows = 6,
  maxLength = MARKDOWN_MAX_LENGTH,
  className,
}: MarkdownEditorProps) {
  const { t } = useTranslation('common')
  const area = useRef<HTMLTextAreaElement>(null)
  const [preview, setPreview] = useState(false)
  const previewId = useId()

  function run(mark: MarkName) {
    const node = area.current
    if (!node) return
    const result = applyMark(value, { start: node.selectionStart, end: node.selectionEnd }, mark)
    onChange(result.value.slice(0, maxLength))
    requestAnimationFrame(() => {
      node.focus()
      node.setSelectionRange(result.selection.start, result.selection.end)
    })
  }

  return (
    <div className={cn('flex flex-col gap-2', className)}>
      <div className="flex flex-wrap items-center gap-1">
        <fieldset className="flex min-w-0 flex-wrap items-center gap-0.5 border-0 p-0">
          <legend className="sr-only">{t('markdown.toolbar')}</legend>
          {TOOLS.map(({ mark, icon: Icon, key }) => (
            <Button
              key={key}
              type="button"
              variant="ghost"
              size="icon"
              className="size-8"
              onClick={() => run(mark)}
              disabled={preview}
              title={t(`markdown.${key}`)}
            >
              <Icon className="size-4" aria-hidden="true" />
              <span className="sr-only">{t(`markdown.${key}`)}</span>
            </Button>
          ))}
        </fieldset>
        {preview ? (
          <EditAction
            className="ml-auto"
            label={t('markdown.write')}
            aria-pressed={true}
            aria-controls={previewId}
            onClick={() => setPreview(false)}
          />
        ) : (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="ml-auto size-8"
            onClick={() => setPreview(true)}
            aria-pressed={false}
            aria-controls={previewId}
            title={t('markdown.preview')}
          >
            <Eye className="size-4" aria-hidden="true" />
            <span className="sr-only">{t('markdown.preview')}</span>
          </Button>
        )}
      </div>

      <div className="relative grid min-h-24">
        {preview ? (
          <div
            id={previewId}
            className="[grid-area:1/1] overflow-auto rounded-control border border-input px-3 py-2"
            data-markdown-preview=""
          >
            <MarkdownView source={value} />
          </div>
        ) : (
          <Textarea
            id={id}
            ref={area}
            rows={rows}
            value={value}
            maxLength={maxLength}
            onChange={(event) => onChange(event.target.value)}
            onBlur={onBlur}
            className="[grid-area:1/1] h-full resize-y pb-6 font-mono text-caption"
          />
        )}
        {preview ? null : (
          <span className="pointer-events-none absolute right-5 bottom-2 flex items-center gap-2 text-caption text-muted-foreground">
            <span className="font-mono uppercase">{t('markdown.syntax')}</span>
            <span className={value.length >= maxLength ? 'text-destructive' : undefined}>
              {value.length} / {maxLength}
            </span>
          </span>
        )}
      </div>
    </div>
  )
}
