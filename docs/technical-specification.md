# ТЕХНИЧЕСКОЕ ЗАДАНИЕ

**Timeline**

Исполнимая спецификация MVP

| **Параметр** | **Значение** |
|----|----|
| Версия | 0.9 |
| Дата | 28 августа 2026 |
| Статус | Проект к согласованию |
| Архитектура | Модульный монолит на Go · PostgreSQL · REST/JSON API · React SPA · отдельный worker/scheduler |
| Основные роли | Пользователь, глобальный администратор MVP |
| Нормативность | Требования v0.7 обязательны для MVP; отложенные решения перечислены отдельно |

| **Ключевая оговорка:** Timeline не проверяет внешний сайт. Статус регистрации является самоотчётом пользователя либо административно установленным состоянием, а не объективно подтверждённым фактом. |
|----|

## Что зафиксировано в v0.9

- раздел 3.1: список собственных Session и отзыв одной Session; user_agent и ip отдаются только владельцу;

- раздел 9.7: предпросмотр уведомления без создания записи, без занятия logical_key и без обращения к provider, на языке получателя;

- раздел 9.8: построчная диагностика очереди — терминальные отказы с причиной и зависшие PROCESSING lease.

## Что зафиксировано в v0.8

- напоминания после дедлайна: NotificationRule.offset_minutes стал знаковым, добавлен тип REGISTRATION_OVERDUE;

- явно зафиксировано, что Stage не порождает уведомлений в MVP;

- устранено расхождение между запросом overdue в разделе 17 и набором правил уведомлений;

- определена семантика attempt_count при переключении канала после permanent-ошибки;

- зафиксирован технологический стек MVP (раздел 14.1) и детальный frontend-стек (раздел 14.2).

## Что зафиксировано в v0.7

- однозначные модели Auth, Participation, Registration и RegistrationStatus;

- версионируемая дедупликация уведомлений и полный жизненный цикл worker;

- правила активации Registration, изменения дедлайна и повторного назначения;

- ограничения целостности БД, расширенная приёмка и сквозная трассировка;

- повторяемые заголовки таблиц, корректные переносы и единая нумерация.

# 0. Как читать документ

Требования сформулированы как обязательные решения MVP. Если отдельная деталь вынесена в раздел 21, она не должна влиять на реализацию первой версии. Точные DTO и HTTP-коды уточняются в OpenAPI, но OpenAPI не может менять доменные правила и переходы, зафиксированные здесь.

| **Приоритет:** При противоречии между описательным текстом, таблицей модели и приёмочным сценарием действует более строгая формулировка. Обнаруженное противоречие исправляется в ТЗ до реализации, а не разрешается разработчиком по собственному усмотрению. |
|----|

# 1. Назначение и границы MVP

Timeline — внутренняя веб-система, заменяющая Excel-таблицы и ручной контроль в мессенджерах. Система хранит события, этапы, назначенных участников, их функции, заявленные статусы внешней регистрации, правила напоминаний и историю административных изменений.

| **Входит в MVP** | **Не входит в MVP** |
|----|----|
| Email/password регистрация, вход, подтверждение email, восстановление доступа и Invite | SSO, социальный вход и автоматическое создание корпоративных учётных записей |
| Профиль, привязка Telegram, выбор канала | Конструктор анкет и хранение документов/чувствительных регистрационных данных |
| События, этапы, публикация, архивирование и Шкала | Автоматический поиск/парсинг событий и мобильное приложение |
| Назначение участников, одна свободнотекстовая роль, массовые операции | Несколько команд внутри события и несколько ролей участника |
| Одна персональная Registration на Event, TODO/DONE/NOT_REQUIRED | Командная регистрация и внешняя автоматическая проверка |
| Telegram, Email fallback, правила напоминаний, retry и аудит | Дополнительные каналы, локализация шаблонов, универсальный Action Tracking |

# 2. Роли и права доступа

| **Операция** | **Пользователь** | **Администратор** |
|----|----|----|
| Регистрация, вход, logout, восстановление | Собственная учётная запись | Собственная учётная запись |
| Просмотр и изменение профиля | Свой профиль | Свой профиль; просмотр минимальных данных участников |
| Изменение email/Telegram | Только свои данные с повторной проверкой | Не изменяет чужие credentials через UI |
| Мои события / Шкала | Только свои назначения | Все события и назначения |
| Event и Stage | Только чтение опубликованных назначенных | Создание, изменение, публикация, архивирование |
| Каталог событий | Чтение всех опубликованных неархивных Event без административных notes | То же плюс полная карточка с notes |
| Участники и team_role | Самозапись в опубликованный незавершённый Event со своей ролью; чужие назначения недоступны | Добавление, массовое добавление, изменение, удаление, реактивация |
| Собственный RegistrationStatus | TODO → DONE | Просмотр всех; допустимые административные переходы |
| NotificationRule | Нет | Создание, изменение, выключение |
| AuditLog | Нет | Только чтение и фильтрация |
| Деактивация User | Запрос деактивации своей учётной записи | Деактивация и обратная активация |
| Удаление User | Запрос удаления своей учётной записи | Исполнение необратимого удаления с обезличиванием |

Администратор является глобальным в рамках MVP; администраторов может быть несколько. Первый администратор создаётся seed/config при развёртывании. Самостоятельное получение admin-прав запрещено. Изменение флага администратора выполняется только операционной процедурой вне пользовательского UI и фиксируется в AuditLog.

# 3. Аутентификация, сессии и onboarding

| **Решение** | **Требование MVP** |
|----|----|
| Credentials | Уникальный нормализованный email + пароль; password_hash — Argon2id с параметрами из конфигурации безопасности |
| Access | Короткоживущий access token, 15 минут, в HttpOnly Secure SameSite=Lax cookie |
| Refresh/session | Rotating refresh token, 30 дней; в cookie хранится token, в БД — только hash; повторное использование отозванного token отзывает цепочку сессии |
| CSRF | Все изменяющие cookie-auth запросы требуют CSRF token; CORS разрешает только настроенные origins |
| Email verification | Одноразовый token, 24 часа; до проверки вход разрешён, продуктовые email-уведомления запрещены |
| Password reset | Одноразовый token, 30 минут; после сброса все активные Session пользователя отзываются |
| Invite | Одноразовый token, 72 часа; приглашение не создаёт User до завершения регистрации |
| Email change | Новый email хранится как pending_email и становится основным только после подтверждения; прежний email действует до завершения смены |
| Auth-email | Письма verification/reset/invite разрешены независимо от email_verified_at; запрет касается только продуктовых напоминаний |
| Rate limits | Login: 10 попыток/15 мин на IP+email; reset/invite resend: 5/час на IP+email; значения конфигурируемы |

| **Сущность** | **Минимальные поля и ограничения** |
|----|----|
| Session | id, user_id, refresh_token_hash UNIQUE, expires_at, last_used_at, revoked_at, created_at; N:1 User |
| OneTimeToken | id, user_id nullable, purpose, token_hash UNIQUE, target_email, expires_at, consumed_at, created_at; token одноразовый |
| Invite | id, normalized_email, created_by_user_id, token_hash UNIQUE, expires_at, accepted_at, revoked_at, created_at; partial UNIQUE(normalized_email) для unaccepted/unrevoked |

- Администратор выбирает участника только из зарегистрированных активных User; для отсутствующего человека сначала создаётся Invite.

- Invite на normalized_email, которому уже соответствует существующий User, отклоняется с ошибкой конфликта независимо от его is_active: активного User Admin добавляет напрямую, деактивированного — сначала активирует.

- Create/resend Invite сериализуется по normalized_email: предыдущий unaccepted/unrevoked Invite сначала получает revoked_at, затем создаётся новый. После успешной регистрации все остальные неистёкшие Invite этого normalized_email отзываются в той же транзакции.

- При деактивации User все Session отзываются, Telegram binding удаляется, все PENDING уведомления этого получателя переводятся в CANCELLED, новые уведомления не создаются. Reconciliation пропускает неактивных User.

- Telegram binding выполняется одноразовым deep-link/token, связанным с текущим User; chat_id нельзя передать обычным PATCH профиля.

## 3.1 Список собственных сессий

Пользователь видит свои активные Session и завершает любую из них по отдельности. Список нужен, чтобы «выйти везде» перестало быть единственным способом отреагировать на чужое устройство.

| **Решение** | **Требование MVP** |
|----|----|
| Область видимости | Только собственные Session вызывающего. Чужие Session не показываются никому, включая администратора: это отдельная операционная процедура вне пользовательского API (раздел 12) |
| Состав записи | id, user_agent, ip, created_at, last_used_at, expires_at и признак текущей Session |
| Признак текущей | Определяется session_id из access token вызывающего запроса, а не по cookie refresh-токена и не по совпадению user_agent |
| Фильтр | Отдаются только активные Session: revoked_at IS NULL и expires_at \> now. Отозванные и истёкшие не показываются — история входов в MVP не ведётся |
| Персональные данные | user_agent и ip — персональные данные владельца. Они отдаются владельцу и никому больше; в аудит и в логи из этого endpoint не попадают |
| Отзыв одной Session | Идемпотентен: повторный отзыв уже отозванной или истёкшей Session завершается успешно. Чужой либо несуществующий идентификатор — 404, поскольку факт существования чужой Session раскрывать нельзя (раздел «403 против 404» соглашений API) |
| Отзыв текущей Session | Разрешён и равносилен logout: cookie очищаются тем же ответом |
| Ограничение частоты | Список и отзыв ограничены по частоте на учётную запись; значения конфигурируемы |

# 4. User и профиль

