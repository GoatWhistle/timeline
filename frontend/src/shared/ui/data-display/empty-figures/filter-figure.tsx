import { BrandMark, DashedPath, FigureFrame } from './figure-frame'

export function FilterFigure({ label }: { label: string }) {
  return (
    <FigureFrame label={label}>
      <DashedPath d="M10 18h44L36 46v30l-8-6V46z" />
      <DashedPath d="M190 18h-44l18 28v30l8-6V46z" />
      <BrandMark />
    </FigureFrame>
  )
}
