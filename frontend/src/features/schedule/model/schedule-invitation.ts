export const SCHEDULE_INVITATION_KEY = 'timeline.schedule-invitation.shown'

export function readInvitationShown(): boolean {
  try {
    return window.sessionStorage.getItem(SCHEDULE_INVITATION_KEY) === '1'
  } catch {
    return false
  }
}

export function writeInvitationShown(): void {
  try {
    window.sessionStorage.setItem(SCHEDULE_INVITATION_KEY, '1')
  } catch {
    return
  }
}