| **Поле** | **Тип / обязательность** | **Правило** |
|----|----|----|
| id | UUID, PK | Система |
| display_name | string(120), required | Пользователь; администратор может исправить с аудитом |
| email | string(254), required, unique | Нормализованный основной email для входа |
| pending_email | string(254), nullable | Ожидает подтверждения; также проверяется на уникальность |
| password_hash | string, required | Не возвращается API и не попадает в логи/audit snapshots |
| email_verified_at | datetime UTC, nullable | NULL блокирует продуктовые email-уведомления |
| telegram_username | string(64), nullable | Справочное поле |
| telegram_chat_id | string, nullable, unique | Устанавливается только подтверждённым binding-flow |
| preferred_channel | TELEGRAM \| EMAIL \| NULL | Default NULL; ненулевое значение означает явный выбор User, доступность проверяется при отправке |
| is_admin | boolean, required | Default false; не изменяется пользовательским API |
| is_active | boolean, required | Default true; false запрещает вход и новые доставки |
| created_at / updated_at | datetime UTC | Система |

В MVP не хранятся документы, чувствительные регистрационные анкеты и произвольный JSON profile_data. Расширение профиля требует отдельной миграции, матрицы доступа и срока хранения.

| **Деактивация и удаление — разные операции:** Деактивация обратима: is_active становится false, Session отзываются, Telegram binding удаляется, PENDING уведомления отменяются, но display_name и email сохраняются. Администратор может вернуть is_active. Удаление аккаунта необратимо: credentials и каналы доставки удаляются, display_name и email обезличиваются техническими значениями, восстановление невозможно. Ссылки Participant и AuditLog сохраняются в обоих случаях. |
|----|

| **Retention:** Через 90 дней очищается только Notification.payload_json; сама строка Notification вместе с logical_key сохраняется. Удаление строк Notification запрещено, поскольку logical_key является единственной гарантией недедупликации: без него reconciliation пересоздаст уже отправленное уведомление для статуса, оставшегося в TODO. AuditLog хранится 365 дней по умолчанию. Сроки конфигурируемы политикой эксплуатации. |
|----|

# 5. Event и Stage

## 5.1 Event

| **Поле**                | **Тип / правило**                           |
|-------------------------|---------------------------------------------|
| id                      | UUID, PK                                    |
| title                   | string(200), required, trim                 |
| description             | text, nullable                              |
| organizer               | string(200), nullable                       |
| website_url             | HTTPS URL, nullable                         |
| notes                   | text, nullable; видны только Admin          |
| kind                    | HACKATHON \| MEETUP, required, default HACKATHON |
| format                  | ONLINE \| OFFLINE \| HYBRID, required, default ONLINE; **заявленный** формат: умолчание для этапов и быстрый фильтр каталога |
| origin                  | RU \| WORLD, required, default RU           |
| country_code            | char(2) ISO 3166-1 alpha-2, nullable; обязателен при format ≠ ONLINE |
| city                    | string(120), nullable                       |
| track                   | string(120), nullable; направление внутри события |
| prize_pool              | numeric(14,2), nullable; **число, не строка** |
| prize_currency          | char(3) ISO 4217, nullable; задаётся и очищается вместе с prize_pool |
| team_size_max           | integer 1..100, nullable                    |
| start_at / end_at       | datetime UTC, required; end_at \> start_at  |
| published_at            | datetime UTC, nullable; NULL = UNPUBLISHED  |
| archived_at             | datetime UTC, nullable; non-NULL = ARCHIVED |
| created_at / updated_at | datetime UTC                                |

**Фактический формат события вычисляется, а не хранится.** Собственный `format` события — заявленное значение; в ответах API оно остаётся в поле `format`, а вычисленное отдаётся отдельным полем `effective_format`. Правило: заявленный формат задаёт нижнюю границу, каждый этап с собственным `format` добавляет свидетельство очной или онлайновой части, и если есть и то и другое — событие HYBRID. Этап без собственного `format` наследует место события и нового свидетельства не несёт. Это снимает расхождение «в шапке онлайн, а финал в Москве». Пересчёт курса валют не выполняется: сумма показывается со своей валютой, суммы в разных валютах напрямую не сравниваются.

Для опубликованного неархивного Event вычисляется состояние: UPCOMING при now \< start_at; ACTIVE при start_at ≤ now ≤ end_at; FINISHED при now \> end_at. ARCHIVED имеет приоритет над вычисляемым состоянием. Изменение start_at или end_at разрешено Admin и фиксируется в AuditLog. Поскольку end_at ограничивает окно правил просрочки раздела 9.4, изменение end_at увеличивает Registration.schedule_version на 1 и запускает reconciliation: устаревшие PENDING отменяются, актуальные создаются заново. Новое значение end_at обязано удовлетворять CHECK deadline_at ≤ end_at, иначе операция отклоняется. Unpublish и восстановление из ARCHIVED не входят в MVP. Hard delete Event через UI не поддерживается.

## 5.2 Stage

| **Поле** | **Тип / правило** |
|----|----|
| id / event_id | UUID PK / FK Event, required |
| name | string(120), required, trim |
| type | REGISTRATION, SELECTION, PARTICIPATION, CHECKPOINT, SUBMISSION, DEMO, RESULTS, OTHER |
| start_at / end_at | datetime UTC, required; end_at \> start_at |
| description / url | nullable text / HTTPS URL |
| format | ONLINE \| OFFLINE \| HYBRID, **nullable**; NULL = «как у события» |
| country_code | char(2), nullable; обязателен при format ∈ {OFFLINE, HYBRID} |
| city | string(120), nullable |
| venue | string(200), nullable; площадка, адрес или название места |
| online_url | HTTPS URL, nullable; ссылка на трансляцию или встречу |
| sort_order | integer, required, default 0 |
| created_at / updated_at | datetime UTC |

**Место принадлежит этапу, а не только событию.** Рабочие таблицы фиксируют формат как «Гибрид; сам онлайн, финал очный (Казань)»: отбор идёт онлайн, финал — в конкретном городе. Поэтому те же поля места живут и на этапе.

**Наследование, а не дублирование.** Пустое поле этапа означает «как у события», а не «неизвестно»: иначе у события с десятью этапами один и тот же город пришлось бы повторить десять раз, и при первой же правке значения разъехались бы. Разрешение выполняется в слое чтения, и API отдаёт у каждого этапа поле `place` с итоговым местом и признаком `inherited`. Правило целостности допускает NULL: `CHECK (format IS NULL OR format = 'ONLINE' OR country_code IS NOT NULL)`. У этапа с собственным очным форматом незаполненные `country_code` и `city` берутся у события; у онлайнового этапа страна и город очищаются. `venue` и `online_url` принадлежат только этапу и не наследуются.

Фильтр каталога по формату OFFLINE и HYBRID ищет **по этапам**: событие с собственным форматом ONLINE попадает в выборку, если хотя бы один его этап проходит очно. Иначе фильтр «очные» терял бы смысл для гибридов.

Stage может пересекаться с другими Stage и выходить за общий период Event; UI показывает предупреждение, но отдельного подтверждающего флага и скрытого бизнес-состояния нет. Stage типа REGISTRATION служит только Шкале и не владеет Registration. Stage не порождает уведомлений: единственный источник напоминаний в MVP — Registration.deadline_at и её NotificationRule. Даты Stage отображаются на Шкале и в карточке, но не планируются worker-ом.

## 5.3 Каталог

Каталог — список всех опубликованных неархивных Event независимо от того, назначен ли
на них читатель. Это единственная read-модель, показывающая событие непричастному
пользователю, поэтому она отдаёт **отдельный DTO**, а не сокращённую карточку: набор
полей задан явно и административные `notes` в него не входят структурно, а не за счёт
фильтрации на выходе. Условие видимости одно и то же для всех: `published_at IS NOT
NULL AND archived_at IS NULL`. Неопубликованное и архивное событие не видно в каталоге
никому, включая администратора, — для них существует административный список.

**Охват (origin).** `origin` — обязательное поле со значением по умолчанию `RU`, оно
не бывает пустым. Поэтому вид «Россия» — это `origin = RU`, вид «Мир» — `origin =
WORLD`, а вид «Все» просто не передаёт фильтр. Событие принадлежит ровно одному из
первых двух видов и всегда попадает в третий; выпасть из всех трёх оно не может.
`origin` описывает происхождение события, а не место его проведения: российское
событие может иметь очный этап за рубежом, и наоборот.

**Формат.** Фильтр по `format` работает по правилу раздела 5.2: `OFFLINE` и `HYBRID`
дополнительно находят событие, чей собственный формат `ONLINE`, если хотя бы один его
этап проходит очно. Ответ несёт и заявленный `format`, и вычисленный
`effective_format`, и список очных этапов с их местом.

**Состояние** вычисляется от текущего момента так же, как в разделе 5.1, и может
служить фильтром: UPCOMING, ACTIVE, FINISHED.

**Доступ и ограничение частоты.** Каталог доступен только аутентифицированному
пользователю. Анонимный доступ в MVP не открывается: система внутренняя (раздел 1),
периметр везде закрыт cookie-аутентификацией, а публичный список дал бы неаутентифи-
цированному клиенту перечисление всех событий организации вместе с организаторами и
призовыми фондами. Открытие каталога наружу — решение после MVP (раздел 21), и до него
`GET /catalog` возвращает `401` без сессии. Независимо от аутентификации каталог несёт
собственное ограничение частоты (приложение C), потому что он тяжелее прочих чтений:
поиск подстрокой, фильтры и подгрузка этапов страницы. Ключ ограничения — учётная
запись, ответ при превышении — `429` с кодом `rate_limited`.

# 6. EventParticipant

| **Поле** | **Тип / правило** |
|----|----|
| id | UUID, PK |
| event_id / user_id | FK, required; одна логическая запись на пару |
| team_role | string(80), trim; функция участника на Event, не permission. Обязателен при Event.kind = HACKATHON, необязателен при kind = MEETUP |
| participation_status | ASSIGNED \| REMOVED |
| assignment_version | integer ≥ 1; увеличивается при REMOVED → ASSIGNED |
| assigned_at / removed_at | datetime UTC / nullable datetime UTC |
| created_at / updated_at | datetime UTC |
| Уникальность | UNIQUE(event_id, user_id); повторное добавление реактивирует запись |

- При реактивации participation_status становится ASSIGNED, assignment_version увеличивается, assigned_at обновляется, removed_at очищается, team_role задаётся заново и создаётся AuditLog.

