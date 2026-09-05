export const PHONE_MAX_WIDTH = 768

export const PHONE_MAX_HEIGHT = 540

export const TOUCH_QUERY = '(pointer: coarse)'

export const PHONE_PORTRAIT_QUERY = `(max-width: ${PHONE_MAX_WIDTH - 1}px)`

export const PHONE_LANDSCAPE_QUERY = `(max-height: ${PHONE_MAX_HEIGHT - 1}px) and ${TOUCH_QUERY}`

export const PHONE_QUERY = `${PHONE_PORTRAIT_QUERY}, ${PHONE_LANDSCAPE_QUERY}`

export const SAFE_TOP = 'safe-pt'

export const SAFE_BOTTOM = 'safe-pb'

export const SAFE_SIDES = 'safe-px'

export const TAP_TARGET = 'min-h-tap min-w-tap'

export const BAR_SURFACE = 'border-border bg-card'

export const PHONE_GUTTER = 'px-4'

export const TABLET_GUTTER = 'sm:px-6'

export const BAR_INSET_BOTTOM = 'safe-inset-b'
