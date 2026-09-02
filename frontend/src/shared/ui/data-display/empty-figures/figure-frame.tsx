import type * as React from 'react'

export function FigureFrame({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <svg
      viewBox="0 0 200 104"
      role="img"
      aria-label={label}
      className="h-32 w-auto text-foreground"
    >
      {children}
    </svg>
  )
}

export function DashedRect({
  x = 14,
  y = 20,
  width = 172,
  height = 64,
  rx = 12,
}: {
  x?: number
  y?: number
  width?: number
  height?: number
  rx?: number
}) {
  return (
    <rect
      x={x}
      y={y}
      width={width}
      height={height}
      rx={rx}
      fill="none"
      stroke="currentColor"
      strokeWidth="5"
      strokeDasharray="6 10"
      strokeLinecap="round"
      opacity="0.25"
    />
  )
}

export function DashedCircle({
  cx = 100,
  cy = 52,
  r = 42,
}: {
  cx?: number
  cy?: number
  r?: number
}) {
  return (
    <circle
      cx={cx}
      cy={cy}
      r={r}
      fill="none"
      stroke="currentColor"
      strokeWidth="5"
      strokeDasharray="6 10"
      strokeLinecap="round"
      opacity="0.25"
    />
  )
}

export function DashedPath({ d }: { d: string }) {
  return (
    <path
      d={d}
      fill="none"
      stroke="currentColor"
      strokeWidth="5"
      strokeDasharray="6 10"
      strokeLinecap="round"
      strokeLinejoin="round"
      opacity="0.25"
    />
  )
}

export function BrandMark({ x = 66, y = 18 }: { x?: number; y?: number }) {
  return (
    <g className="text-logo" transform={`translate(${x} ${y})`}>
      <path
        d="M6 34h56"
        stroke="currentColor"
        strokeWidth="6"
        strokeLinecap="round"
        opacity="0.4"
      />
      <circle cx="6" cy="34" r="6" fill="currentColor" opacity="0.4" />
      <circle cx="62" cy="34" r="6" fill="currentColor" opacity="0.4" />
      <circle
        cx="34"
        cy="34"
        r="19"
        fill="none"
        stroke="currentColor"
        strokeWidth="6"
        strokeDasharray="11 9"
        className="motion-safe:animate-[spin_9s_linear_infinite] [transform-box:fill-box] [transform-origin:center]"
      />
    </g>
  )
}