- Существующий RegistrationStatus сохраняется. Для TODO при активной Registration создаётся новое первичное уведомление для текущей пары assignment_version/activation_version; DONE и NOT_REQUIRED не сбрасываются автоматически.

- REMOVED исключает участника из пользовательских read-моделей и блокирует новые уведомления; уже SENT остаются в истории.

**У митапа ролей нет.** `team_role` описывает функцию в команде, а митап командой не
делится: требовать роль значило бы заставлять пользователя выдумывать её. Поэтому при
`Event.kind = MEETUP` поле необязательно и хранится как NULL; при `kind = HACKATHON`
оно по-прежнему обязательно. Правило действует одинаково на административном
назначении, массовых операциях и самозаписи.

**Самозапись.** Кроме административного назначения запись создаёт сам пользователь
действием «участвую» на опубликованном неархивном Event, указывая свою роль. Правила
те же, что у административного добавления: повторная запись при существующей REMOVED
реактивирует строку с увеличением assignment_version, при активной Registration
создаётся RegistrationStatus в TODO и первичное уведомление. Отличия ровно два:
инициатором в AuditLog является сам пользователь, а запись в уже завершившийся Event
(now > end_at) отклоняется — назначить участника задним числом может только
администратор. Самозапись не даёт никаких прав администратора и не отменяет раздел 2:
чужие назначения пользователю по-прежнему недоступны.

# 7. Registration и её жизненный цикл

Event имеет 0..1 логическую Registration. Существование ACTIVE Registration означает, что внешняя регистрация требуется всем ASSIGNED участникам по умолчанию; индивидуальное исключение задаётся RegistrationStatus=NOT_REQUIRED. Командная регистрация не поддерживается.

| **Поле** | **Тип / правило** |
|----|----|
| id / event_id | UUID PK / FK Event UNIQUE, required |
| url | HTTPS URL, required для ACTIVE |
| deadline_at | datetime UTC, required для ACTIVE; обязано выполняться deadline_at ≤ Event.end_at, чтобы правила просрочки успевали сработать. Значение раньше Event.start_at допустимо: внешняя регистрация обычно закрывается до старта |
| event_end_at | datetime UTC, денормализованная копия Event.end_at; поддерживается составным внешним ключом с ON UPDATE CASCADE и не изменяется приложением напрямую |
| description | text, nullable |
| state | ACTIVE \| DISABLED |
| schedule_version | integer ≥ 1; версия дедлайна и набора правил |
| activation_version | integer ≥ 1; увеличивается при DISABLED → ACTIVE |
| notification_content_version | integer ≥ 1; в MVP увеличивается при изменении Registration.url |
| created_at / updated_at | datetime UTC |

| **Событие** | **Обязательное поведение** |
|----|----|
| Создание ACTIVE Registration | Для всех ASSIGNED создаётся отсутствующий RegistrationStatus=TODO. Первичное уведомление создаётся только если Event опубликован и неархивен; для неопубликованного Event статусы создаются, а уведомления откладываются до публикации |
| ACTIVE → DISABLED | PENDING отменяются; PROCESSING проверяет актуальность до provider call; статусы сохраняются, но не считаются actionable |
| DISABLED → ACTIVE | activation_version и schedule_version +1; отсутствующие статусы создаются; TODO снова получает первичное уведомление при условии опубликованного неархивного Event |
| Изменение deadline_at | schedule_version +1; старые PENDING отменяются; новые reminders получают новый logical_key; SENT сохраняются |
| Изменение scheduling-полей Rule | schedule_version +1 один раз на транзакцию; выполняется reconciliation уведомлений |
| Изменение Registration.url | notification_content_version +1; все связанные PENDING отменяются; reconciliation создаёт актуальные required/reminder с новым payload и logical_key; SENT сохраняются |
| Создание после назначения | Обрабатываются все текущие ASSIGNED в той же транзакции/фоновой пакетной операции с идемпотентным продолжением |
| Удаление | После появления RegistrationStatus hard delete запрещён; используется DISABLED |

Каноническая ссылка хранится только в Registration.url. Stage.url относится к конкретному этапу. Event.registration_url отсутствует. URL является actionable-контентом: его изменение обязательно версионируется через notification_content_version, чтобы PENDING не отправляли устаревшую ссылку.

# 8. RegistrationStatus

| **Поле** | **Тип / правило** |
|----|----|
| id | UUID, PK |
| event_id | FK Event; намеренно денормализован для составных ограничений целостности и не должен удаляться как вычисляемый |
| registration_id | FK Registration, required |
| participant_id | FK EventParticipant, required |
| status | TODO \| DONE \| NOT_REQUIRED |
| todo_cycle | integer ≥ 1; увеличивается при каждом переходе в TODO |
| registered_at | datetime UTC только при DONE; очищается при выходе из DONE |
| last_change_source | SYSTEM \| USER \| ADMIN |
| last_changed_by_user_id | nullable FK User |
| note | nullable text; только Admin |
| created_at / updated_at | datetime UTC |
| Уникальность | UNIQUE(registration_id, participant_id) |

| **Ограничение deadline_at ≤ end_at:** Обычный CHECK в PostgreSQL не может ссылаться на другую таблицу, поэтому правило выражается денормализацией. Event получает UNIQUE(id, end_at). Registration хранит event_end_at и составной внешний ключ (event_id, event_end_at) → events(id, end_at) с ON UPDATE CASCADE, плюс собственный CHECK deadline_at ≤ event_end_at. Изменение Event.end_at каскадно обновляет копию, и попытка сдвинуть окончание события раньше действующего дедлайна отклоняется базой, а не приложением. Допустима эквивалентная реализация через constraint trigger; проверка только в application layer недостаточна. |
|----|

| **Целостность БД:** RegistrationStatus обязан связывать Registration и EventParticipant одного Event. event_id хранится намеренно, хотя выводится по обеим связям: поле обеспечивает межсобытиеную ссылочную целостность составными UNIQUE/FK либо constraint trigger и не удаляется как избыточное. Проверка только в application layer недостаточна. |
|----|

- Создание статуса: TODO, todo_cycle=1, last_change_source=SYSTEM.

- Пользователь может выполнить только свой TODO → DONE при ASSIGNED, ACTIVE Registration и неархивном Event.

- Admin может TODO → DONE, DONE → TODO, TODO/DONE → NOT_REQUIRED и NOT_REQUIRED → TODO. Любой переход фиксируется в AuditLog.

- При входе в TODO todo_cycle увеличивается, registered_at очищается. История предыдущего состояния остаётся в AuditLog.

- DONE и NOT_REQUIRED отменяют будущие PENDING; REMOVED и DISABLED делают статус неактивным без изменения его значения.

# 9. Notifications, дедупликация и worker

## 9.1 NotificationRule

| **Поле** | **Тип / правило** |
|----|----|
| id / registration_id | UUID PK / FK Registration, required |
| offset_minutes | integer −525600..525600; минут относительно deadline_at. Положительное значение — до дедлайна, 0 — в момент дедлайна, отрицательное — после дедлайна (просрочка) |
| enabled | boolean, default true |
| slot_no | integer 1..10, required; порядковый слот правила внутри Registration |
| Уникальность слота | UNIQUE(registration_id, slot_no) вместе с CHECK slot_no BETWEEN 1 AND 10 ограничивает число правил десятью декларативно, без подсчёта соседних строк |
| channel_override | nullable TELEGRAM \| EMAIL |
| created_at / updated_at | datetime UTC |
| Уникальность | UNIQUE(registration_id, offset_minutes); DELETE после использования означает enabled=false |
| Тип уведомления | Определяется знаком offset_minutes: offset_minutes ≥ 0 создаёт REGISTRATION_REMINDER, offset_minutes \< 0 создаёт REGISTRATION_OVERDUE. Отдельного поля типа у Rule нет |

## 9.2 Notification

| **Поле** | **Тип / правило** |
|----|----|
| id | UUID, PK |
| notification_type | REGISTRATION_REQUIRED \| REGISTRATION_REMINDER \| REGISTRATION_OVERDUE |
| recipient_user_id | FK User, immutable recipient snapshot; проверяется против Participant при создании |
| registration_status_id / rule_id | FK / nullable FK для первичного уведомления |
| schedule_version / todo_cycle | nullable для первичного; обязательны для REGISTRATION_REMINDER и REGISTRATION_OVERDUE |
| assignment_version / activation_version | обязательны для REGISTRATION_REQUIRED |
| notification_content_version | обязателен для обоих типов; snapshot версии actionable-контента |
| logical_key | string, UNIQUE |
| requested_channel / actual_channel | channel / nullable channel до первой попытки. requested_channel — канал, выбранный правилами раздела 10 при создании; actual_channel — канал последнего выполненного provider call и перезаписывается при переключении |
| status | PENDING, PROCESSING, SENT, FAILED, CANCELLED, UNDELIVERABLE |
| scheduled_at / next_attempt_at | datetime UTC |
| attempt_count | integer default 0; счётчик выполненных provider call, максимум 4 на Notification. Переключение канала после permanent-ошибки тратит попытку; отсев недоступного канала до вызова — нет |
| locked_at / lock_expires_at | nullable datetime UTC; lease worker |
| provider_call_started_at | nullable datetime UTC; атомарная граница, после которой гарантированная отмена невозможна |
| sent_at | nullable datetime UTC |
| provider_message_id | nullable string |
| last_error_code / last_error_message | nullable; секреты и полный payload не логируются |
| payload_json | immutable snapshot шаблона и подстановок |
| created_at / updated_at | datetime UTC |

## 9.3 Logical key

| **Тип** | **Формат logical_key** |
|----|----|
| Первичное | required:{participant_id}:av{assignment_version}:rv{activation_version}:cv{notification_content_version} |
| Reminder | reminder:{registration_status_id}:{rule_id}:sv{schedule_version}:tc{todo_cycle}:cv{notification_content_version} |
| Overdue | overdue:{registration_status_id}:{rule_id}:sv{schedule_version}:tc{todo_cycle}:cv{notification_content_version} |

