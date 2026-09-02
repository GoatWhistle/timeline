import { Circle, Crop, Droplet, Minus, PaintBucket, Pipette, Square } from 'lucide-react'
import type { ComponentType } from 'react'
import { useTranslation } from 'react-i18next'
import { cn } from '@/shared/styling/class-names/class-names'
import { Button } from '@/shared/ui/primitives/button'
import { BRUSH_SIZES, EDITOR_PALETTE, EDITOR_TOOLS, type EditorTool } from './editor-model'

const TOOL_ICONS: Record<EditorTool, ComponentType<{ className?: string }>> = {
  crop: Crop,
  brush: Droplet,
  rectangle: Square,
  ellipse: Circle,
  line: Minus,
  fill: PaintBucket,
  picker: Pipette,
}

const TOOL_LABELS: Record<EditorTool, string> = {
  crop: 'toolCrop',
  brush: 'toolBrush',
  rectangle: 'toolRectangle',
  ellipse: 'toolEllipse',
  line: 'toolLine',
  fill: 'toolFill',
  picker: 'toolPicker',
}

export function EditorToolbar({
  tool,
  onToolChange,
  colour,
  onColourChange,
  brushSize,
  onBrushSizeChange,
}: {
  tool: EditorTool
  onToolChange: (next: EditorTool) => void
  colour: string
  onColourChange: (next: string) => void
  brushSize: number
  onBrushSizeChange: (next: number) => void
}) {
  const { t } = useTranslation()

  return (
    <div className="flex flex-col gap-3">
      <div
        role="radiogroup"
        aria-label={t('imageEditor.tool')}
        className="flex flex-wrap items-center gap-1"
      >
        {EDITOR_TOOLS.map((item) => {
          const Icon = TOOL_ICONS[item]
          const active = item === tool
          return (
            <Button
              key={item}
              type="button"
              role="radio"
              aria-checked={active}
              variant={active ? 'default' : 'ghost'}
              size="icon"
              title={t(`imageEditor.${TOOL_LABELS[item]}`)}
              onClick={() => onToolChange(item)}
            >
              <Icon className="size-4" />
              <span className="sr-only">{t(`imageEditor.${TOOL_LABELS[item]}`)}</span>
            </Button>
          )
        })}
      </div>

      <fieldset className="flex flex-wrap gap-1 border-0 p-0">
        <legend className="sr-only">{t('imageEditor.colour')}</legend>
        {EDITOR_PALETTE.map((swatch) => (
          <label
            key={swatch}
            aria-label={swatch}
            style={{ backgroundColor: swatch }}
            className={cn(
              'size-6 cursor-pointer rounded-pill border transition-transform duration-instant ease-out',
              'has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2',
              'has-[:focus-visible]:outline-ring',
              swatch === colour
                ? 'border-border-strong motion-safe:scale-110'
                : 'border-border hover:motion-safe:scale-105',
            )}
          >
            <input
              type="radio"
              name="image-editor-colour"
              value={swatch}
              checked={swatch === colour}
              onChange={() => onColourChange(swatch)}
              className="sr-only"
            />
          </label>
        ))}
      </fieldset>

      <div
        role="radiogroup"
        aria-label={t('imageEditor.brushSize')}
        className="flex items-center gap-1"
      >
        {BRUSH_SIZES.map((size) => (
          <Button
            key={size}
            type="button"
            role="radio"
            aria-checked={size === brushSize}
            variant={size === brushSize ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => onBrushSizeChange(size)}
          >
            {size}
          </Button>
        ))}
      </div>
    </div>
  )
}
