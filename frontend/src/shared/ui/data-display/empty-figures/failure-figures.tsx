import { BrandMark, DashedCircle, DashedPath, DashedRect, FigureFrame } from './figure-frame'

export function OfflineFigure({ label }: { label: string }) {
  return (
    <FigureFrame label={label}>
      <DashedPath d="M14 74a48 48 0 0 1 40-22" />
      <DashedPath d="M186 74a48 48 0 0 0-40-22" />
      <DashedPath d="M74 88 126 20" />
      <BrandMark />
    </FigureFrame>
  )
}

export function NetworkFigure({ label }: { label: string }) {
  return (
    <FigureFrame label={label}>
      <DashedRect x={12} y={30} width={44} height={44} rx={8} />
      <DashedRect x={144} y={30} width={44} height={44} rx={8} />
      <DashedPath d="M62 52h18" />
      <DashedPath d="M120 52h18" />
      <BrandMark />
    </FigureFrame>
  )
}

export function TimeoutFigure({ label }: { label: string }) {
  return (
    <FigureFrame label={label}>
      <DashedCircle cx={40} cy={52} r={26} />
      <DashedPath d="M40 34v18h14" />
      <DashedPath d="M96 30h88" />
      <DashedPath d="M96 74h88" />
      <BrandMark x={112} y={18} />
    </FigureFrame>
  )
}

export function ServerFigure({ label }: { label: string }) {
  return (
    <FigureFrame label={label}>
      <DashedRect x={14} y={14} width={172} height={30} rx={8} />
      <DashedRect x={14} y={60} width={172} height={30} rx={8} />
      <DashedPath d="M30 29h14" />
      <DashedPath d="M30 75h14" />
      <BrandMark />
    </FigureFrame>
  )
}

export function DeniedFigure({ label }: { label: string }) {
  return (
    <FigureFrame label={label}>
      <DashedPath d="M100 12 24 44v24c0 18 32 30 76 36 44-6 76-18 76-36V44Z" />
      <BrandMark />
    </FigureFrame>
  )
}

export function MissingFigure({ label }: { label: string }) {
  return (
    <FigureFrame label={label}>
      <DashedCircle cx={100} cy={52} r={40} />
      <DashedPath d="M74 30 126 74" />
      <BrandMark />
    </FigureFrame>
  )
}
