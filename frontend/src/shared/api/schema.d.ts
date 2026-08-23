/**
 * СГЕНЕРИРОВАННЫЙ ФАЙЛ — не редактировать вручную.
 * Источник: docs/swagger.json. Обновление: npm run api:types
 */
export interface paths {
    "/admin/audit": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Журнал аудита
         * @description Доступен только администратору. Записи неизменяемы; выгрузка файлом в MVP не поддерживается.
         */
        get: {
            parameters: {
                query?: {
                    /** @description Фильтр по действию */
                    action?: string;
                    /** @description Фильтр по актору */
                    actor_user_id?: string;
                    /** @description Фильтр по идентификатору объекта */
                    entity_id?: string;
                    /** @description Фильтр по типу объекта */
                    entity_type?: string;
                    /** @description Начало периода, RFC3339 */
                    from?: string;
                    /** @description Номер страницы */
                    page?: number;
                    /** @description Размер страницы */
                    page_size?: number;
                    /** @description Конец периода, RFC3339 */
                    to?: string;
                };
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["models.AuditPage"];
                    };
                };
                /** @description Bad Request */
                400: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["models.ErrorResponse"];
                    };
                };
                /** @description Forbidden */
                403: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["models.ErrorResponse"];
                    };
                };
            };
        };
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/admin/hackathons": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Список хакатонов
         * @description Административный список со всеми состояниями, поиском и фильтрами.
         */
        get: {
            parameters: {
                query?: {
                    /** @description Показывать архивные */
                    include_archived?: boolean;
                    /** @description Номер страницы */
                    page?: number;
                    /** @description Размер страницы */
                    page_size?: number;
                    /** @description Поиск по названию и организатору */
                    search?: string;
                    /** @description Фильтр состояний через запятую */
                    state?: "UNPUBLISHED" | "UPCOMING" | "ACTIVE" | "FINISHED" | "ARCHIVED";
                };
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["models.HackathonPage"];
                    };
                };
                /** @description Forbidden */
                403: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["models.ErrorResponse"];
                    };
                };
            };
        };
        put?: never;
        /**
         * Создание хакатона
         * @description Хакатон создаётся неопубликованным; end_at обязан быть позже start_at.
         */
        post: {
            parameters: {
                query?: never;
                header?: never;
                path?: never;
                cookie?: never;
            };
            /** @description Данные хакатона */
            requestBody: {
                content: {
                    "application/json": components["schemas"]["models.CreateHackathonRequest"];
                };
            };
            responses: {
                /** @description Created */
                201: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["models.HackathonResponse"];
                    };
                };
                /** @description Bad Request */
                400: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["models.ErrorResponse"];
                    };
                };
                /** @description Forbidden */
                403: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["models.ErrorResponse"];
                    };
                };
            };
        };
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/admin/hackathons/{id}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Хакатон целиком
         * @description Административное чтение, включая заметки.
         */
        get: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    /** @description Идентификатор хакатона */
                    id: string;
                };
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["models.HackathonResponse"];
                    };
                };
                /** @description Forbidden */
                403: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["models.ErrorResponse"];
                    };
                };
                /** @description Not Found */
                404: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["models.ErrorResponse"];
                    };
                };
            };
        };
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        /**
         * Изменение хакатона
         * @description Изменение end_at увеличивает schedule_version регистрации, отменяет устаревшие
         *     ожидающие уведомления и запускает согласование. Нарушение условия
         *     deadline_at <= end_at отклоняется.
         */
        patch: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    /** @description Идентификатор хакатона */
                    id: string;
                };
                cookie?: never;
            };
            /** @description Изменяемые поля */
            requestBody: {
                content: {
                    "application/json": components["schemas"]["models.UpdateHackathonRequest"];
                };
            };
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["models.HackathonResponse"];
                    };
                };
                /** @description Bad Request */
                400: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["models.ErrorResponse"];
                    };
                };
                /** @description Forbidden */
                403: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["models.ErrorResponse"];
                    };
                };
                /** @description Not Found */
                404: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["models.ErrorResponse"];
                    };
                };
                /** @description дедлайн регистрации выходит за end_at */
                409: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["models.ErrorResponse"];
                    };
                };
            };
        };
        trace?: never;
    };
    "/admin/hackathons/{id}/archive": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Архивирование хакатона
         * @description Конечное состояние MVP: ожидающие уведомления отменяются, новые не создаются.
         */
        post: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    /** @description Идентификатор хакатона */
                    id: string;
                };
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["models.HackathonResponse"];
                    };
                };
                /** @description Forbidden */
                403: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["models.ErrorResponse"];
                    };
                };
                /** @description Not Found */
                404: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["models.ErrorResponse"];
                    };
                };
                /** @description хакатон уже архивирован */
                409: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["models.ErrorResponse"];
                    };
                };
            };
        };
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/admin/hackathons/{id}/participants": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Состав участников хакатона */
        get: {
            parameters: {
                query?: {
                    /** @description Включая удалённых из состава */
                    include_removed?: boolean;
                    /** @description Номер страницы */
                    page?: number;
                    /** @description Размер страницы */
                    page_size?: number;
                    /** @description Фильтр по статусу регистрации */
                    registration_status?: "TODO" | "DONE" | "NOT_REQUIRED";
                    /** @description Поиск по имени и email */
                    search?: string;
                    /** @description Фильтр по функции участника */
                    team_role?: string;
                };
                header?: never;
                path: {
                    /** @description Идентификатор хакатона */
                    id: string;
                };
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["models.ParticipantPage"];
                    };
                };
                /** @description Forbidden */
                403: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["models.ErrorResponse"];
                    };
                };
                /** @description Not Found */
                404: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["models.ErrorResponse"];
                    };
                };
            };
        };
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/admin/hackathons/{id}/participants/batch-add": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Массовое добавление участников
         * @description Повторное добавление ранее удалённого участника реактивирует запись и увеличивает
         *     assignment_version. Назначение, статус регистрации, первичное уведомление и запись
         *     аудита выполняются одной транзакцией на участника; результат возвращается по каждому элементу.
         */
        post: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    /** @description Идентификатор хакатона */
                    id: string;
                };
                cookie?: never;
            };
            /** @description Список пользователей и их функций */
            requestBody: {
                content: {
                    "application/json": components["schemas"]["models.AddParticipantsRequest"];
                };
            };
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["models.BatchResult"];
                    };
                };
                /** @description Bad Request */
                400: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["models.ErrorResponse"];
                    };
                };
                /** @description Forbidden */
                403: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["models.ErrorResponse"];
                    };
                };
                /** @description Not Found */
                404: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["models.ErrorResponse"];
                    };
                };
            };
        };
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/admin/hackathons/{id}/participants/batch-remove": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Массовое удаление участников
         * @description Переводит участие в REMOVED и отменяет ожидающие уведомления. Отправленные сохраняются.
         */
        post: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    /** @description Идентификатор хакатона */
                    id: string;
                };
                cookie?: never;
            };
            /** @description Идентификаторы участников */
            requestBody: {
                content: {
                    "application/json": components["schemas"]["models.RemoveParticipantsRequest"];
                };
            };
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["models.BatchResult"];
                    };
                };
                /** @description Bad Request */
                400: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["models.ErrorResponse"];
                    };
                };
                /** @description Forbidden */
                403: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["models.ErrorResponse"];
                    };
                };
                /** @description Not Found */
                404: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["models.ErrorResponse"];
                    };
                };
            };
        };
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/admin/hackathons/{id}/participants/copy-from": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Копирование состава из другого хакатона
         * @description Переносятся только назначенные участники. Функция участника переносится как значение
         *     по умолчанию и может быть переопределена. Существующие участники пропускаются
         *     и возвращаются отдельными элементами результата.
         */
        post: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    /** @description Идентификатор целевого хакатона */
                    id: string;
                };
                cookie?: never;
            };
            /** @description Источник и переопределения функций */
            requestBody: {
                content: {
                    "application/json": components["schemas"]["models.CopyParticipantsRequest"];
                };
            };
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["models.BatchResult"];
                    };
                };
                /** @description Bad Request */
                400: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["models.ErrorResponse"];
                    };
                };
                /** @description Forbidden */
                403: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["models.ErrorResponse"];
                    };
                };
                /** @description Not Found */
                404: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["models.ErrorResponse"];
                    };
                };
            };
        };
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/admin/hackathons/{id}/publish": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Публикация хакатона
         * @description Хакатон становится видимым участникам и планировщику; отложенные первичные
         *     уведомления создаются согласованием.
         */
        post: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    /** @description Идентификатор хакатона */
                    id: string;
                };
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["models.HackathonResponse"];
                    };
                };
                /** @description Forbidden */
                403: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["models.ErrorResponse"];
                    };
                };
                /** @description Not Found */
                404: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["models.ErrorResponse"];
                    };
                };
                /** @description хакатон уже опубликован или архивирован */
                409: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["models.ErrorResponse"];
                    };
                };
            };
        };
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/admin/hackathons/{id}/registration": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Регистрация хакатона */
        get: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    /** @description Идентификатор хакатона */
                    id: string;
                };
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["models.RegistrationResponse"];
                    };
                };
                /** @description Forbidden */
                403: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["models.ErrorResponse"];
                    };
                };
                /** @description Not Found */
                404: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["models.ErrorResponse"];
                    };
                };
            };
        };
        put?: never;
        /**
         * Создание регистрации
         * @description Создание активной регистрации создаёт недостающие статусы TODO всем назначенным
         *     участникам. Первичные уведомления создаются только для опубликованного неархивного
         *     хакатона; иначе они откладываются до публикации. Дедлайн обязан удовлетворять
         *     условию deadline_at <= hackathon.end_at.
         */
        post: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    /** @description Идентификатор хакатона */
                    id: string;
                };
                cookie?: never;
            };
            /** @description Ссылка и дедлайн */
            requestBody: {
                content: {
                    "application/json": components["schemas"]["models.CreateRegistrationRequest"];
                };
            };
            responses: {
                /** @description Created */
                201: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["models.RegistrationResponse"];
                    };
                };
                /** @description Bad Request */
                400: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["models.ErrorResponse"];
                    };
                };
                /** @description Forbidden */
                403: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["models.ErrorResponse"];
                    };
                };
                /** @description Not Found */
                404: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["models.ErrorResponse"];
                    };
                };
                /** @description регистрация уже существует или дедлайн выходит за end_at */
                409: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["models.ErrorResponse"];
                    };
                };
            };
        };
        delete?: never;
        options?: never;
        head?: never;
        /**
         * Изменение регистрации
         * @description Изменение ссылки увеличивает notification_content_version, изменение дедлайна —
         *     schedule_version. В обоих случаях ожидающие уведомления отменяются, а актуальные
         *     создаются согласованием с новым логическим ключом.
         */
        patch: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    /** @description Идентификатор хакатона */
                    id: string;
                };
                cookie?: never;
            };
            /** @description Изменяемые поля */
            requestBody: {
                content: {
                    "application/json": components["schemas"]["models.UpdateRegistrationRequest"];
                };
            };
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["models.RegistrationResponse"];
                    };
                };
                /** @description Bad Request */
                400: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["models.ErrorResponse"];
                    };
                };
                /** @description Forbidden */
                403: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["models.ErrorResponse"];
                    };
                };
                /** @description Not Found */
                404: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["models.ErrorResponse"];
                    };
                };
                /** @description Conflict */
                409: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["models.ErrorResponse"];
                    };
                };
            };
        };
        trace?: never;
    };
    "/admin/hackathons/{id}/registration-statuses": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Статусы регистрации участников */
        get: {
            parameters: {
                query?: {
                    /** @description Номер страницы */
                    page?: number;
                    /** @description Размер страницы */
                    page_size?: number;
                };
                header?: never;
                path: {
                    /** @description Идентификатор хакатона */
                    id: string;
                };
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["models.RegistrationStatusPage"];
                    };
                };
                /** @description Forbidden */
                403: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["models.ErrorResponse"];
                    };
                };
                /** @description Not Found */
                404: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["models.ErrorResponse"];
                    };
                };
            };
        };
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/admin/hackathons/{id}/registration-statuses/batch-set": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Массовая установка статуса
         * @description Допускаются значения TODO и NOT_REQUIRED. Результат возвращается по каждому участнику.
         */
        post: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    /** @description Идентификатор хакатона */
                    id: string;
                };
                cookie?: never;
            };
            requestBody: components["requestBodies"]["models.BatchSetStatusRequest"];
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["models.BatchResult"];
                    };
                };
                /** @description Bad Request */
                400: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["models.ErrorResponse"];
                    };
                };
                /** @description Forbidden */
                403: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["models.ErrorResponse"];
                    };
                };
                /** @description Not Found */
                404: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["models.ErrorResponse"];
                    };
                };
            };
        };
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/admin/hackathons/{id}/registration-statuses/batch-set/preview": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Предпросмотр массовой установки статуса
         * @description Возвращает количество изменяемых и пропускаемых записей без изменения данных.
         */
        post: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    /** @description Идентификатор хакатона */
                    id: string;
                };
                cookie?: never;
            };
            requestBody: components["requestBodies"]["models.BatchSetStatusRequest"];
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["models.PreviewResponse"];
                    };
                };
                /** @description Bad Request */
                400: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["models.ErrorResponse"];
                    };
                };
                /** @description Forbidden */
                403: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["models.ErrorResponse"];
                    };
                };
                /** @description Not Found */
                404: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["models.ErrorResponse"];
                    };
                };
            };
        };
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/admin/hackathons/{id}/registration/disable": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Выключение регистрации
         * @description Ожидающие уведомления отменяются, статусы сохраняются, но перестают быть actionable.
         */
        post: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    /** @description Идентификатор хакатона */
                    id: string;
                };
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["models.RegistrationResponse"];
                    };
                };
                /** @description Forbidden */
                403: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["models.ErrorResponse"];
                    };
                };
                /** @description Not Found */
                404: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["models.ErrorResponse"];
                    };
                };
                /** @description регистрация уже выключена */
                409: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["models.ErrorResponse"];
                    };
                };
            };
        };
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/admin/hackathons/{id}/registration/enable": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Включение регистрации
         * @description Увеличивает activation_version и schedule_version, создаёт недостающие статусы;
         *     участники в TODO снова получают первичное уведомление.
         */
        post: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    /** @description Идентификатор хакатона */
                    id: string;
                };
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["models.RegistrationResponse"];
                    };
                };
                /** @description Forbidden */
                403: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["models.ErrorResponse"];
                    };
                };
                /** @description Not Found */
                404: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["models.ErrorResponse"];
                    };
                };
                /** @description регистрация уже активна */
                409: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["models.ErrorResponse"];
                    };
                };
            };
        };
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/admin/hackathons/{id}/registration/rules": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Правила напоминаний */
        get: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    /** @description Идентификатор хакатона */
                    id: string;
                };
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["models.NotificationRuleResponse"][];
                    };
                };
                /** @description Forbidden */
                403: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["models.ErrorResponse"];
                    };
                };
                /** @description Not Found */
                404: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["models.ErrorResponse"];
                    };
                };
            };
        };
        put?: never;
        /**
         * Создание правила напоминания
         * @description Знак offset_minutes задаёт тип: положительное значение — напоминание до дедлайна,
         *     ноль — в момент дедлайна, отрицательное — уведомление о просрочке.
         *     На регистрацию допускается не более 10 правил.
         */
        post: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    /** @description Идентификатор хакатона */
                    id: string;
                };
                cookie?: never;
            };
            /** @description Параметры правила */
            requestBody: {
                content: {
                    "application/json": components["schemas"]["models.CreateRuleRequest"];
                };
            };
            responses: {
                /** @description Created */
                201: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["models.NotificationRuleResponse"];
                    };
                };
                /** @description Bad Request */
                400: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["models.ErrorResponse"];
                    };
                };
                /** @description Forbidden */
                403: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["models.ErrorResponse"];
                    };
                };
                /** @description Not Found */
                404: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["models.ErrorResponse"];
                    };
                };
                /** @description правило с таким смещением уже есть или исчерпан лимит слотов */
                409: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["models.ErrorResponse"];
                    };
                };
            };
        };
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/admin/hackathons/{id}/stages": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Создание этапа
         * @description Пересечения этапов и выход за период хакатона допускаются. Этап не порождает уведомлений.
         */
        post: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    /** @description Идентификатор хакатона */
                    id: string;
                };
                cookie?: never;
            };
            /** @description Данные этапа */
            requestBody: {
                content: {
                    "application/json": components["schemas"]["models.CreateStageRequest"];
                };
            };
            responses: {
                /** @description Created */
                201: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["models.StageResponse"];
                    };
                };
                /** @description Bad Request */
                400: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["models.ErrorResponse"];
                    };
                };
                /** @description Forbidden */
                403: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["models.ErrorResponse"];
                    };
                };
                /** @description Not Found */
                404: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["models.ErrorResponse"];
                    };
                };
            };
        };
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/admin/invites": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Список приглашений */
        get: {
            parameters: {
                query?: {
                    /** @description Номер страницы */
                    page?: number;
                    /** @description Размер страницы */
                    page_size?: number;
                };
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["models.InvitePage"];
                    };
                };
                /** @description Forbidden */
                403: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["models.ErrorResponse"];
                    };
                };
            };
        };
        put?: never;
        /**
         * Создание приглашения
         * @description Создание сериализуется по нормализованному email: предыдущее непринятое приглашение отзывается,
         *     затем создаётся новое. Приглашение на адрес существующего пользователя отклоняется конфликтом
         *     независимо от его активности.
         */
        post: {
            parameters: {
                query?: never;
                header?: never;
                path?: never;
                cookie?: never;
            };
            /** @description Адрес приглашаемого */
            requestBody: {
                content: {
                    "application/json": components["schemas"]["models.CreateInviteRequest"];
                };
            };
            responses: {
                /** @description Created */
                201: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["models.CreateInviteResponse"];
                    };
                };
                /** @description Bad Request */
                400: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["models.ErrorResponse"];
                    };
                };
                /** @description Forbidden */
                403: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["models.ErrorResponse"];
                    };
                };
                /** @description пользователь с таким email уже существует */
                409: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["models.ErrorResponse"];
                    };
                };
            };
        };
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/admin/invites/{id}/revoke": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** Отзыв приглашения */
        post: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    /** @description Идентификатор приглашения */
                    id: string;
                };
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["models.MessageResponse"];
                    };
                };
                /** @description Forbidden */
                403: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["models.ErrorResponse"];
                    };
                };
                /** @description Not Found */
                404: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["models.ErrorResponse"];
                    };
                };
            };
        };
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/admin/participants/{id}/reactivate": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Реактивация участника
         * @description Возвращает участие в ASSIGNED, увеличивает assignment_version, очищает removed_at
         *     и заново задаёт функцию. Существующий статус регистрации сохраняется.
         */
        post: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    /** @description Идентификатор участника */
                    id: string;
                };
                cookie?: never;
            };
            /** @description Функция участника */
            requestBody: {
                content: {
                    "application/json": components["schemas"]["models.UpdateTeamRoleRequest"];
                };
            };
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["models.ParticipantResponse"];
                    };
                };
                /** @description Bad Request */
                400: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["models.ErrorResponse"];
                    };
                };
                /** @description Forbidden */
                403: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["models.ErrorResponse"];
                    };
                };
                /** @description Not Found */
                404: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["models.ErrorResponse"];
                    };
                };
                /** @description участник уже назначен */
                409: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["models.ErrorResponse"];
                    };
                };
            };
        };
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/admin/participants/{id}/team-role": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        /**
         * Изменение функции участника
         * @description team_role — свободнотекстовая функция на хакатоне, а не право доступа.
         */
        patch: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    /** @description Идентификатор участника */
                    id: string;
                };
                cookie?: never;
            };
            /** @description Новая функция */
            requestBody: {
                content: {
                    "application/json": components["schemas"]["models.UpdateTeamRoleRequest"];
                };
            };
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["models.ParticipantResponse"];
                    };
                };
                /** @description Bad Request */
                400: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["models.ErrorResponse"];
                    };
                };
                /** @description Forbidden */
                403: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["models.ErrorResponse"];
                    };
                };
                /** @description Not Found */
                404: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["models.ErrorResponse"];
                    };
                };
            };
        };
        trace?: never;
    };
    "/admin/queries/overdue": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Просроченные регистрации
         * @description Участники со статусом TODO, у которых дедлайн уже прошёл, а хакатон ещё не завершён.
         */
        get: {
            parameters: {
                query?: {
                    /** @description Номер страницы */
                    page?: number;
                    /** @description Размер страницы */
                    page_size?: number;
                };
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["models.DeadlinePage"];
                    };
                };
                /** @description Forbidden */
                403: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["models.ErrorResponse"];
                    };
                };
            };
        };
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/admin/queries/upcoming": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Ближайшие дедлайны регистрации
         * @description Участники со статусом TODO, у которых дедлайн наступает в пределах указанного окна.
         */
        get: {
            parameters: {
                query?: {
                    /** @description Номер страницы */
                    page?: number;
                    /** @description Размер страницы */
                    page_size?: number;
                    /** @description Окно в часах */
                    within_hours?: number;
                };
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["models.DeadlinePage"];
                    };
                };
                /** @description Forbidden */
                403: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["models.ErrorResponse"];
                    };
                };
            };
        };
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/admin/registration-rules/{id}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post?: never;
        /**
         * Выключение правила напоминания
         * @description Правило переводится в enabled=false; строка сохраняется, чтобы занятый слот
         *     и смещение оставались зафиксированными.
         */
        delete: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    /** @description Идентификатор правила */
                    id: string;
                };
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description правило выключено */
                204: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
                /** @description Forbidden */
                403: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["models.ErrorResponse"];
                    };
                };
                /** @description Not Found */
                404: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["models.ErrorResponse"];
                    };
                };
            };
        };
        options?: never;
        head?: never;
        /**
         * Изменение правила напоминания
         * @description Изменение полей расписания увеличивает schedule_version один раз на транзакцию
         *     и запускает согласование уведомлений.
         */
        patch: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    /** @description Идентификатор правила */
                    id: string;
                };
                cookie?: never;
            };
            /** @description Изменяемые поля */
            requestBody: {
                content: {
                    "application/json": components["schemas"]["models.UpdateRuleRequest"];
                };
            };
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["models.NotificationRuleResponse"];
                    };
                };
                /** @description Bad Request */
                400: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["models.ErrorResponse"];
                    };
                };
                /** @description Forbidden */
                403: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["models.ErrorResponse"];
                    };
                };
                /** @description Not Found */
                404: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["models.ErrorResponse"];
                    };
                };
                /** @description Conflict */
                409: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["models.ErrorResponse"];
                    };
                };
            };
        };
        trace?: never;
    };
    "/admin/registration-statuses/{id}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        /**
         * Административный переход статуса
         * @description Допустимые переходы: TODO → DONE, DONE → TODO, TODO/DONE → NOT_REQUIRED,
         *     NOT_REQUIRED → TODO. Вход в TODO увеличивает todo_cycle и очищает registered_at.
         */
        patch: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    /** @description Идентификатор статуса */
                    id: string;
                };
                cookie?: never;
            };
            /** @description Новый статус */
            requestBody: {
                content: {
                    "application/json": components["schemas"]["models.AdminChangeStatusRequest"];
                };
            };
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["models.RegistrationStatusResponse"];
                    };
                };
                /** @description Bad Request */
                400: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["models.ErrorResponse"];
                    };
                };
                /** @description Forbidden */
                403: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["models.ErrorResponse"];
                    };
                };
                /** @description Not Found */
                404: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["models.ErrorResponse"];
                    };
                };
                /** @description Conflict */
                409: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["models.ErrorResponse"];
                    };
                };
            };
        };
        trace?: never;
    };
    "/admin/stages/{id}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post?: never;
        /** Удаление этапа */
        delete: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    /** @description Идентификатор этапа */
                    id: string;
                };
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description этап удалён */
                204: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
                /** @description Forbidden */
                403: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["models.ErrorResponse"];
                    };
                };
                /** @description Not Found */
                404: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["models.ErrorResponse"];
                    };
                };
            };
        };
        options?: never;
        head?: never;
        /** Изменение этапа */
        patch: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    /** @description Идентификатор этапа */
                    id: string;
                };
                cookie?: never;
            };
            /** @description Изменяемые поля */
            requestBody: {
                content: {
                    "application/json": components["schemas"]["models.UpdateStageRequest"];
                };
            };
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["models.StageResponse"];
                    };
                };
                /** @description Bad Request */
                400: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["models.ErrorResponse"];
                    };
                };
                /** @description Forbidden */
                403: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["models.ErrorResponse"];
                    };
                };
                /** @description Not Found */
                404: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["models.ErrorResponse"];
                    };
                };
            };
        };
        trace?: never;
    };
    "/admin/timeline": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Административная временная шкала
         * @description Все хакатоны с фильтрами по состоянию, участнику и диапазону дат.
         */
        get: {
            parameters: {
                query?: {
                    /** @description Начало периода, RFC3339 */
                    from?: string;
                    /** @description Показывать архивные */
                    include_archived?: boolean;
                    /** @description Фильтр по участнику */
                    participant_user_id?: string;
                    /** @description Фильтр состояний через запятую */
                    state?: string;
                    /** @description Конец периода, RFC3339 */
                    to?: string;
                };
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["models.TimelineResponse"];
                    };
                };
                /** @description Bad Request */
                400: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["models.ErrorResponse"];
                    };
                };
                /** @description Forbidden */
                403: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["models.ErrorResponse"];
                    };
                };
            };
        };
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/admin/users": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Поиск пользователей
         * @description Поиск по display_name и нормализованному email для выбора участников.
         *     Возвращаются только минимальные поля; credentials и данные каналов не отдаются.
         */
        get: {
            parameters: {
                query?: {
                    /** @description Номер страницы */
                    page?: number;
                    /** @description Размер страницы */
                    page_size?: number;
                    /** @description Строка поиска */
                    query?: string;
                };
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["models.UserPage"];
                    };
                };
                /** @description Forbidden */
                403: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["models.ErrorResponse"];
                    };
                };
            };
        };
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/admin/users/{id}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post?: never;
        /**
         * Необратимое удаление пользователя
         * @description Удаляет credentials и каналы доставки, обезличивает имя и email.
         *     Ссылки участия и записи аудита сохраняются.
         */
        delete: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    /** @description Идентификатор пользователя */
                    id: string;
                };
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["models.MessageResponse"];
                    };
                };
                /** @description Forbidden */
                403: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["models.ErrorResponse"];
                    };
                };
                /** @description Not Found */
                404: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["models.ErrorResponse"];
                    };
                };
            };
        };
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/admin/users/{id}/activate": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Обратная активация пользователя
         * @description Восстанавливает доступ. Ранее отменённые уведомления не воскрешаются.
         */
        post: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    /** @description Идентификатор пользователя */
                    id: string;
                };
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["models.MessageResponse"];
                    };
                };
                /** @description Forbidden */
                403: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["models.ErrorResponse"];
                    };
                };
                /** @description Not Found */
                404: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["models.ErrorResponse"];
                    };
                };
            };
        };
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/admin/users/{id}/deactivate": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Деактивация пользователя
         * @description Отзывает сессии, удаляет привязку Telegram и переводит ожидающие уведомления в CANCELLED.
         */
        post: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    /** @description Идентификатор пользователя */
                    id: string;
                };
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["models.MessageResponse"];
                    };
                };
                /** @description Forbidden */
                403: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["models.ErrorResponse"];
                    };
                };
                /** @description Not Found */
                404: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["models.ErrorResponse"];
                    };
                };
            };
        };
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/auth/csrf": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Получение CSRF-токена
         * @description Выдаёт токен в cookie и в теле ответа. Все изменяющие запросы обязаны передавать его заголовком X-CSRF-Token.
         */
        get: {
            parameters: {
                query?: never;
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["models.CSRFResponse"];
                    };
                };
            };
        };
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/auth/email-change/confirm": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Подтверждение смены email
         * @description Переносит pending_email в основной адрес. До подтверждения вход работает по прежнему адресу.
         */
        post: {
            parameters: {
                query?: never;
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody: components["requestBodies"]["models.TokenRequest"];
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["models.MessageResponse"];
                    };
                };
                /** @description Bad Request */
                400: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["models.ErrorResponse"];
                    };
                };
                /** @description адрес уже занят */
                409: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["models.ErrorResponse"];
                    };
                };
            };
        };
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/auth/login": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Вход по email и паролю
         * @description Выдаёт access token на 15 минут и rotating refresh token на 30 дней в HttpOnly cookie.
         *     Ограничение частоты: 10 попыток за 15 минут на пару IP и email.
         */
        post: {
            parameters: {
                query?: never;
                header?: never;
                path?: never;
                cookie?: never;
            };
            /** @description Учётные данные */
            requestBody: {
                content: {
                    "application/json": components["schemas"]["models.LoginRequest"];
                };
            };
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["models.AuthResponse"];
                    };
                };
                /** @description Bad Request */
                400: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["models.ErrorResponse"];
                    };
                };
                /** @description неверные учётные данные или деактивированная запись */
                401: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["models.ErrorResponse"];
                    };
                };
                /** @description Too Many Requests */
                429: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["models.ErrorResponse"];
                    };
                };
            };
        };
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/auth/logout": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Выход из текущей сессии
         * @description Отзывает refresh token текущей сессии и очищает cookie.
         */
        post: {
            parameters: {
                query?: never;
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["models.MessageResponse"];
                    };
                };
            };
        };
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/auth/logout-all": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Выход из всех сессий
         * @description Отзывает все активные сессии пользователя.
         */
        post: {
            parameters: {
                query?: never;
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["models.MessageResponse"];
                    };
                };
                /** @description Unauthorized */
                401: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["models.ErrorResponse"];
                    };
                };
            };
        };
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/auth/password/forgot": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Запрос восстановления пароля
         * @description Выдаёт одноразовый токен на 30 минут. Ответ не раскрывает существование учётной записи.
         */
        post: {
            parameters: {
                query?: never;
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody: components["requestBodies"]["models.EmailRequest"];
            responses: {
                /** @description Accepted */
                202: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["models.MessageResponse"];
                    };
                };
                /** @description Bad Request */
                400: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["models.ErrorResponse"];
                    };
                };
                /** @description Too Many Requests */
                429: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["models.ErrorResponse"];
                    };
                };
            };
        };
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/auth/password/reset": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Установка нового пароля
         * @description После смены пароля все активные сессии пользователя отзываются.
         */
        post: {
            parameters: {
                query?: never;
                header?: never;
                path?: never;
                cookie?: never;
            };
            /** @description Токен и новый пароль */
            requestBody: {
                content: {
                    "application/json": components["schemas"]["models.ResetPasswordRequest"];
                };
            };
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["models.MessageResponse"];
                    };
                };
                /** @description Bad Request */
                400: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["models.ErrorResponse"];
                    };
                };
            };
        };
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/auth/refresh": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Обновление сессии
         * @description Ротация refresh token. Повторное использование отозванного токена отзывает всю цепочку сессии.
         */
        post: {
            parameters: {
                query?: never;
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["models.AuthResponse"];
                    };
                };
                /** @description Unauthorized */
                401: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["models.ErrorResponse"];
                    };
                };
            };
        };
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/auth/register": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Регистрация пользователя
         * @description Создаёт учётную запись, отправляет письмо подтверждения на 24 часа и открывает сессию.
         *     До подтверждения адреса вход разрешён, продуктовые уведомления по email — нет.
         *     Если передан invite_token, приглашение принимается в той же транзакции.
         */
        post: {
            parameters: {
                query?: never;
                header?: never;
                path?: never;
                cookie?: never;
            };
            /** @description Данные регистрации */
            requestBody: {
                content: {
                    "application/json": components["schemas"]["models.RegisterRequest"];
                };
            };
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["models.AuthResponse"];
                    };
                };
                /** @description Bad Request */
                400: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["models.ErrorResponse"];
                    };
                };
                /** @description email уже занят */
                409: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["models.ErrorResponse"];
                    };
                };
                /** @description Too Many Requests */
                429: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["models.ErrorResponse"];
                    };
                };
            };
        };
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/auth/verify-email": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Подтверждение email
         * @description Потребляет одноразовый токен подтверждения со сроком 24 часа.
         */
        post: {
            parameters: {
                query?: never;
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody: components["requestBodies"]["models.TokenRequest"];
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["models.MessageResponse"];
                    };
                };
                /** @description токен недействителен или истёк */
                400: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["models.ErrorResponse"];
                    };
                };
            };
        };
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/auth/verify-email/resend": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Повторная отправка письма подтверждения
         * @description Ограничение частоты: 5 запросов в час на пару IP и email. Ответ не раскрывает существование учётной записи.
         */
        post: {
            parameters: {
                query?: never;
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody: components["requestBodies"]["models.EmailRequest"];
            responses: {
                /** @description Accepted */
                202: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["models.MessageResponse"];
                    };
                };
                /** @description Bad Request */
                400: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["models.ErrorResponse"];
                    };
                };
                /** @description Too Many Requests */
                429: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["models.ErrorResponse"];
                    };
                };
            };
        };
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/hackathons/{id}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Карточка назначенного хакатона
         * @description Функция участника, вычисляемое состояние, этапы, ближайший этап, статус регистрации,
         *     дедлайн и ссылка. Административные заметки участнику не отдаются.
         */
        get: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    /** @description Идентификатор хакатона */
                    id: string;
                };
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["models.HackathonCard"];
                    };
                };
                /** @description Unauthorized */
                401: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["models.ErrorResponse"];
                    };
                };
                /** @description Forbidden */
                403: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["models.ErrorResponse"];
                    };
                };
                /** @description Not Found */
                404: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["models.ErrorResponse"];
                    };
                };
            };
        };
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/hackathons/{id}/registration/done": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Отметка о выполненной регистрации
         * @description Самоотчёт участника: перевод собственного статуса TODO в DONE. Доступен при активной
         *     регистрации, назначенном участии и неархивном хакатоне. Система не проверяет внешний сайт.
         */
        post: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    /** @description Идентификатор хакатона */
                    id: string;
                };
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["models.RegistrationStatusResponse"];
                    };
                };
                /** @description Unauthorized */
                401: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["models.ErrorResponse"];
                    };
                };
                /** @description Forbidden */
                403: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["models.ErrorResponse"];
                    };
                };
                /** @description Not Found */
                404: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["models.ErrorResponse"];
                    };
                };
                /** @description недопустимый переход состояния */
                409: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["models.ErrorResponse"];
                    };
                };
            };
        };
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/hackathons/{id}/stages": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Этапы хакатона
         * @description Доступно назначенному участнику для опубликованного хакатона и администратору всегда.
         */
        get: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    /** @description Идентификатор хакатона */
                    id: string;
                };
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["models.StageResponse"][];
                    };
                };
                /** @description Forbidden */
                403: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["models.ErrorResponse"];
                    };
                };
                /** @description Not Found */
                404: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["models.ErrorResponse"];
                    };
                };
            };
        };
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/healthz": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Проверка живости */
        get: {
            parameters: {
                query?: never;
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["models.HealthResponse"];
                    };
                };
            };
        };
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/invites/{token}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Публичный просмотр приглашения
         * @description Возвращает адрес и срок действия приглашения без раскрытия иных данных.
         */
        get: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    /** @description Токен приглашения */
                    token: string;
                };
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["models.InvitePreview"];
                    };
                };
                /** @description Not Found */
                404: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["models.ErrorResponse"];
                    };
                };
            };
        };
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/invites/accept": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Принятие приглашения
         * @description Создаёт учётную запись на адрес приглашения и открывает сессию.
         *     Остальные неистёкшие приглашения этого адреса отзываются в той же транзакции.
         */
        post: {
            parameters: {
                query?: never;
                header?: never;
                path?: never;
                cookie?: never;
            };
            /** @description Токен и данные учётной записи */
            requestBody: {
                content: {
                    "application/json": components["schemas"]["models.AcceptInviteRequest"];
                };
            };
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["models.AuthResponse"];
                    };
                };
                /** @description Bad Request */
                400: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["models.ErrorResponse"];
                    };
                };
                /** @description Conflict */
                409: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["models.ErrorResponse"];
                    };
                };
            };
        };
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/me": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Собственный профиль */
        get: {
            parameters: {
                query?: never;
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["models.MeResponse"];
                    };
                };
                /** @description Unauthorized */
                401: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["models.ErrorResponse"];
                    };
                };
            };
        };
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        /**
         * Изменение собственного профиля
         * @description Флаг администратора, chat_id Telegram и пароль этим endpoint не изменяются.
         */
        patch: {
            parameters: {
                query?: never;
                header?: never;
                path?: never;
                cookie?: never;
            };
            /** @description Изменяемые поля */
            requestBody: {
                content: {
                    "application/json": components["schemas"]["models.UpdateProfileRequest"];
                };
            };
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["models.MeResponse"];
                    };
                };
                /** @description Bad Request */
                400: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["models.ErrorResponse"];
                    };
                };
                /** @description Unauthorized */
                401: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["models.ErrorResponse"];
                    };
                };
            };
        };
        trace?: never;
    };
    "/me/deactivate": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Деактивация собственной учётной записи
         * @description Отзывает сессии, удаляет привязку Telegram и отменяет ожидающие уведомления.
         *     Обратная активация выполняется администратором.
         */
        post: {
            parameters: {
                query?: never;
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["models.MessageResponse"];
                    };
                };
                /** @description Unauthorized */
                401: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["models.ErrorResponse"];
                    };
                };
            };
        };
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/me/email-change": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Запрос смены email
         * @description Новый адрес сохраняется как pending_email и становится основным только после подтверждения.
         */
        post: {
            parameters: {
                query?: never;
                header?: never;
                path?: never;
                cookie?: never;
            };
            /** @description Новый адрес и текущий пароль */
            requestBody: {
                content: {
                    "application/json": components["schemas"]["models.ChangeEmailRequest"];
                };
            };
            responses: {
                /** @description Accepted */
                202: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["models.MessageResponse"];
                    };
                };
                /** @description Bad Request */
                400: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["models.ErrorResponse"];
                    };
                };
                /** @description Unauthorized */
                401: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["models.ErrorResponse"];
                    };
                };
                /** @description адрес уже занят */
                409: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["models.ErrorResponse"];
                    };
                };
            };
        };
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/me/hackathons": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Мои хакатоны
         * @description Опубликованные хакатоны с назначенным участием: UPCOMING, ACTIVE и FINISHED.
         *     Архивные скрыты по умолчанию и доступны фильтром.
         */
        get: {
            parameters: {
                query?: {
                    /** @description Показывать архивные */
                    include_archived?: boolean;
                    /** @description Номер страницы */
                    page?: number;
                    /** @description Размер страницы */
                    page_size?: number;
                    /** @description Фильтр состояний через запятую */
                    state?: "UPCOMING" | "ACTIVE" | "FINISHED" | "ARCHIVED";
                };
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["models.MyHackathonPage"];
                    };
                };
                /** @description Unauthorized */
                401: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["models.ErrorResponse"];
                    };
                };
            };
        };
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/me/telegram": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post?: never;
        /** Отвязка Telegram */
        delete: {
            parameters: {
                query?: never;
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["models.MessageResponse"];
                    };
                };
                /** @description Unauthorized */
                401: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["models.ErrorResponse"];
                    };
                };
            };
        };
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/me/telegram/link": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Ссылка привязки Telegram
         * @description Возвращает одноразовый deep-link, связанный с текущим пользователем.
         *     Идентификатор чата устанавливается только этим потоком.
         */
        post: {
            parameters: {
                query?: never;
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["models.TelegramLinkResponse"];
                    };
                };
                /** @description Unauthorized */
                401: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["models.ErrorResponse"];
                    };
                };
            };
        };
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/me/timeline": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Временная шкала пользователя
         * @description Только назначенные опубликованные неархивные хакатоны. Каждый хакатон — отдельная строка,
         *     этапы отдаются интервалами, дедлайн регистрации — отдельным маркером.
         */
        get: {
            parameters: {
                query?: {
                    /** @description Начало периода, RFC3339 */
                    from?: string;
                    /** @description Конец периода, RFC3339 */
                    to?: string;
                };
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["models.TimelineResponse"];
                    };
                };
                /** @description Bad Request */
                400: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["models.ErrorResponse"];
                    };
                };
                /** @description Unauthorized */
                401: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["models.ErrorResponse"];
                    };
                };
            };
        };
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/metrics": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Метрики Prometheus
         * @description Защищённый endpoint. Требует заголовок Authorization с bearer-токеном METRICS_TOKEN,
         *     если токен задан конфигурацией.
         */
        get: {
            parameters: {
                query?: never;
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description метрики в формате Prometheus */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "text/plain": string;
                    };
                };
                /** @description Unauthorized */
                401: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "text/plain": components["schemas"]["models.ErrorResponse"];
                    };
                };
            };
        };
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/ops/worker-heartbeat": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Состояние фоновых процессов
         * @description Время последних запусков планировщика и worker, длины очереди по статусам
         *     и возраст самой старой ожидающей записи.
         */
        get: {
            parameters: {
                query?: never;
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["models.WorkerHeartbeatResponse"];
                    };
                };
                /** @description Service Unavailable */
                503: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["models.ErrorResponse"];
                    };
                };
            };
        };
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/readyz": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Проверка готовности
         * @description Проверяет доступность базы данных.
         */
        get: {
            parameters: {
                query?: never;
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["models.ReadyResponse"];
                    };
                };
                /** @description Service Unavailable */
                503: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["models.ReadyResponse"];
                    };
                };
            };
        };
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
}
export type webhooks = Record<string, never>;
export interface components {
    schemas: {
        "models.AcceptInviteRequest": {
            /** @example Иван Петров */
            display_name?: string;
            /** @example correct-horse-battery */
            password?: string;
            /** @example abc123 */
            token?: string;
        };
        "models.AddParticipantItem": {
            /** @example Разработчик */
            team_role: string;
            user_id: string;
        };
        "models.AddParticipantsRequest": {
            items?: components["schemas"]["models.AddParticipantItem"][];
        };
        "models.AdminChangeStatusRequest": {
            note?: string;
            status?: components["schemas"]["models.RegistrationStatusValue"];
        };
        /** @enum {string} */
        "models.AuditAction": "USER_REGISTER" | "USER_DEACTIVATE" | "USER_ACTIVATE" | "USER_DELETE" | "USER_PROFILE_CHANGE" | "USER_ADMIN_FLAG_CHANGE" | "INVITE_CREATE" | "INVITE_REVOKE" | "INVITE_ACCEPT" | "HACKATHON_CREATE" | "HACKATHON_UPDATE" | "HACKATHON_PUBLISH" | "HACKATHON_ARCHIVE" | "STAGE_CREATE" | "STAGE_UPDATE" | "STAGE_DELETE" | "PARTICIPANT_ADD" | "PARTICIPANT_REMOVE" | "PARTICIPANT_REACTIVATE" | "TEAM_ROLE_CHANGE" | "REGISTRATION_CHANGE" | "STATUS_CHANGE" | "RULE_CHANGE";
        "models.AuditPage": {
            items: components["schemas"]["models.AuditResponse"][];
            meta: components["schemas"]["models.PageMeta"];
        };
        "models.AuditResponse": {
            action: components["schemas"]["models.AuditAction"];
            actor_email?: string;
            actor_user_id?: string;
            after?: unknown;
            before?: unknown;
            /** Format: date-time */
            created_at: string;
            entity_id: string;
            entity_type: components["schemas"]["models.EntityType"];
            id: string;
            request_id: string;
        };
        "models.AuthResponse": {
            /** Format: date-time */
            access_expires_at: string;
            /** Format: date-time */
            refresh_expires_at: string;
            user: components["schemas"]["models.MeResponse"];
        };
        "models.BatchItemResult": {
            /** @example already_assigned */
            code?: string;
            id?: string;
            /** @example 0 */
            index: number;
            /** @example 3f1c1e6e-0b0e-4a2b-9c1a-7d1f1f5a1c11 */
            key?: string;
            /** @example участник уже назначен */
            message?: string;
            /**
             * @example ok
             * @enum {string}
             */
            status: "ok" | "skipped" | "error";
        };
        "models.BatchResult": {
            /** @example 0 */
            failed: number;
            results: components["schemas"]["models.BatchItemResult"][];
            /** @example 1 */
            skipped: number;
            /** @example 2 */
            succeeded: number;
        };
        "models.BatchSetStatusRequest": {
            note?: string;
            participant_ids?: string[];
            status?: components["schemas"]["models.RegistrationStatusValue"];
        };
        "models.ChangeEmailRequest": {
            /** @example new@example.com */
            new_email?: string;
            /** @example correct-horse-battery */
            password?: string;
        };
        /** @enum {string} */
        "models.ChangeSource": "SYSTEM" | "USER" | "ADMIN";
        /** @enum {string} */
        "models.Channel": "TELEGRAM" | "EMAIL";
        "models.CopyParticipantsRequest": {
            overrides?: components["schemas"]["models.CopyRoleOverride"][];
            source_hackathon_id?: string;
        };
        "models.CopyRoleOverride": {
            /** @example Ментор */
            team_role: string;
            user_id: string;
        };
        "models.CreateHackathonRequest": {
            description?: string;
            /** Format: date-time */
            end_at?: string;
            notes?: string;
            organizer?: string;
            /** Format: date-time */
            start_at?: string;
            /** @example Всероссийский хакатон */
            title?: string;
            /** @example https://example.com */
            website_url?: string;
        };
        "models.CreateInviteRequest": {
            /** @example new@example.com */
            email?: string;
        };
        "models.CreateInviteResponse": {
            /** @example https://tracker.local/invite/abc123 */
            accept_link: string;
            invite: components["schemas"]["models.InviteResponse"];
        };
        "models.CreateRegistrationRequest": {
            /** Format: date-time */
            deadline_at?: string;
            description?: string;
            /** @example https://example.com/register */
            url?: string;
        };
        "models.CreateRuleRequest": {
            /** @enum {string} */
            channel_override?: "TELEGRAM" | "EMAIL";
            /** @example true */
            enabled?: boolean;
            /** @example 1440 */
            offset_minutes?: number;
            /** @example 1 */
            slot_no?: number;
        };
        "models.CreateStageRequest": {
            description?: string;
            /** Format: date-time */
            end_at?: string;
            /** @example Приём заявок */
            name?: string;
            sort_order?: number;
            /** Format: date-time */
            start_at?: string;
            type?: components["schemas"]["models.StageType"];
            url?: string;
        };
        "models.CSRFResponse": {
            /** @example 0f2a5c8d1b3e4f60 */
            csrf_token: string;
            /** @example X-CSRF-Token */
            header_name: string;
        };
        "models.DeadlineItem": {
            /** Format: date-time */
            deadline_at: string;
            hackathon_id: string;
            hackathon_title: string;
            /** @example 120 */
            overdue_minutes?: number;
            participant_id: string;
            status: components["schemas"]["models.RegistrationStatusValue"];
            user: components["schemas"]["models.UserSummary"];
        };
        "models.DeadlinePage": {
            items: components["schemas"]["models.DeadlineItem"][];
            meta: components["schemas"]["models.PageMeta"];
        };
        "models.EmailRequest": {
            /** @example ivan@example.com */
            email?: string;
        };
        /** @enum {string} */
        "models.EntityType": "USER" | "INVITE" | "HACKATHON" | "STAGE" | "HACKATHON_PARTICIPANT" | "REGISTRATION" | "REGISTRATION_STATUS" | "NOTIFICATION_RULE";
        "models.ErrorBody": {
            /** @example validation_failed */
            code: string;
            fields?: components["schemas"]["models.FieldError"][];
            /** @example некорректные данные запроса */
            message: string;
            /** @example 01HZY0Q2K7 */
            request_id: string;
        };
        "models.ErrorResponse": {
            error: components["schemas"]["models.ErrorBody"];
        };
        "models.FieldError": {
            /** @example email */
            field: string;
            /** @example некорректный адрес */
            message: string;
        };
        "models.HackathonCard": {
            /** @example true */
            can_mark_done: boolean;
            hackathon: components["schemas"]["models.HackathonResponse"];
            next_stage?: components["schemas"]["models.StageShort"];
            registration?: components["schemas"]["models.RegistrationPublic"];
            registration_status?: components["schemas"]["models.RegistrationStatusShort"];
            stages: components["schemas"]["models.StageResponse"][];
            /** @example Разработчик */
            team_role?: string;
        };
        "models.HackathonPage": {
            items: components["schemas"]["models.HackathonResponse"][];
            meta: components["schemas"]["models.PageMeta"];
        };
        "models.HackathonResponse": {
            /** Format: date-time */
            archived_at?: string;
            /** Format: date-time */
            created_at: string;
            description?: string;
            /** Format: date-time */
            end_at: string;
            id: string;
            notes?: string;
            /** @example Оргкомитет */
            organizer?: string;
            /** Format: date-time */
            published_at?: string;
            /** Format: date-time */
            start_at: string;
            state: components["schemas"]["models.HackathonState"];
            /** @example Всероссийский хакатон */
            title: string;
            /** Format: date-time */
            updated_at: string;
            /** @example https://example.com */
            website_url?: string;
        };
        /** @enum {string} */
        "models.HackathonState": "UNPUBLISHED" | "UPCOMING" | "ACTIVE" | "FINISHED" | "ARCHIVED";
        "models.HealthResponse": {
            /** @example ok */
            status: string;
            /** Format: date-time */
            time: string;
        };
        "models.InvitePage": {
            items: components["schemas"]["models.InviteResponse"][];
            meta: components["schemas"]["models.PageMeta"];
        };
        "models.InvitePreview": {
            /** @example new@example.com */
            email?: string;
            /** Format: date-time */
            expires_at?: string;
            /** @example true */
            valid: boolean;
        };
        "models.InviteResponse": {
            /** Format: date-time */
            accepted_at?: string;
            /** Format: date-time */
            created_at: string;
            created_by_user_id: string;
            /** @example new@example.com */
            email: string;
            /** Format: date-time */
            expires_at: string;
            id: string;
            /** Format: date-time */
            revoked_at?: string;
        };
        "models.LoginRequest": {
            /** @example ivan@example.com */
            email?: string;
            /** @example correct-horse-battery */
            password?: string;
        };
        "models.MeResponse": {
            /** Format: date-time */
            created_at: string;
            /** @example Иван Петров */
            display_name: string;
            /** @example ivan@example.com */
            email: string;
            /** @example true */
            email_verified: boolean;
            id: string;
            /** @example true */
            is_active: boolean;
            /** @example false */
            is_admin: boolean;
            pending_email?: string;
            preferred_channel?: components["schemas"]["models.Channel"];
            /** @example false */
            telegram_linked: boolean;
            telegram_username?: string;
            /** Format: date-time */
            updated_at: string;
        };
        "models.MessageResponse": {
            /** @example операция выполнена */
            message: string;
        };
        "models.MyHackathonItem": {
            /** Format: date-time */
            end_at: string;
            id: string;
            next_stage?: components["schemas"]["models.StageShort"];
            organizer?: string;
            /** Format: date-time */
            registration_deadline?: string;
            registration_status?: components["schemas"]["models.RegistrationStatusShort"];
            registration_url?: string;
            /** Format: date-time */
            start_at: string;
            state: components["schemas"]["models.HackathonState"];
            /** @example Разработчик */
            team_role: string;
            /** @example Всероссийский хакатон */
            title: string;
        };
        "models.MyHackathonPage": {
            items: components["schemas"]["models.MyHackathonItem"][];
            meta: components["schemas"]["models.PageMeta"];
        };
        "models.NotificationRuleResponse": {
            channel_override?: components["schemas"]["models.Channel"];
            /** Format: date-time */
            created_at: string;
            /** @example true */
            enabled: boolean;
            id: string;
            /** @example 1440 */
            offset_minutes: number;
            registration_id: string;
            /** @example 1 */
            slot_no: number;
            type: components["schemas"]["models.NotificationType"];
            /** Format: date-time */
            updated_at: string;
        };
        /** @enum {string} */
        "models.NotificationType": "REGISTRATION_REQUIRED" | "REGISTRATION_REMINDER" | "REGISTRATION_OVERDUE";
        "models.PageMeta": {
            /** @example true */
            has_next: boolean;
            /** @example 1 */
            page: number;
            /** @example 50 */
            page_size: number;
            /** @example 137 */
            total: number;
        };
        "models.ParticipantPage": {
            items: components["schemas"]["models.ParticipantResponse"][];
            meta: components["schemas"]["models.PageMeta"];
        };
        "models.ParticipantResponse": {
            /** Format: date-time */
            assigned_at: string;
            /** @example 1 */
            assignment_version: number;
            hackathon_id: string;
            id: string;
            participation_status: components["schemas"]["models.ParticipationStatus"];
            registration_status?: components["schemas"]["models.RegistrationStatusShort"];
            /** Format: date-time */
            removed_at?: string;
            /** @example Разработчик */
            team_role: string;
            user: components["schemas"]["models.UserSummary"];
        };
        /** @enum {string} */
        "models.ParticipationStatus": "ASSIGNED" | "REMOVED";
        "models.PreviewResponse": {
            /** @example 12 */
            affected: number;
            /** @example 3 */
            skipped: number;
        };
        "models.ReadyResponse": {
            /** @example ok */
            database: string;
            /** @example ready */
            status: string;
        };
        "models.RegisterRequest": {
            /** @example Иван Петров */
            display_name?: string;
            /** @example ivan@example.com */
            email?: string;
            /** @description InviteToken необязателен: при передаче приглашение принимается той же транзакцией. */
            invite_token?: string;
            /** @example correct-horse-battery */
            password?: string;
        };
        "models.RegistrationPublic": {
            /** Format: date-time */
            deadline_at?: string;
            description?: string;
            state: components["schemas"]["models.RegistrationState"];
            /** @example https://example.com/register */
            url: string;
        };
        "models.RegistrationResponse": {
            /** @example 1 */
            activation_version: number;
            /** Format: date-time */
            created_at: string;
            /** Format: date-time */
            deadline_at?: string;
            description?: string;
            hackathon_id: string;
            id: string;
            /** @example 1 */
            notification_content_version: number;
            /** @example 1 */
            schedule_version: number;
            state: components["schemas"]["models.RegistrationState"];
            /** Format: date-time */
            updated_at: string;
            /** @example https://example.com/register */
            url: string;
        };
        /** @enum {string} */
        "models.RegistrationState": "ACTIVE" | "DISABLED";
        "models.RegistrationStatusPage": {
            items: components["schemas"]["models.RegistrationStatusResponse"][];
            meta: components["schemas"]["models.PageMeta"];
        };
        "models.RegistrationStatusResponse": {
            hackathon_id: string;
            id: string;
            last_change_source: components["schemas"]["models.ChangeSource"];
            last_changed_by_user_id?: string;
            note?: string;
            participant_id: string;
            /** Format: date-time */
            registered_at?: string;
            registration_id: string;
            status: components["schemas"]["models.RegistrationStatusValue"];
            /** @example 1 */
            todo_cycle: number;
            /** Format: date-time */
            updated_at: string;
            user: components["schemas"]["models.UserSummary"];
        };
        "models.RegistrationStatusShort": {
            id: string;
            note?: string;
            /** Format: date-time */
            registered_at?: string;
            status: components["schemas"]["models.RegistrationStatusValue"];
            /** @example 1 */
            todo_cycle: number;
        };
        /** @enum {string} */
        "models.RegistrationStatusValue": "TODO" | "DONE" | "NOT_REQUIRED";
        "models.RemoveParticipantsRequest": {
            participant_ids?: string[];
        };
        "models.ResetPasswordRequest": {
            /** @example new-correct-horse */
            password?: string;
            /** @example 7f9c0f0e2f4b4a1d */
            token?: string;
        };
        "models.StageResponse": {
            /** Format: date-time */
            created_at: string;
            description?: string;
            /** Format: date-time */
            end_at: string;
            hackathon_id: string;
            id: string;
            /** @example Приём заявок */
            name: string;
            /** @example 0 */
            sort_order: number;
            /** Format: date-time */
            start_at: string;
            type: components["schemas"]["models.StageType"];
            /** Format: date-time */
            updated_at: string;
            /** @example https://example.com/stage */
            url?: string;
        };
        "models.StageShort": {
            /** Format: date-time */
            end_at: string;
            id: string;
            /** @example Приём заявок */
            name: string;
            /** Format: date-time */
            start_at: string;
            type: components["schemas"]["models.StageType"];
        };
        /** @enum {string} */
        "models.StageType": "REGISTRATION" | "SELECTION" | "PARTICIPATION" | "CHECKPOINT" | "SUBMISSION" | "DEMO" | "RESULTS" | "OTHER";
        "models.TelegramLinkResponse": {
            /** @example https://t.me/hackathon_tracker_bot?start=abc123 */
            deep_link: string;
            /** Format: date-time */
            expires_at: string;
        };
        "models.TimelineItem": {
            /** Format: date-time */
            end_at: string;
            id: string;
            /** @example Приём заявок */
            name: string;
            /** Format: date-time */
            start_at: string;
            type: components["schemas"]["models.StageType"];
        };
        "models.TimelineResponse": {
            range: components["schemas"]["models.TimeRange"];
            rows: components["schemas"]["models.TimelineRow"][];
        };
        "models.TimelineRow": {
            /** Format: date-time */
            end_at: string;
            hackathon_id: string;
            /** Format: date-time */
            registration_deadline?: string;
            stages: components["schemas"]["models.TimelineItem"][];
            /** Format: date-time */
            start_at: string;
            state: components["schemas"]["models.HackathonState"];
            team_role?: string;
            /** @example Всероссийский хакатон */
            title: string;
        };
        "models.TimeRange": {
            /** Format: date-time */
            from: string;
            /** Format: date-time */
            to: string;
        };
        "models.TokenRequest": {
            /** @example 7f9c0f0e2f4b4a1d */
            token?: string;
        };
        "models.UpdateHackathonRequest": {
            description?: string;
            /** Format: date-time */
            end_at?: string;
            notes?: string;
            organizer?: string;
            /** Format: date-time */
            start_at?: string;
            title?: string;
            website_url?: string;
        };
        "models.UpdateProfileRequest": {
            /** @example Иван Петров */
            display_name?: string;
            /**
             * @description PreferredChannel: TELEGRAM, EMAIL либо null для сброса явного выбора.
             * @enum {string}
             */
            preferred_channel?: "TELEGRAM" | "EMAIL";
            /** @example @ivan */
            telegram_username?: string;
        };
        "models.UpdateRegistrationRequest": {
            /** Format: date-time */
            deadline_at?: string;
            description?: string;
            url?: string;
        };
        "models.UpdateRuleRequest": {
            /** @enum {string} */
            channel_override?: "TELEGRAM" | "EMAIL";
            enabled?: boolean;
            offset_minutes?: number;
        };
        "models.UpdateStageRequest": {
            description?: string;
            /** Format: date-time */
            end_at?: string;
            name?: string;
            sort_order?: number;
            /** Format: date-time */
            start_at?: string;
            type?: components["schemas"]["models.StageType"];
            url?: string;
        };
        "models.UpdateTeamRoleRequest": {
            /** @example Капитан */
            team_role?: string;
        };
        "models.UserPage": {
            items: components["schemas"]["models.UserSummary"][];
            meta: components["schemas"]["models.PageMeta"];
        };
        "models.UserSummary": {
            /** @example Иван Петров */
            display_name: string;
            /** @example ivan@example.com */
            email: string;
            id: string;
            /** @example true */
            is_active: boolean;
        };
        "models.WorkerHeartbeatResponse": {
            /** @example 0 */
            failed_count: number;
            /** @example true */
            healthy: boolean;
            /** @example 12.5 */
            oldest_pending_age_seconds: number;
            /** @example 3 */
            pending_count: number;
            /** @example 1 */
            processing_count: number;
            /** Format: date-time */
            scheduler_last_run_at?: string;
            /** @example 0 */
            undeliverable_count: number;
            /** Format: date-time */
            worker_last_run_at?: string;
        };
    };
    responses: never;
    parameters: never;
    requestBodies: {
        /** @description Участники и целевой статус */
        "models.BatchSetStatusRequest": {
            content: {
                "application/json": components["schemas"]["models.BatchSetStatusRequest"];
            };
        };
        /** @description Адрес электронной почты */
        "models.EmailRequest": {
            content: {
                "application/json": components["schemas"]["models.EmailRequest"];
            };
        };
        /** @description Токен подтверждения */
        "models.TokenRequest": {
            content: {
                "application/json": components["schemas"]["models.TokenRequest"];
            };
        };
    };
    headers: never;
    pathItems: never;
}
export type $defs = Record<string, never>;
export type operations = Record<string, never>;
