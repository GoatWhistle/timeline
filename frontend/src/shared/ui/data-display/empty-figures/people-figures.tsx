import { BrandMark, DashedCircle, DashedPath, DashedRect, FigureFrame } from './figure-frame'

export function TeamFigure({ label }: { label: string }) {
  return (
    <FigureFrame label={label}>
      <DashedCircle cx={32} cy={52} r={22} />
      <DashedCircle cx={168} cy={52} r={22} />
      <BrandMark />
    </FigureFrame>
  )
}

export function RosterFigure({ label }: { label: string }) {
  return (
    <FigureFrame label={label}>
      <DashedCircle cx={26} cy={40} r={16} />
      <DashedPath d="M8 84c0-12 8-20 18-20s18 8 18 20" />
      <DashedCircle cx={174} cy={40} r={16} />
      <DashedPath d="M156 84c0-12 8-20 18-20s18 8 18 20" />
      <BrandMark />
    </FigureFrame>
  )
}

export function InviteFigure({ label }: { label: string }) {
  return (
    <FigureFrame label={label}>
      <DashedRect x={14} y={26} width={54} height={52} rx={8} />
      <DashedPath d="M14 30l27 22 27-22" />
      <DashedRect x={132} y={26} width={54} height={52} rx={8} />
      <DashedPath d="M132 30l27 22 27-22" />
      <BrandMark />
    </FigureFrame>
  )
}

export function BrokenLinkFigure({ label }: { label: string }) {
  return (
    <FigureFrame label={label}>
      <DashedPath d="M52 36h-14a16 16 0 000 32h14" />
      <DashedPath d="M148 36h14a16 16 0 010 32h-14" />
      <DashedPath d="M74 20L60 84" />
      <DashedPath d="M140 20l-14 64" />
      <BrandMark />
    </FigureFrame>
  )
}