schedule_version изменяется при deadline/rule scheduling change, notification_content_version — при изменении Registration.url, todo_cycle — при новом цикле TODO, assignment_version — при реактивации участника, activation_version — при реактивации Registration. Поэтому новая бизнес-ситуация получает новый ключ, а повторная обработка той же ситуации — нет.

## 9.4 Scheduler и worker

1.  Scheduler запускается не реже одного раза в 5 минут и выполняет reconciliation только для опубликованных неархивных Event, ACTIVE Registration, ASSIGNED Participant, TODO RegistrationStatus и активных User. Reconciliation отвечает как за reminder и overdue по правилам, так и за отсутствующие первичные уведомления: если первичное уведомление не было создано в транзакции назначения из-за неопубликованного Event, оно создаётся здесь по тому же logical_key.

2.  Правило считается наступившим при now ≥ deadline_at − offset_minutes. Формула едина для обоих знаков: положительный offset срабатывает до дедлайна, отрицательный — после него.

3.  Для правила с offset_minutes ≥ 0: если правило создано после момента срабатывания, но до deadline_at, уведомление создаётся немедленно; после deadline_at преддедлайновое reminder не создаётся.

4.  Для правила с offset_minutes \< 0: уведомление создаётся не ранее момента срабатывания и не создаётся после Event.end_at. Просрочка адресуется только тем, у кого RegistrationStatus всё ещё TODO на момент reconciliation; DONE, NOT_REQUIRED, REMOVED, DISABLED и ARCHIVED исключают создание по общим правилам раздела 9.4.1.

5.  Конкурентные scheduler создают запись через INSERT с UNIQUE logical_key; конфликт считается успешной идемпотентной обработкой.

6.  Worker выбирает due PENDING по next_attempt_at с FOR UPDATE SKIP LOCKED или эквивалентом, переводит в PROCESSING и выдаёт lease на 2 минуты.

7.  Перед вызовом provider worker повторно проверяет status, версии, Participant, Registration, Event и is_active получателя. Неактуальная запись становится CANCELLED. После успешной проверки worker атомарно заполняет provider_call_started_at; с этого момента вызов считается начатым и гарантированная отмена невозможна.

8.  Временная ошибка: PROCESSING → PENDING; lease и provider_call_started_at текущей попытки очищаются, следующая попытка выполняет новую финальную проверку через 1, 5 и 30 минут. Всего одна первичная + три повторные попытки. После четвёртой неудачи — FAILED.

9.  Истёкший PROCESSING lease возвращается в PENDING recovery-задачей. Доставка имеет семантику at least once: после неопределённого timeout редкий дубль у provider допустим и должен мониториться.

10. Если provider поддерживает idempotency key, передаётся Notification.id. БД гарантирует отсутствие двух логических Notification, но не обещает exactly-once во внешнем канале.

## 9.5 Отмена и изменение расписания

- DONE, NOT_REQUIRED, REMOVED, DISABLED, ARCHIVED и деактивация получателя переводят связанные PENDING в CANCELLED.

- PROCESSING переводится в CANCELLED только пока provider_call_started_at IS NULL. После начала provider call доменная отмена выполняется best effort, а конечный статус определяется фактическим результатом попытки; успешная доставка фиксируется как SENT.

- Изменение deadline_at или scheduling-полей Rule увеличивает schedule_version, отменяет старые PENDING и позволяет создать новые версии. SENT сохраняются.

- Изменение Registration.url увеличивает notification_content_version, отменяет старые PENDING и создаёт новые актуальные Notification обоих типов. SENT и PROCESSING после provider_call_started_at не переписываются.

- DONE → TODO увеличивает todo_cycle. Новый цикл может получить актуальные reminders; уведомления старого цикла не переиспользуются и не дублируются.

## 9.6 Шаблоны

Продуктовые сообщения приходят получателю на его языке; в MVP по умолчанию русский. Тексты шаблонов хранятся не литералами в коде, а в JSON-словарях `backend/internal/locale/messages/<lang>.json`: их рендерит worker, у которого нет браузера, и снимок обязан фиксироваться на момент создания. Язык самого кода, логов и машинных кодов ошибок — английский (см. часть III2 плана рефакторинга). Immutable payload snapshot содержит название Event, registration URL, deadline в UTC и в системной таймзоне, тип уведомления и безопасный текст без административных notes. Шаблоны REGISTRATION_REQUIRED, REGISTRATION_REMINDER и REGISTRATION_OVERDUE различаются формулировкой; REGISTRATION_OVERDUE сообщает, что дедлайн уже прошёл, а отметка о регистрации не проставлена. Notification является снимком на момент создания: изменение несcheduling-контента Event, включая title, не меняет существующий payload_json; новые Notification используют актуальные данные. Исключение — Registration.url как actionable-ссылка: для неё действует обязательное версионирование из раздела 9.5. Системная таймзона развёртывания по умолчанию Europe/Moscow; все данные хранятся в UTC.

## 9.7 Предпросмотр уведомления

Администратор видит отрисованный текст уведомления до того, как правило начнёт действовать. Иначе ошибка в правиле обнаруживается только по факту доставки.

| **Решение** | **Требование MVP** |
|----|----|
| Побочные эффекты | Их нет. Предпросмотр не создаёт строку Notification, не занимает и не проверяет logical_key, не трогает состояние дедупликации, не обращается к provider и не пишет аудит |
| Что рендерится | Тот же шаблон и та же подстановка, что применил бы scheduler: название Event, registration URL, deadline в UTC и в системной таймзоне, тип уведомления |
| Язык | Язык получателя из его профиля (раздел 9.6), а не язык администратора. Предпросмотр обязан показывать текст, который увидит получатель |
| Выбор получателя | Предпросмотр строится для конкретного RegistrationStatus: у него уже есть и получатель, и Event, и Registration. Получатель, недоступный reconciliation по правилам раздела 9.4.1, для предпросмотра недоступен — 404 |
| Тип и правило | Тип задаётся явно либо выводится из знака offset_minutes существующего Rule по правилам раздела 9.1. Правило указывать необязательно: REGISTRATION_REQUIRED правила не имеет |
| Канал | Возвращается канал, который выбрали бы правила раздела 10, и признак его отсутствия. Отсутствие канала не является ошибкой предпросмотра: администратор должен увидеть именно это |
| Доступ | Только администратор. Тексты уведомлений содержат данные чужого назначения |
| Ограничение частоты | Ограничен по частоте на учётную запись; значение конфигурируемо |

## 9.8 Диагностика очереди

Раздел 18 требует наблюдать «PROCESSING lease, FAILED/UNDELIVERABLE». Агрегаты heartbeat отвечают на вопрос «сломано ли», но не на вопрос «что именно сломано», поэтому вводится построчная диагностика.

| **Решение** | **Требование MVP** |
|----|----|
| Что отдаётся | Две выборки: терминальные неудачи (FAILED и UNDELIVERABLE) с причиной и записи в PROCESSING, у которых lease_expires_at уже в прошлом |
| Состав строки | id, notification_type, status, requested_channel, actual_channel, failed_channels, attempt_count, scheduled_at, lease_expires_at, last_error, created_at, updated_at |
| Причина отказа | last_error как есть, без интерпретации: раздел 18 запрещает писать в логи секреты и полный payload, поэтому last_error и заполняется коротким безопасным текстом |
| Зависшая аренда | Определяется как status = PROCESSING AND lease_expires_at \< now. Это та же выборка, которую забирает recovery-задача раздела 9.4.9; endpoint показывает её, но ничего не восстанавливает |
| Чего нет | payload_json, recipient_user_id и registration_status_id не отдаются. Экран диагностики очереди не является способом читать чужие уведомления и чужие назначения |
| Доступ | Только администратор. Пробы health, readiness и heartbeat остаются анонимными, диагностика — нет |
| Пагинация | Обычная страничная по соглашениям API; сортировка по updated_at по убыванию |
| Ограничение частоты | Ограничена по частоте на учётную запись; значение конфигурируемо |

# 10. Выбор канала

1.  Если NotificationRule.channel_override задан и соответствующий binding доступен, выбрать его.

2.  Иначе выбрать User.preferred_channel, если он задан и доступен.

3.  Иначе применить fallback TELEGRAM → EMAIL среди доступных каналов.

4.  Telegram доступен при telegram_chat_id; Email для продуктовых сообщений — при email_verified_at и active User.

5.  Пункты 1–4 выполняются до provider call и определяют requested_channel. Недоступный канал отсеивается здесь и попытку не тратит.

6.  attempt_count считает выполненные provider call. Каждая попытка увеличивает attempt_count на 1 независимо от того, повтор это на прежнем канале или первый вызов на новом.

7.  Permanent-ошибка провайдера (bad address, заблокированный chat, отозванный binding) закрывает текущий канал для этой Notification. Worker в том же проходе переключается на следующий доступный канал и выполняет новый provider call без backoff-задержки; actual_channel перезаписывается, attempt_count увеличивается ещё раз.

8.  Временная provider-ошибка повторяется на текущем actual_channel по backoff 1, 5 и 30 минут из раздела 9.4.

9.  Общий лимит 4 provider call действует на всю Notification и охватывает обе причины: и retry по временным ошибкам, и переключения каналов. По исчерпании лимита статус FAILED.

10. Если доступного канала нет изначально либо все доступные каналы закрылись permanent-ошибками, Notification становится UNDELIVERABLE; RegistrationStatus не меняется.

UNDELIVERABLE является terminal status конкретной Notification. Последующее появление доступного канала не реактивирует старую запись автоматически; новую доставку создаёт следующее правило либо новая версионированная бизнес-ситуация.

# 11. Шкала и обязательные экраны

