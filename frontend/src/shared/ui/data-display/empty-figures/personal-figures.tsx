import { BrandMark, DashedCircle, DashedPath, DashedRect, FigureFrame } from './figure-frame'

export function TaskFigure({ label }: { label: string }) {
  return (
    <FigureFrame label={label}>
      <DashedRect x={14} y={18} width={20} height={20} rx={6} />
      <DashedRect x={14} y={66} width={20} height={20} rx={6} />
      <DashedPath d="M44 28h40" />
      <DashedPath d="M44 76h56" />
      <DashedPath d="M158 22l10 10 18-18" />
      <BrandMark />
    </FigureFrame>
  )
}

export function NoteFigure({ label }: { label: string }) {
  return (
    <FigureFrame label={label}>
      <DashedPath d="M34 14h100l32 32v44H34z" />
      <DashedPath d="M134 14v32h32" />
      <BrandMark />
    </FigureFrame>
  )
}

export function ArtifactFigure({ label }: { label: string }) {
  return (
    <FigureFrame label={label}>
      <DashedRect x={12} y={30} width={44} height={44} rx={10} />
      <DashedRect x={144} y={30} width={44} height={44} rx={10} />
      <DashedPath d="M62 52h76" />
      <BrandMark />
    </FigureFrame>
  )
}

export function OutcomeFigure({ label }: { label: string }) {
  return (
    <FigureFrame label={label}>
      <DashedPath d="M70 16h60v26a30 30 0 0 1-60 0z" />
      <DashedPath d="M70 22H50v12a20 20 0 0 0 20 18" />
      <DashedPath d="M130 22h20v12a20 20 0 0 1-20 18" />
      <DashedPath d="M84 90h32" />
      <BrandMark y={44} />
    </FigureFrame>
  )
}

export function RetroFigure({ label }: { label: string }) {
  return (
    <FigureFrame label={label}>
      <DashedCircle cx={44} cy={52} r={26} />
      <DashedCircle cx={156} cy={52} r={26} />
      <DashedPath d="M78 52h44" />
      <BrandMark />
    </FigureFrame>
  )
}

export function HistoryFigure({ label }: { label: string }) {
  return (
    <FigureFrame label={label}>
      <DashedPath d="M14 88h172" />
      <DashedRect x={24} y={58} width={26} height={26} rx={7} />
      <DashedRect x={88} y={38} width={26} height={46} rx={7} />
      <DashedRect x={152} y={20} width={26} height={64} rx={7} />
      <BrandMark y={6} />
    </FigureFrame>
  )
}
