export type ChannelState = 'unlinked' | 'pending' | 'linked'

export function channelState({
  linked,
  pending,
}: {
  linked: boolean
  pending: boolean
}): ChannelState {
  if (pending) return 'pending'
  return linked ? 'linked' : 'unlinked'
}

export const CHANNEL_STATE_TONE = {
  unlinked: 'neutral',
  pending: 'outline',
  linked: 'primary',
} as const

export const CHANNEL_STATE_LABEL = {
  unlinked: 'account.channelUnlinked',
  pending: 'account.channelPending',
  linked: 'account.channelLinked',
} as const