| **Экран** | **Обязательное поведение** |
|----|----|
| Мои события | Все опубликованные Event с ASSIGNED участием: UPCOMING, ACTIVE и FINISHED; архивные скрыты default и доступны фильтром |
| Карточка Event | team_role, вычисляемое состояние, ближайший Stage, RegistrationStatus, deadline, ссылка и действие TODO → DONE |
| Шкала пользователя | Только назначенные опубликованные неархивные; Gantt с масштабом месяц/неделя |
| Admin: все события | UNPUBLISHED/PUBLISHED/ARCHIVED, поиск и фильтры |
| Шкала администратора | Все Event; фильтры по состоянию, участнику и диапазону |
| Строка Шкалы | Один Event; Stage — интервалы; Registration.deadline_at — отдельный маркер |
| Пересечения | Допускаются; каждый Event остаётся отдельной строкой |
| Пустое состояние | «У вас пока нет назначенных событий» |

Клик по Event/Stage открывает соответствующую карточку. Типы Stage визуально различаются. Конкретная палитра — решение UI, но контраст должен соответствовать WCAG 2.1 AA. Desktop MVP функционален при ширине viewport ≥1024 px.

# 12. Административный UX и массовые операции

- Поиск User по display_name и email; пагинация после 50 результатов.

- Мультивыбор и добавление; team_role задаётся каждому выбранному User до сохранения.

- Массовое удаление ASSIGNED, массовая установка TODO/NOT_REQUIRED с предварительным просмотром количества изменений.

- Копирование только ASSIGNED состава из другого Event. team_role переносится из исходного Event как значение по умолчанию; до сохранения Admin может изменить его любому участнику в предпросмотре. Конфликты существующих участников пропускаются и возвращаются в результате операции.

- Фильтры по team_role и RegistrationStatus; copy/remove/status операции атомарны на одного участника, общий batch возвращает частичные ошибки по элементам.

- CSV import/export не входит в MVP.

# 13. AuditLog

| **Поле** | **Правило** |
|----|----|
| id | UUID, PK |
| actor_user_id | nullable FK User; NULL допустим для SYSTEM |
| action | Именованный enum/event: PARTICIPANT_ADD/REMOVE/REACTIVATE, TEAM_ROLE_CHANGE, REGISTRATION_CHANGE, STATUS_CHANGE, RULE_CHANGE, EVENT_PUBLISH/ARCHIVE, USER_DEACTIVATE и др. |
| entity_type / entity_id | Тип и идентификатор изменённого объекта |
| before_json / after_json | Только изменённые бизнес-поля; password/token/chat secrets исключаются |
| request_id | Корреляция с backend/worker logs |
| created_at | datetime UTC; immutable |

AuditLog доступен только Admin, не редактируется пользовательским API и хранится 365 дней по умолчанию. Прямые UPDATE/DELETE для runtime DB role запрещены; очистка выполняется отдельной операционной процедурой по retention policy.

# 14. Архитектура и транзакционные границы

Архитектура — модульный монолит: Identity/Auth & Profile; Event; Participation; Registration; Notifications; Query/Schedule; Audit. Backend и worker используют одну кодовую базу и PostgreSQL; отдельный message broker для MVP не обязателен.

| **Операция** | **Транзакционная гарантия** |
|----|----|
| Назначение | Participant + RegistrationStatus при ACTIVE Registration + первичный Notification + AuditLog — одна DB-транзакция. Первичный Notification включается в транзакцию только для опубликованного неархивного Event; иначе его создаёт reconciliation после публикации |
| Изменение статуса | RegistrationStatus + отмена PENDING + AuditLog — одна DB-транзакция |
| Deadline/rule change | schedule_version + отмена старых PENDING + AuditLog — одна DB-транзакция; новые создаёт reconciliation |
| Event end_at change | Event.end_at + Registration.schedule_version + отмена старых PENDING + AuditLog — одна DB-транзакция; новые создаёт reconciliation |
| Registration.url change | notification_content_version + отмена старых PENDING + AuditLog — одна DB-транзакция; новые создаёт reconciliation |
| Удаление/reactivation | Participant state/version + cancel/create notification + AuditLog — одна DB-транзакция |
| Provider delivery | Только после commit; внешний вызов не входит в доменную транзакцию |

| **Компонент**            | **Deployment MVP**                    |
|--------------------------|---------------------------------------|
| Web Frontend             | Статические assets / web application  |
| Backend API              | Stateless instances за reverse proxy  |
| Worker/Scheduler         | Отдельный процесс той же кодовой базы |
| PostgreSQL               | Единая БД и источник истины           |
| Email/Telegram providers | Заменяемые adapters                   |

## 14.1 Технологический стек

| **Слой** | **Решение MVP** |
|----|----|
| Backend | Go; модульный монолит, модули раздела 14 — пакеты одной кодовой базы |
| API | REST + JSON |
| Документация API | OpenAPI, формируется инкрементально вместе с endpoint-ами |
| База данных | PostgreSQL — единственный источник истины |
| Доступ к БД | Выбор ORM либо SQL-библиотеки и стиля запросов — решение backend-разработчика; ограничения целостности разделов 8 и 15 обязаны быть выражены в миграциях, а не только в коде |
| Frontend | React + TypeScript + Vite; SPA со статической сборкой. Детализация — раздел 14.2 |
| Стили | Tailwind CSS; контраст соответствует WCAG 2.1 AA согласно разделу 18 |
| Фоновые задачи | Отдельный Go-процесс worker/scheduler из той же кодовой базы; message broker не используется, очередь — таблица Notification |
| Авторизация | Access token — JWT в HttpOnly Secure SameSite=Lax cookie, TTL 15 минут |
| Refresh | Opaque случайный token, не JWT; в БД хранится только hash согласно разделу 3, ротация и отзыв цепочки обязательны |
| Файловое хранилище | S3-совместимое хранилище предусмотрено инфраструктурой, но в MVP не используется: документы и регистрационные анкеты не хранятся согласно разделам 1 и 4 |
| Локальная разработка | Docker Compose: backend, worker, PostgreSQL, frontend |
| CI/CD | GitHub Actions: сборка, тесты раздела 18, публикация образов |
| Логи | Структурированные JSON-логи с request_id; ограничения раздела 18 по секретам действуют |
| Метрики | Prometheus; экспорт через защищённый endpoint группы Ops раздела 17 |
| Развёртывание | Docker-контейнеры на одном сервере за reverse proxy |

## 14.2 Frontend MVP

SPA без SSR: раздел 14 требует только статические assets, целевой viewport — desktop ≥1024 px, публичных индексируемых страниц нет. Мета-фреймворк не применяется.

| **Задача** | **Решение MVP** | **Обоснование** |
|----|----|----|
| Каркас | React + TypeScript + Vite | Задано стеком; strict mode TypeScript обязателен |
| Стили и токены | Tailwind CSS | Задано стеком; палитра типов Stage и состояний задаётся токенами темы |
| Компоненты | shadcn/ui поверх Radix UI | Диалоги, меню, таблицы и формы получают управление фокусом, клавиатурную навигацию и ARIA из Radix, что напрямую закрывает требования accessibility раздела 18. Код копируется в репозиторий, runtime-зависимость от UI-kit не возникает |
| Маршрутизация | React Router (SPA, declarative mode) | Ролевые ветки user/admin, защищённые маршруты, отсутствие SSR-требований |
| Состояние сервера | TanStack Query | Кэш, инвалидация после мутаций, повторные запросы. Отдельный глобальный store для MVP не вводится |
| Состояние фильтров | URL search params как единственный источник истины | Фильтры Шкалы и списков раздела 11 должны переживать перезагрузку и передаваться ссылкой |
| Клиент API | openapi-typescript + openapi-fetch, типы генерируются из OpenAPI | Раздел 17 делает OpenAPI обязательным; генерация исключает расхождение DTO между Go и React |
| Auth-транспорт | fetch с credentials include; CSRF token добавляется заголовком ко всем изменяющим запросам | Cookie-схема раздела 3; token в JavaScript не хранится |
| Обработка 401 | Единичный прозрачный refresh с дедупликацией параллельных запросов, при повторной неудаче — редирект на вход | Access token живёт 15 минут |
| Формы и валидация | React Hook Form + Zod | Клиентская валидация не заменяет серверную; серверные ошибки поля отображаются рядом с полем |
| Таблицы | TanStack Table (headless) | Списки участников и AuditLog: сортировка, пагинация, мультивыбор строк для массовых операций раздела 12 |
| Шкала / Gantt | Собственный компонент: CSS Grid плюс d3-scale только для отображения времени в пиксели | Готовые Gantt-библиотеки тяжёлые, плохо стилизуются под Tailwind и слабы по accessibility. Требования специфичны: пересекающиеся Stage, отдельный маркер deadline, масштабы месяц и неделя. Объём данных мал — 100 неархивных Event по разделу 18 |
| Даты и таймзоны | date-fns v4 с поддержкой таймзон | Хранение и обмен в UTC, отображение в системной таймзоне Europe/Moscow согласно разделу 9.6 |
| Уведомления интерфейса | sonner | Результаты операций, включая частичные ошибки batch |
| Иконки | lucide-react | Поставляется вместе с shadcn/ui |
| Тесты | Vitest + React Testing Library, контрактные тесты против настоящего API в контейнере, Playwright для e2e | Раздел 18 требует e2e критических путей; моков нет — подставные данные допустимы только как фикстуры тестов |
| Линт и формат | Biome, дополнительно eslint-plugin-jsx-a11y или эквивалентная проверка a11y | Один инструмент вместо пары ESLint и Prettier |
| Проверка accessibility | axe в Playwright на критических экранах | Контраст, метки и фокус проверяются автоматически, а не ревью |

| **Явно не используется в MVP:** Next.js и любой SSR; Redux, MobX и прочие глобальные store; CSS-in-JS; готовые Gantt-библиотеки; MUI, Ant Design и другие UI-kit, конкурирующие с Tailwind; готовый runtime i18n на этапе MVP — вводится отдельным этапом; до него словари подключаются минимальным модулем `shared/i18n` без библиотеки. |
|----|

Структура кода — по доменным модулям раздела 14, зеркально backend: auth, events, participants, registration, notifications, schedule, audit. Общие примитивы выносятся в shared. Кросс-импорты между доменными модулями запрещены, обмен идёт через shared и маршруты.

