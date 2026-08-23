import { http } from 'msw'
import { API, errorResponse } from '../http'
import { authHandlers } from './auth'
import { directoryHandlers } from './directory'
import { hackathonHandlers } from './hackathons'
import { participantHandlers } from './participants'
import { profileHandlers } from './profile'
import { registrationHandlers } from './registration'
import { stageHandlers } from './stages'

/**
 * Заглушка для ещё не смоканных endpoint. Возвращает явную ошибку вместо
 * пустого ответа, чтобы недостающий мок был заметен сразу.
 */
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
  ...hackathonHandlers,
  ...stageHandlers,
  ...participantHandlers,
  ...registrationHandlers,
  ...directoryHandlers,
  notImplemented,
]
