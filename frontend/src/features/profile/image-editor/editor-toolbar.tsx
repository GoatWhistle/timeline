import { Circle, Crop, Droplet, Minus, PaintBucket, Pipette, Square, Type } from 'lucide-react'
import type { ComponentType } from 'react'
import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { cn } from '@/shared/styling/class-names/class-names'
import { Button } from '@/shared/ui/primitives/button'
import { resolveColourToken } from './canvas-ops'
import { CustomColourField } from './custom-colour-field'
import {
  BRUSH_SIZES,
  EDITOR_PALETTE,
  EDITOR_TOOLS,
  type EditorTool,
  TEXT_SIZES,
} from './editor-model'

const TOOL_ICONS: Record<EditorTool, ComponentType<{ className?: string }>> = {
  crop: Crop,
  brush: Droplet,
  rectangle: Square,
  ellipse: Circle,
  line: Minus,
  fill: PaintBucket,
  text: Type,
  picker: Pipette,
}

const TOOL_LABELS: Record<EditorTool, string> = {
  crop: 'toolCrop',
  brush: 'toolBrush',
  rectangle: 'toolRectangle',
  ellipse: 'toolEllipse',
  line: 'toolLine',
  fill: 'toolFill',
  text: 'toolText',
  picker: 'toolPicker',
}

export function EditorToolbar({
  tool,
  onToolChange,
  colour,
  onColourChange,
  brushSize,
  onBrushSizeChange,
  textSize,
  onTextSizeChange,
}: {
  tool: EditorTool
  onToolChange: (next: EditorTool) => void
  colour: string
  onColourChange: (next: string) => void
  brushSize: number
  onBrushSizeChange: (next: number) => void
  textSize: number
  onTextSizeChange: (next: number) => void
}) {
  const { t } = useTranslation()
  const resolved = useMemo(
    () => EDITOR_PALETTE.map((swatch) => ({ ...swatch, hex: resolveColourToken(swatch.token) })),
    [],
  )

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
        {resolved.map((swatch) => (
          <label
            key={swatch.key}
            aria-label={t(`imageEditor.swatch.${swatch.key}`)}
            style={{ backgroundColor: swatch.token }}
            className={cn(
              'size-6 cursor-pointer rounded-pill border transition-transform duration-instant ease-out',
              'has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2',
              'has-[:focus-visible]:outline-ring',
              swatch.hex === colour
                ? 'border-border-strong motion-safe:scale-110'
                : 'border-border hover:motion-safe:scale-105',
            )}
          >
            <input
              type="radio"
              name="image-editor-colour"
              value={swatch.hex}
              checked={swatch.hex === colour}
              onChange={() => onColourChange(swatch.hex)}
              className="sr-only"
            />
          </label>
        ))}
        <CustomColourField colour={colour} onColourChange={onColourChange} />
      </fieldset>

      {tool === 'text' ? (
        <div
          role="radiogroup"
          aria-label={t('imageEditor.textSize')}
          className="flex items-center gap-1"
        >
          {TEXT_SIZES.map((size) => (
            <Button
              key={size}
              type="button"
              role="radio"
              aria-checked={size === textSize}
              variant={size === textSize ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => onTextSizeChange(size)}
            >
              {size}
            </Button>
          ))}
        </div>
      ) : (
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
      )}
    </div>
  )
}
