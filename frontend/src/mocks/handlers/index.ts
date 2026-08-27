import { http } from 'msw'
import { API, errorResponse } from '../http'
import { adminEventHandlers } from './admin-event.handlers'
import { auditHandlers } from './audit.handlers'
import { authHandlers } from './auth.handlers'
import { deadlineHandlers } from './deadline.handlers'
import { eventHandlers } from './event.handlers'
import { inviteHandlers } from './invite.handlers'
import { opsHandlers } from './ops.handlers'
import { participantHandlers } from './participant.handlers'
import { participantBatchHandlers } from './participant-batch.handlers'
import { profileHandlers } from './profile.handlers'
import { registrationHandlers } from './registration.handlers'
import { registrationRuleHandlers } from './registration-rule.handlers'
import { registrationStatusHandlers } from './registration-status.handlers'
import { scheduleHandlers } from './schedule.handlers'
import { stageHandlers } from './stage.handlers'
import { userHandlers } from './user.handlers'

const notImplemented = http.all(`${API}/*`, ({ request }) =>
  errorResponse(
    501,
    'mock_not_implemented',
    `Мок для ${request.method} ${new URL(request.url).pathname} ещё не написан`,
  ),
)

export const handlers = [
  ...authHandlers,
  ...profileHandlers,
  ...eventHandlers,
  ...adminEventHandlers,
  ...stageHandlers,
  ...participantHandlers,
  ...participantBatchHandlers,
  ...registrationHandlers,
  ...registrationRuleHandlers,
  ...registrationStatusHandlers,
  ...scheduleHandlers,
  ...userHandlers,
  ...inviteHandlers,
  ...auditHandlers,
  ...deadlineHandlers,
  ...opsHandlers,
  notImplemented,
]
