import { BrandMark, DashedPath, DashedRect, FigureFrame } from './figure-frame'

export function ScheduleFigure({ label }: { label: string }) {
  return (
    <FigureFrame label={label}>
      <DashedRect x={10} y={22} width={52} height={20} rx={10} />
      <DashedRect x={10} y={62} width={80} height={20} rx={10} />
      <DashedRect x={140} y={22} width={50} height={20} rx={10} />
      <DashedRect x={148} y={62} width={42} height={20} rx={10} />
      <BrandMark />
    </FigureFrame>
  )
}

export function DeadlineFigure({ label }: { label: string }) {
  return (
    <FigureFrame label={label}>
      <DashedPath d="M32 84V30" />
      <DashedPath d="M168 84V30" />
      <DashedPath d="M32 84h136" />
      <BrandMark />
    </FigureFrame>
  )
}

export function EventListFigure({ label }: { label: string }) {
  return (
    <FigureFrame label={label}>
      <DashedRect x={14} y={16} width={172} height={22} rx={11} />
      <DashedRect x={14} y={66} width={172} height={22} rx={11} />
      <BrandMark />
    </FigureFrame>
  )
}

export function StageFigure({ label }: { label: string }) {
  return (
    <FigureFrame label={label}>
      <DashedPath d="M18 52h32" />
      <DashedPath d="M150 52h32" />
      <DashedRect x={14} y={38} width={28} height={28} rx={8} />
      <DashedRect x={158} y={38} width={28} height={28} rx={8} />
      <BrandMark />
    </FigureFrame>
  )
}