# 15. Минимальная ER-модель

| **Сущность** | **Ключевые связи и ограничения** |
|----|----|
| User | 1:N Session, OneTimeToken, Participant, Notification recipient, Audit actor; unique email/chat_id |
| Session | N:1 User; unique refresh_token_hash; revoke/expiry |
| OneTimeToken | N:1 optional User; unique token_hash; purpose/expiry/consumed |
| Invite | normalized email, creator User, unique token_hash; один unaccepted/unrevoked на email; expiry/accept/revoke |
| Event | 1:N Stage, 1:N Participant, 0..1 Registration |
| EventParticipant | N:1 Event, N:1 User; UNIQUE(event_id,user_id) |
| Registration | 1:1 Event; 1:N RegistrationStatus, NotificationRule; schedule/activation/content versions |
| RegistrationStatus | N:1 Registration and Participant того же Event; намеренный event_id; UNIQUE(registration_id,participant_id) |
| NotificationRule | N:1 Registration; unique registration+offset |
| Notification | N:1 RegistrationStatus, optional Rule, immutable recipient; UNIQUE logical_key |
| AuditLog | N:1 nullable actor User; polymorphic entity reference |

| **Обязательные ограничения:** Помимо обычных FK используются CHECK для enum/version/count, UNIQUE logical keys, составная проверка общего event_id для RegistrationStatus и запрет изменения immutable полей Notification/AuditLog через runtime API. |
|----|

# 16. Состояния и переходы

| **Объект** | **Переход** | **Кто / эффект** |
|----|----|----|
| Event | UNPUBLISHED → PUBLISHED | Admin; становится видим пользователям и scheduler; reconciliation создаёт отложенные первичные уведомления для TODO при ACTIVE Registration |
| Event | UNPUBLISHED/PUBLISHED → ARCHIVED | Admin; terminal MVP, отмена PENDING |
| Event | end_at changed | Admin; schedule_version +1, cancel PENDING, reconciliation |
| Participant | ASSIGNED → REMOVED | Admin; cancel, removed_at |
| Participant | REMOVED → ASSIGNED | Admin; assignment_version +1 |
| Registration | ACTIVE → DISABLED | Admin; cancel PENDING, статусные данные сохраняются |
| Registration | DISABLED → ACTIVE | Admin; activation_version/schedule_version +1 |
| Registration | url changed | Admin; notification_content_version +1, cancel PENDING |
| RegistrationStatus | TODO → DONE | User owner или Admin; registered_at |
| RegistrationStatus | DONE/NOT_REQUIRED → TODO | Admin; todo_cycle +1, registered_at NULL |
| RegistrationStatus | TODO/DONE → NOT_REQUIRED | Admin; cancel PENDING |
| User | is_active true → false | Admin или запрос владельца; revoke Session, удаление binding, cancel PENDING |
| User | is_active false → true | Admin; доступ восстанавливается, отменённые уведомления не воскрешают |
| Notification | PENDING → PROCESSING | Worker lease |
| Notification | PROCESSING → SENT | Успешная доставка |
| Notification | PROCESSING → PENDING | Temporary failure, retry scheduled |
| Notification | PROCESSING → FAILED | Четыре неудачные попытки |
| Notification | PENDING → CANCELLED | Доменные условия; гарантированная отмена до обработки |
| Notification | PROCESSING → CANCELLED | Только если provider_call_started_at IS NULL; затем best effort и фактический результат |
| Notification | PENDING/PROCESSING → UNDELIVERABLE | Нет канала/permanent failure; terminal для этой Notification |

# 17. API: обязательные группы

| **Группа** | **Минимальные операции** |
|----|----|
| Auth | register, verify/resend email, login, refresh, logout/all-sessions, forgot/reset password, change-email confirm; список собственных Session и отзыв одной Session (раздел 3.1) |
| Invite | admin create/revoke/list; public inspect/accept |
| Profile | GET/PATCH /me, bind/unbind Telegram, preferences, deactivate request |
| Users | Admin-only поиск зарегистрированных User по display_name и email с пагинацией; только минимальные поля для выбора участника |
| Catalog | list опубликованных неархивных Event с фильтрами по origin, format, kind, state и периоду; самозапись join |
| Events | admin list/detail/create/update/publish/archive; user assigned detail |
| Stages | create/update/delete/list by event |
| Participants | list/add-many/update-team-role/remove-many/reactivate/copy-from |
| Registration | create/update/enable/disable/get; own DONE; admin status transitions |
| Notification Rules | list/create/update/disable per registration; предпросмотр отрисованного текста без отправки (раздел 9.7) |
| Queries | my-events, my/admin schedule, upcoming/overdue |
| Audit | admin list/filter с пагинацией; выгрузка файлом в MVP не поддерживается согласно разделу 12 |
| Ops | health, readiness, worker heartbeat, metrics protected endpoint; admin-only построчная диагностика очереди — отказы и зависшие аренды (раздел 9.8) |

OpenAPI ведётся инкрементально: спецификация endpoint обновляется вместе с его реализацией и до merge содержит точные URI, DTO, коды, pagination и общую error schema. Общие соглашения — формат ошибки, пагинация, формат batch-результата — фиксируются до первого endpoint. Для batch API обязателен per-item result. OpenAPI не может ослаблять права или обходить переходы из раздела 16.

# 18. Нефункциональные требования

| **Категория** | **Требование MVP** |
|----|----|
| Масштаб | 200 User, 500 Event в БД, 100 неархивных одновременно; 20 конкурентных интерактивных пользователей |
| Производительность | На целевом наборе и 20 concurrent: backend p95 чтения ≤500 мс, записи ≤1 с; provider latency исключается |
| Scheduler | Reconciliation каждые ≤5 мин; due notification создаётся не позднее 7 мин после scheduled_at при здоровой системе |
| Доступность | Цель 99%/месяц, без договорного SLA |
| Backup | Ежедневный шифрованный backup PostgreSQL, хранение 7 дней; restore test перед релизом |
| RPO/RTO | RPO ≤24 ч, RTO ≤4 ч; это осознанный допустимый риск внутреннего MVP |
| Логи | Структурированные logs с request_id; без паролей, token, cookies и полного notification payload |
| Мониторинг | API health/readiness, worker heartbeat, queue age, PROCESSING lease, FAILED/UNDELIVERABLE, provider error rate |
| Security | TLS, Argon2id, CSRF/CORS, exact auth cookies, rate limits, server validation, запрет IDOR, dependency scanning |
| Данные | UTC; system timezone Europe/Moscow default; retention 90 дней Notification payload и 365 дней AuditLog |
| Браузеры | Последние 2 версии Chrome, Firefox, Edge, Safari; desktop viewport ≥1024 px |
| Accessibility | Keyboard critical flows, visible focus, labels and contrast WCAG 2.1 AA |
| Тестирование | Unit domain; DB/integration dedupe and constraints; API/Auth/AuthZ; worker crash/retry; e2e critical paths |

# 19. Приёмочные сценарии Given / When / Then

## 19.1 Auth и права

### AC-AUTH-01 Регистрация и проверка email

Дано: email свободен. Когда: пользователь регистрируется. Тогда: User создаётся неverified, Session выдаётся, verification token одноразовый; после подтверждения email_verified_at заполнен, повторное использование token отклоняется.

### AC-AUTH-02 Invite

Дано: Admin создал Invite. Когда: получатель завершает регистрацию до expires_at. Тогда: создаётся один User, Invite.accepted_at заполнен; повторное принятие невозможно.

### AC-AUTH-03 Сброс пароля

Дано: активные Session. Когда: пользователь применяет валидный reset token. Тогда: password_hash изменён, token consumed, все прежние Session revoked.

### AC-AUTH-04 Смена email

Дано: verified User. Когда: он подтверждает pending_email. Тогда: email заменён атомарно, pending_email очищен, уникальность соблюдена; до подтверждения вход продолжает работать со старым email.

### AC-AUTH-05 Повторный Invite

Дано: для normalized_email есть unaccepted/unrevoked Invite. Когда: Admin повторно отправляет приглашение. Тогда: прежний Invite отозван и создан ровно один новый активный Invite; после принятия другие неистёкшие Invite этого email отозваны.

### AC-AUTH-06 Invite на существующего User

Дано: normalized_email уже принадлежит существующему User. Когда: Admin создаёт Invite на этот email. Тогда: операция отклоняется с конфликтом, Invite не создаётся, письмо не отправляется — независимо от значения is_active этого User.

### AC-AUTHZ-01 Запрет IDOR

Дано: обычный User. Когда: он прямым API-запросом меняет чужой профиль, Participant или Rule. Тогда: 403/404 по принятой API-политике, данные не меняются, security event логируется.

## 19.2 Event, участие и Registration

### AC-HACK-01 Публикация

Дано: UNPUBLISHED Event. Когда: Admin публикует его. Тогда: published_at заполнен; назначенные User видят его, неназначенные — нет; scheduler начинает учитывать его.

### AC-HACK-02 Изменение end_at

Дано: published Event с ACTIVE Registration, правилом просрочки и PENDING уведомлениями schedule_version N. Когда: Admin меняет end_at. Тогда: schedule_version=N+1, старые PENDING отменены, reconciliation создаёт актуальные с новым ключом, SENT сохранены. Попытка задать end_at раньше Registration.deadline_at отклоняется CHECK.

### AC-PART-01 Назначение

Дано: published Event с ACTIVE Registration и новый User. Когда: Admin задаёт team_role. Тогда: создаются ровно один ASSIGNED Participant, TODO status, AuditLog и REGISTRATION_REQUIRED Notification в одной транзакции.

### AC-PART-02 Дубликат

Дано: User уже ASSIGNED. Когда: Admin добавляет его повторно. Тогда: новая запись не создаётся; batch item возвращает conflict.

### AC-PART-03 Удаление

Дано: ASSIGNED, TODO и PENDING. Когда: Admin удаляет. Тогда: REMOVED, removed_at заполнен, PENDING=CANCELLED, status/history сохранены.

