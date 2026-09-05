import { BrandMark, DashedCircle, DashedPath, DashedRect, FigureFrame } from './figure-frame'

export function AuditFigure({ label }: { label: string }) {
  return (
    <FigureFrame label={label}>
      <DashedRect x={14} y={14} width={52} height={76} rx={8} />
      <DashedPath d="M134 22h52" />
      <DashedPath d="M134 52h52" />
      <DashedPath d="M134 82h52" />
      <BrandMark />
    </FigureFrame>
  )
}

export function DeviceFigure({ label }: { label: string }) {
  return (
    <FigureFrame label={label}>
      <DashedRect x={12} y={22} width={50} height={60} rx={8} />
      <DashedRect x={138} y={30} width={50} height={44} rx={6} />
      <DashedPath d="M150 84h26" />
      <BrandMark />
    </FigureFrame>
  )
}

export function QueueFigure({ label }: { label: string }) {
  return (
    <FigureFrame label={label}>
      <DashedCircle cx={26} cy={52} r={14} />
      <DashedCircle cx={64} cy={52} r={14} />
      <DashedCircle cx={136} cy={52} r={14} />
      <DashedCircle cx={174} cy={52} r={14} />
      <BrandMark />
    </FigureFrame>
  )
}

export function RuleFigure({ label }: { label: string }) {
  return (
    <FigureFrame label={label}>
      <DashedPath d="M14 52h30" />
      <DashedPath d="M156 30h30" />
      <DashedPath d="M156 74h30" />
      <DashedPath d="M136 52h20l0-22h-6" />
      <DashedPath d="M136 52h20l0 22h-6" />
      <BrandMark />
    </FigureFrame>
  )
}

export function ShortcutFigure({ label }: { label: string }) {
  return (
    <FigureFrame label={label}>
      <DashedRect x={12} y={34} width={40} height={40} rx={8} />
      <DashedRect x={148} y={34} width={40} height={40} rx={8} />
      <BrandMark />
    </FigureFrame>
  )
}

export function PreviewFigure({ label }: { label: string }) {
  return (
    <FigureFrame label={label}>
      <DashedRect x={14} y={20} width={48} height={64} rx={8} />
      <DashedPath d="M138 34h48" />
      <DashedPath d="M138 52h34" />
      <DashedPath d="M138 70h48" />
      <BrandMark />
    </FigureFrame>
  )
}