### AC-PART-04 Реактивация

Дано: REMOVED с TODO. Когда: Admin добавляет снова. Тогда: та же запись ASSIGNED, assignment_version +1, removed_at NULL, создаётся новое первичное Notification для новой версии.

### AC-REG-01 Registration после участников

Дано: Event с ASSIGNED без Registration. Когда: Admin создаёт ACTIVE Registration. Тогда: для каждого участника создаётся отсутствующий TODO и одно первичное Notification; повтор reconciliation не создаёт дублей.

### AC-REG-06 Registration на неопубликованном Event

Дано: UNPUBLISHED Event с ASSIGNED участниками. Когда: Admin создаёт ACTIVE Registration. Тогда: RegistrationStatus=TODO создаются, но ни одной Notification не создано. Когда: Admin публикует Event. Тогда: reconciliation создаёт ровно одно первичное уведомление на участника; повторный запуск дублей не создаёт.

### AC-REG-02 Самоотчёт

Дано: собственный actionable TODO. Когда: User нажимает «Я зарегистрировался». Тогда: DONE, registered_at заполнен, source=USER, будущие PENDING отменены.

### AC-REG-03 Административный возврат

Дано: DONE. Когда: Admin возвращает TODO. Тогда: todo_cycle +1, registered_at NULL, AuditLog создан; актуальные reminders нового цикла могут создаваться.

### AC-REG-04 Disable/enable

Дано: ACTIVE с TODO/PENDING. Когда: Admin disables и затем enables Registration. Тогда: PENDING отменены при disable; statuses сохранены; при enable версии увеличены и для TODO создаётся новый required notification.

### AC-REG-05 Межсобытиеная целостность

Дано: Registration A и Participant B. Когда: API или прямой DB test пытается создать общий RegistrationStatus. Тогда: операция отклоняется DB constraint.

### AC-CAT-01 Видимость каталога

Дано: опубликованный Event, неопубликованный Event и архивный Event. Когда: любой аутентифицированный User читает каталог. Тогда: возвращён только опубликованный неархивный, независимо от назначений читателя; ответ не содержит поля notes ни у одного элемента.

### AC-CAT-02 Анонимный доступ

Дано: опубликованный Event. Когда: запрос каталога приходит без сессии. Тогда: ответ 401, тело каталога не раскрывается.

### AC-CAT-03 Охват

Дано: Event с origin=RU и Event с origin=WORLD. Когда: каталог запрашивается видом «Россия», затем «Мир», затем «Все». Тогда: первый вид возвращает только RU, второй только WORLD, третий оба; ни одно событие не выпадает из всех видов.

### AC-CAT-04 Очный фильтр по этапам

Дано: Event с собственным format=ONLINE, у которого один Stage имеет собственный format=OFFLINE и город. Когда: каталог фильтруется по format=OFFLINE. Тогда: событие попадает в выборку, его effective_format=HYBRID, а в offline_stages присутствует этот этап с разрешённым местом.

### AC-CAT-05 Ограничение частоты

Дано: настроенный лимит каталога N запросов в окно. Когда: один User делает N+1 запрос к каталогу внутри окна. Тогда: последний ответ 429 с кодом rate_limited, счёт ведётся по учётной записи.

### AC-JOIN-01 Самозапись

Дано: опубликованный незавершённый Event с ACTIVE Registration и не назначенный на него User. Когда: User нажимает «участвую» и указывает роль. Тогда: создаются ASSIGNED Participant с этой ролью, TODO status и первичное Notification; AuditLog фиксирует инициатором самого User.

### AC-JOIN-02 Повторная самозапись и завершённое событие

Дано: User уже ASSIGNED на Event. Когда: он повторяет «участвую». Тогда: ответ 409 already_assigned, вторая запись не создаётся. Дано: Event, у которого end_at в прошлом. Когда: User пытается записаться. Тогда: запрос отклонён, участник не создан.

### AC-JOIN-03 Роль у митапа

Дано: опубликованный Event с kind=MEETUP. Когда: User записывается, не указав team_role. Тогда: запись создана с team_role=NULL. Дано: тот же запрос к Event с kind=HACKATHON. Тогда: ответ 400 с ошибкой поля team_role.

## 19.3 Notifications

### AC-NOTIF-01 Concurrent scheduler

Дано: due rule, TODO, одна версия. Когда: два scheduler одновременно создают reminder. Тогда: существует ровно одна Notification с ожидаемым logical_key.

### AC-NOTIF-02 DONE до scheduler

Дано: trigger наступил, запись ещё не создана. Когда: User переводит TODO→DONE. Тогда: reconciliation не создаёт Notification.

### AC-NOTIF-03 Изменение дедлайна

Дано: PENDING для schedule_version N. Когда: deadline меняется. Тогда: version=N+1, старые PENDING=CANCELLED, новый due reminder имеет другой key; SENT сохранены.

### AC-NOTIF-04 Fallback

Дано: preferred TELEGRAM без binding и verified email. Когда: worker отправляет. Тогда: actual_channel=EMAIL и выполняется email attempt.

### AC-NOTIF-05 Нет канала

Дано: нет chat_id и verified email. Когда: требуется доставка. Тогда: UNDELIVERABLE; RegistrationStatus остаётся TODO.

### AC-NOTIF-06 Retry

Дано: provider трижды временно ошибается, четвёртая попытка успешна. Тогда: delays 1/5/30 минут соблюдены, attempt_count=4, status=SENT.

### AC-NOTIF-07 Исчерпание retry

Дано: четыре временные ошибки. Тогда: status=FAILED, next_attempt_at=NULL, метрика/alert увеличены.

### AC-NOTIF-08 Crash recovery

Дано: worker умер после PROCESSING lock до результата. Когда: lease истёк. Тогда: recovery возвращает запись в PENDING; последующая попытка завершается; зависший PROCESSING не остаётся навсегда.

### AC-NOTIF-09 Rule change

Дано: PENDING для старого offset. Когда: Admin меняет scheduling rule. Тогда: schedule_version +1 один раз, старое PENDING отменено, новое создаётся с новой версией без UNIQUE conflict.

### AC-NOTIF-10 Архивирование

Дано: published Event с TODO/PENDING. Когда: Admin архивирует. Тогда: PENDING отменены, worker/scheduler не создают новые.

### AC-NOTIF-11 Изменение ссылки

Дано: есть PENDING с Registration.url старой версии. Когда: Admin меняет URL. Тогда: notification_content_version +1, старые PENDING=CANCELLED, новые актуальные Notification имеют новый key и payload с новой ссылкой.

### AC-NOTIF-12 Snapshot названия

Дано: Notification уже создана. Когда: Admin меняет Event.title. Тогда: существующий payload_json не меняется, а новые Notification используют новое название.

### AC-NOTIF-13 Новый канал

Дано: Notification стала UNDELIVERABLE. Когда: User позже привязывает Telegram. Тогда: старая Notification остаётся terminal и автоматически не отправляется; новую доставку создаёт только следующая бизнес-ситуация.

### AC-NOTIF-14 Отмена во время отправки

Дано: Notification в PROCESSING. Когда: доменное условие отмены возникает до provider_call_started_at. Тогда: статус CANCELLED. Если вызов уже начат, выполняется best effort, а статус фиксируется по фактическому результату попытки.

### AC-NOTIF-15 Напоминание после дедлайна

Дано: ACTIVE Registration с Rule offset_minutes = −60, участник в TODO, deadline_at прошёл 61 минуту назад, Event.end_at ещё не наступил. Когда: отрабатывает reconciliation. Тогда: создаётся ровно одна Notification типа REGISTRATION_OVERDUE с key overdue:…; повторный запуск дублей не создаёт. Если тот же участник уже DONE — Notification не создаётся; если Event.end_at уже прошёл — Notification не создаётся.

### AC-NOTIF-16 Permanent-ошибка и переключение канала

Дано: участник с telegram_chat_id и verified email, requested_channel=TELEGRAM. Когда: Telegram отвечает permanent-ошибкой, а Email принимает сообщение. Тогда: выполнено два provider call, attempt_count=2, actual_channel=EMAIL, status=SENT, backoff между вызовами не применялся.

### AC-NOTIF-17 Permanent-ошибка на всех каналах

Дано: тот же участник. Когда: и Telegram, и Email отвечают permanent-ошибкой. Тогда: attempt_count=2, status=UNDELIVERABLE, RegistrationStatus остаётся TODO.

### AC-NOTIF-18 Деактивация получателя

Дано: активный участник в TODO с PENDING уведомлением. Когда: User деактивирован. Тогда: PENDING=CANCELLED, Session отозваны, Telegram binding удалён, reconciliation новых уведомлений не создаёт. Обратная активация отменённые уведомления не воскрешает.

### AC-NOTIF-19 Retention не ломает дедупликацию

Дано: SENT Notification старше 90 дней, статус участника всё ещё TODO, Event неархивен. Когда: отрабатывает процедура retention. Тогда: payload_json очищен, строка и logical_key сохранены; последующий reconciliation не создаёт уведомление с тем же logical_key повторно.

## 19.4 Read-модели, массовые операции и аудит

### AC-UI-01 Мои события

Дано: User ASSIGNED в upcoming A, finished C и archived D, не назначен в B. Тогда: default показывает A и C; D только с фильтром архивных; B отсутствует.

### AC-UI-02 Шкала

Дано: два назначенных Event с пересекающимися Stage. Тогда: каждый — отдельная строка, интервалы и deadline marker видимы в масштабах месяц/неделя.

### AC-BATCH-01 Массовое назначение

Дано: три выбранных User, один уже ASSIGNED. Когда: Admin сохраняет batch. Тогда: два назначены, конфликт третьего возвращён отдельно; транзакция каждого элемента согласована.

### AC-AUDIT-01 Аудит

Когда: Admin меняет team_role, status, deadline или rule. Тогда: AuditLog содержит actor, action, entity, before/after без credentials/token и request_id; запись недоступна для изменения runtime API.

# 20. Трассировка требований

| **Требование** | **Модель** | **Экран/API** | **Приёмка** |
|----|----|----|----|
| Регистрация/сессии | User, Session, Token | Auth | AC-AUTH-01…04 |
| Деактивация и удаление User | User.is_active | Profile/Admin | AC-NOTIF-18 |
| Invite | Invite | Admin Invite/Auth | AC-AUTH-02,05,06 |
| Права | User.is_admin + policies | Все API | AC-AUTHZ-01 |
| Event/Stage | Event, Stage | Admin Events/Schedule | AC-HACK-01,02, AC-UI-02 |
| Назначение | Participant | Admin Participants | AC-PART-01…04, AC-BATCH-01 |
| Registration lifecycle | Registration versions/state | Admin Registration | AC-REG-01,04,06 |
| Статус | RegistrationStatus | Event card | AC-REG-02,03,05 |
| Напоминания | Rule, Notification | Admin rules + worker | AC-NOTIF-01…19 |
| Мои события/Шкала | Query read models | My Events/Schedule | AC-UI-01,02 |
| Массовые операции | Participant/status services | Admin Participants | AC-BATCH-01 |
| Поиск пользователей | User | Admin Participants / Users API | Проверяется API/AuthZ-тестами |
| Аудит | AuditLog | Admin Audit | AC-AUDIT-01 |

# 21. Решения после MVP

- Разные наборы профильных полей и хранение регистрационных документов.

- Автоматическая внешняя проверка и командная Registration.

- Несколько ролей и нормализованный справочник функций.

- CSV import/export и расширенный bulk workflow.

- Автоматический импорт Event и универсальный Action Tracking.

- Напоминания по датам Stage и произвольным дедлайнам вне Registration.

- Дополнительные каналы, пользовательские таймзоны и локализация шаблонов.

- Мобильное приложение и полноценный responsive ниже 1024 px.

- Анонимный публичный каталог: раздача опубликованных Event наружу без сессии вместе с ограничением частоты по IP и кэшированием ответа.

- Message broker или микросервисы только при подтверждённой эксплуатационной необходимости.

# 22. Definition of Done MVP

- Все обязательные функции разделов 1–18 реализованы либо явно исключены согласованным change request.

- Все AC раздела 19 автоматизированы либо имеют воспроизводимый ручной тест с ожидаемым результатом.

- Нет открытых blocker/critical дефектов по основным потокам Auth, назначение, Registration, Notifications и права.

- Миграции разворачивают БД с чистого состояния; rollback и backup restore документированы и проверены на тестовом окружении.

- OpenAPI соответствует реализованным endpoint и содержит общую error schema, pagination и batch results.

- DB constraints целостности и UNIQUE logical_key проверены integration tests.

- Scheduler/worker имеют health/heartbeat, lease recovery и не создают две логические Notification для одного key.

- Проверены IDOR, CSRF, rate limits, отзыв Session, одноразовость token и невозможность чтения admin notes обычным User.

- Monitoring показывает queue age, FAILED/UNDELIVERABLE, provider errors и зависшие PROCESSING.

- Основной процесс «создать → опубликовать → назначить → зарегистрироваться → получить/остановить напоминания» выполняется без Excel и ручного контроля в чате.

- Финальная сборка документации включает актуальные OpenAPI, migrations runbook, restore runbook и перечень конфигурационных параметров.

# Приложение A. Глоссарий

| **Термин** | **Определение** |
|----|----|
| User | Зарегистрированный пользователь Timeline |
| Admin | User с глобальными административными правами MVP |
| EventParticipant | Логическая связь User с Event; хранит team_role, состояние и assignment_version |
| Registration | Регистрационное требование конкретного Event, применяемое к его ASSIGNED участникам |
| RegistrationStatus | Персональное состояние выполнения Registration конкретным EventParticipant |
| todo_cycle | Версия очередного периода, в котором RegistrationStatus находится в TODO |
| schedule_version | Версия дедлайна и scheduling-настроек Registration |
| activation_version | Версия очередной активации Registration |
| notification_content_version | Версия actionable-контента уведомлений Registration, включая Registration.url |
| NotificationRule | Правило создания reminder относительно deadline_at |
| logical_key | Уникальный ключ одной бизнес-ситуации уведомления |
| Provider | Внешний adapter доставки Telegram или Email |
| Lease | Ограниченная по времени блокировка Notification worker-ом |
| At least once | Доставка может быть повторена после неопределённого сбоя; потеря не допускается, exactly-once не обещается |
| Шкала | Read-модель временной шкалы; не источник истины |
| Модуль | Логическая область ответственности модульного монолита |

# Приложение B. Изменения v0.8 относительно v0.7

- NotificationRule.offset_minutes стал знаковым (−525600..525600): отрицательное значение планирует напоминание после deadline_at.

- Добавлен notification_type REGISTRATION_OVERDUE и отдельный префикс logical_key overdue:. Тип выводится из знака offset_minutes, отдельного поля у Rule нет.

- Правила scheduler разделены по знаку offset: преддедлайновое правило не срабатывает после deadline_at, просроченное — не создаётся после Event.end_at.

- Запрос overdue из раздела 17 получил соответствующий механизм уведомлений; расхождение устранено.

- Явно зафиксировано, что Stage не порождает уведомлений; напоминания по Stage вынесены в раздел 21.

- Раздел 10 доработан: attempt_count считает выполненные provider call, переключение канала после permanent-ошибки тратит попытку, отсев недоступного канала до вызова — нет. Лимит 4 вызова общий для retry и переключений.

- Добавлен раздел 14.1 с технологическим стеком: Go, PostgreSQL, REST/JSON, React + TypeScript + Vite, Tailwind, отдельный Go worker, Docker Compose, GitHub Actions, Prometheus.

- Добавлен раздел 14.2 с составом frontend: React Router, TanStack Query, TanStack Table, shadcn/ui поверх Radix, React Hook Form с Zod, openapi-typescript, собственная Шкала на CSS Grid и d3-scale, date-fns, Vitest, Playwright, Biome. Зафиксирован список явно неиспользуемых решений.

- Уточнено, что access token — JWT, а refresh token остаётся opaque и хранится в БД только как hash.

- OpenAPI переведён с модели «утверждается до реализации» на инкрементальную с фиксацией общих соглашений заранее.

- Первичное уведомление больше не создаётся для неопубликованного Event: статусы создаются сразу, уведомления откладываются до публикации и создаются reconciliation.

- Retention уточнён: очищается только payload_json, строка Notification и logical_key сохраняются, иначе ломается дедупликация.

- Деактивация получателя добавлена в список причин отмены PENDING и в проверки worker и reconciliation.

- Деактивация и удаление аккаунта разделены как разные операции с разной обратимостью.

- Добавлен CHECK deadline_at ≤ Event.end_at и описано влияние изменения end_at на schedule_version.

- Уточнены перенос team_role при копировании состава, отказ на Invite существующему User, лимит 10 NotificationRule на Registration и отсутствие файловой выгрузки AuditLog.

- Добавлено приложение C со списком конфигурационных параметров.

- Добавлены AC-AUTH-06, AC-HACK-02, AC-REG-06, AC-NOTIF-15…19.

# Приложение B.1. Изменения v0.7 относительно v0.6

- Разделён гарантированный PENDING cancel и PROCESSING cancel до/после начала provider call.

- Исправлены определения Registration/RegistrationStatus и Participant.role переименован в team_role.

- preferred_channel стал nullable с default NULL; системный fallback отделён от выбора User.

- Добавлен notification_content_version: изменение Registration.url отменяет старые PENDING и создаёт новые payload/key.

- Зафиксирована snapshot-семантика Event.title и terminal lifecycle UNDELIVERABLE.

- event_id в RegistrationStatus явно отмечен как намеренная денормализация для DB-целостности.

- Для Invite задан ровно один unaccepted/unrevoked Invite на normalized_email и транзакционное отзыв-переиздание.

- Добавлены приёмочные сценарии для новых граничных условий без расширения функционального scope MVP.

# Приложение C. Конфигурационные параметры

Значения ниже задаются конфигурацией развёртывания. Приведённые числа — значения по умолчанию MVP; изменение не требует правки кода.

| **Параметр** | **Default** | **Раздел** |
|----|----|----|
| Параметры Argon2id: memory, iterations, parallelism, salt/key length | Профиль из политики безопасности развёртывания | 3 |
| Access token TTL | 15 минут | 3 |
| Refresh token TTL | 30 дней | 3 |
| Email verification token TTL | 24 часа | 3 |
| Password reset token TTL | 30 минут | 3 |
| Invite token TTL | 72 часа | 3 |
| Rate limit login | 10 попыток / 15 минут на IP+email | 3 |
| Rate limit reset и resend invite | 5 / час на IP+email | 3 |
| Rate limit каталога | 120 запросов / минуту на учётную запись | 5.3 |
| Rate limit списка и отзыва собственных Session | 60 запросов / минуту на учётную запись | 3.1 |
| Rate limit предпросмотра уведомления | 60 запросов / минуту на учётную запись | 9.7 |
| Rate limit диагностики очереди | 60 запросов / минуту на учётную запись | 9.8 |
| Разрешённые CORS origins | Список развёртывания | 3 |
| Интервал scheduler | 5 минут | 9.4, 18 |
| Worker lease TTL | 2 минуты | 9.4 |
| Лимит provider call на Notification | 4 | 9.4, 10 |
| Backoff повторов | 1, 5, 30 минут | 9.4, 10 |
| Максимум NotificationRule на Registration | 10 | 9.1 |
| Диапазон offset_minutes | −525600..525600 | 9.1 |
| Системная таймзона отображения | Europe/Moscow | 9.6, 18 |
| Retention Notification.payload_json | 90 дней | 4 |
| Retention AuditLog | 365 дней | 4, 13 |
| Порог пагинации поиска User | 50 результатов | 12 |
| Backup: периодичность и хранение | Ежедневно, 7 дней | 18 |
| Учётные данные Telegram и Email provider | Секреты развёртывания, в логи не попадают | 10, 18 |
