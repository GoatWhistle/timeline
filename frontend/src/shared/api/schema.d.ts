/**
 * GENERATED FILE - do not edit by hand.
 * Source: docs/swagger.json. Regenerate: npm run api:types
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
         * Audit log
         * @description Restricted to administrators. Entries are immutable; file export is not supported in the MVP.
         */
        get: {
            parameters: {
                query?: {
                    /** @description Filter by action */
                    action?: string;
                    /** @description Filter by actor */
                    actor_user_id?: string;
                    /** @description Filter by entity identifier */
                    entity_id?: string;
                    /** @description Filter by entity type */
                    entity_type?: string;
                    /** @description Start of the period, RFC3339 */
                    from?: string;
                    /** @description Page number */
                    page?: number;
                    /** @description Page size */
                    page_size?: number;
                    /** @description End of the period, RFC3339 */
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
    "/admin/events": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Event list
         * @description Administrative list with every state, search and filters.
         */
        get: {
            parameters: {
                query?: {
                    /** @description Include archived records */
                    include_archived?: boolean;
                    /** @description Page number */
                    page?: number;
                    /** @description Page size */
                    page_size?: number;
                    /** @description Search by title and organiser */
                    search?: string;
                    /** @description Comma-separated state filter */
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
                        "application/json": components["schemas"]["models.EventPage"];
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
         * Create an event
         * @description The event is created unpublished; end_at must be later than start_at.
         */
        post: {
            parameters: {
                query?: never;
                header?: never;
                path?: never;
                cookie?: never;
            };
            /** @description Event payload */
            requestBody: {
                content: {
                    "application/json": components["schemas"]["models.CreateEventRequest"];
                };
            };
            responses: {
                /** @description Created */
                201: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["models.EventResponse"];
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
    "/admin/events/{id}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * The whole event
         * @description Administrative read, including notes.
         */
        get: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    /** @description Event identifier */
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
                        "application/json": components["schemas"]["models.EventResponse"];
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
         * Update an event
         * @description Changing end_at increments the registration schedule_version, cancels stale
         *     pending notifications and triggers reconciliation. Violating the condition
         *     deadline_at <= end_at is rejected.
         */
        patch: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    /** @description Event identifier */
                    id: string;
                };
                cookie?: never;
            };
            /** @description Mutable fields */
            requestBody: {
                content: {
                    "application/json": components["schemas"]["models.UpdateEventRequest"];
                };
            };
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["models.EventResponse"];
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
                /** @description the registration deadline falls outside end_at */
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
    "/admin/events/{id}/archive": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Archive an event
         * @description Terminal state in the MVP: pending notifications are cancelled and no new ones are created.
         */
        post: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    /** @description Event identifier */
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
                        "application/json": components["schemas"]["models.EventResponse"];
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
                /** @description event is already archived */
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
    "/admin/events/{id}/participants": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Event participant roster */
        get: {
            parameters: {
                query?: {
                    /** @description Include participants removed from the roster */
                    include_removed?: boolean;
                    /** @description Page number */
                    page?: number;
                    /** @description Page size */
                    page_size?: number;
                    /** @description Filter by registration status */
                    registration_status?: "TODO" | "DONE" | "NOT_REQUIRED";
                    /** @description Search by name and email */
                    search?: string;
                    /** @description Filter by participant role */
                    team_role?: string;
                };
                header?: never;
                path: {
                    /** @description Event identifier */
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
    "/admin/events/{id}/participants/batch-add": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Bulk participant assignment
         * @description Re-adding a previously removed participant reactivates the record and increments
         *     assignment_version. The assignment, registration status, primary notification and audit
         *     entry run in a single transaction per participant; the result is returned per entry.
         */
        post: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    /** @description Event identifier */
                    id: string;
                };
                cookie?: never;
            };
            /** @description List of users and their roles */
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
    "/admin/events/{id}/participants/batch-remove": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Bulk participant removal
         * @description Moves participation to REMOVED and cancels pending notifications. Sent ones are preserved.
         */
        post: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    /** @description Event identifier */
                    id: string;
                };
                cookie?: never;
            };
            /** @description Participant identifiers */
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
    "/admin/events/{id}/participants/copy-from": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Copy the roster from another event
         * @description Only assigned participants are copied. The participant role is copied as a value
         *     by default and can be overridden. Existing participants are skipped
         *     and returned as separate result entries.
         */
        post: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    /** @description Target event identifier */
                    id: string;
                };
                cookie?: never;
            };
            /** @description Source and role overrides */
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
    "/admin/events/{id}/publish": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Publish an event
         * @description The event becomes visible to participants and the scheduler; deferred primary
         *     notifications are created by reconciliation.
         */
        post: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    /** @description Event identifier */
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
                        "application/json": components["schemas"]["models.EventResponse"];
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
                /** @description the event is already published or archived */
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
    "/admin/events/{id}/registration": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Event registration */
        get: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    /** @description Event identifier */
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
         * Create a registration
         * @description Creating an active registration creates missing TODO statuses for every assigned
         *     participant. Primary notifications are created only for a published, non-archived
         *     event; otherwise they are deferred until publication. The deadline must satisfy
         *     the condition deadline_at <= event.end_at.
         */
        post: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    /** @description Event identifier */
                    id: string;
                };
                cookie?: never;
            };
            /** @description Link and deadline */
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
                /** @description registration already exists or the deadline falls outside end_at */
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
         * Update a registration
         * @description Changing the link increments notification_content_version; changing the deadline increments
         *     schedule_version. In both cases pending notifications are cancelled and current ones
         *     are created by reconciliation with a new logical key.
         */
        patch: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    /** @description Event identifier */
                    id: string;
                };
                cookie?: never;
            };
            /** @description Mutable fields */
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
    "/admin/events/{id}/registration-statuses": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Participant registration statuses */
        get: {
            parameters: {
                query?: {
                    /** @description Page number */
                    page?: number;
                    /** @description Page size */
                    page_size?: number;
                };
                header?: never;
                path: {
                    /** @description Event identifier */
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
    "/admin/events/{id}/registration-statuses/batch-set": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Bulk status assignment
         * @description Only TODO and NOT_REQUIRED are accepted. The result is returned per participant.
         */
        post: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    /** @description Event identifier */
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
    "/admin/events/{id}/registration-statuses/batch-set/preview": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Preview a bulk status assignment
         * @description Returns the number of records to be changed and skipped without modifying data.
         */
        post: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    /** @description Event identifier */
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
    "/admin/events/{id}/registration/disable": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Disable registration
         * @description Pending notifications are cancelled; statuses are preserved but stop being actionable.
         */
        post: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    /** @description Event identifier */
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
                /** @description registration is already disabled */
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
    "/admin/events/{id}/registration/enable": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Enable registration
         * @description Increments activation_version and schedule_version and creates missing statuses;
         *     participants in TODO receive the primary notification again.
         */
        post: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    /** @description Event identifier */
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
                /** @description registration is already active */
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
    "/admin/events/{id}/registration/rules": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Reminder rules */
        get: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    /** @description Event identifier */
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
         * Create a reminder rule
         * @description The sign of offset_minutes selects the type: a positive value is a reminder before the deadline,
         *     zero fires at the deadline, and a negative value is an overdue notification.
         *     A registration accepts at most 10 rules.
         */
        post: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    /** @description Event identifier */
                    id: string;
                };
                cookie?: never;
            };
            /** @description Rule parameters */
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
                /** @description a rule with this offset already exists or the slot limit is reached */
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
    "/admin/events/{id}/stages": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Create a stage
         * @description Overlapping stages and stages outside the event period are allowed. A stage produces no notifications.
         */
        post: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    /** @description Event identifier */
                    id: string;
                };
                cookie?: never;
            };
            /** @description Stage payload */
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
        /** Invite list */
        get: {
            parameters: {
                query?: {
                    /** @description Page number */
                    page?: number;
                    /** @description Page size */
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
         * Create an invite
         * @description Creation is serialised by normalised email: a previous unaccepted invite is revoked,
         *     then a new one is created. An invite for an existing user address is rejected with a conflict
         *     regardless of that user's activity.
         */
        post: {
            parameters: {
                query?: never;
                header?: never;
                path?: never;
                cookie?: never;
            };
            /** @description Address of the invited person */
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
                /** @description a user with this email already exists */
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
        /** Revoke an invite */
        post: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    /** @description Invite identifier */
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
         * Reactivate a participant
         * @description Returns participation to ASSIGNED, increments assignment_version, clears removed_at
         *     and sets the role again. An existing registration status is preserved.
         */
        post: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    /** @description Participant identifier */
                    id: string;
                };
                cookie?: never;
            };
            /** @description Participant role */
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
                /** @description the participant is already assigned */
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
         * Update a participant role
         * @description team_role is a free-text role on the event, not an access permission.
         */
        patch: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    /** @description Participant identifier */
                    id: string;
                };
                cookie?: never;
            };
            /** @description New role */
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
         * Overdue registrations
         * @description Participants in TODO whose deadline has passed while the event has not finished.
         */
        get: {
            parameters: {
                query?: {
                    /** @description Page number */
                    page?: number;
                    /** @description Page size */
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
    "/admin/queries/registration-coverage": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Registration coverage
         * @description Share of assigned participants who have self-reported registration across every
         *     published, non-archived event with an ACTIVE registration. The system never checks
         *     the external site: DONE means the participant said so, NOT_REQUIRED means an
         *     administrator waived the requirement, and both count as covered. When no event
         *     requires registration the aggregate is not applicable and share is omitted rather
         *     than reported as zero.
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
                        "application/json": components["schemas"]["models.RegistrationCoverage"];
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
         * Upcoming registration deadlines
         * @description Participants in TODO whose deadline falls within the given window.
         */
        get: {
            parameters: {
                query?: {
                    /** @description Page number */
                    page?: number;
                    /** @description Page size */
                    page_size?: number;
                    /** @description Window in hours */
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
         * Disable a reminder rule
         * @description The rule is set to enabled=false; the row is preserved so that the occupied slot
         *     and offset stay reserved.
         */
        delete: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    /** @description Rule identifier */
                    id: string;
                };
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description the rule is disabled */
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
         * Update a reminder rule
         * @description Changing schedule fields increments schedule_version once per transaction
         *     and triggers notification reconciliation.
         */
        patch: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    /** @description Rule identifier */
                    id: string;
                };
                cookie?: never;
            };
            /** @description Mutable fields */
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
         * Administrative status transition
         * @description Allowed transitions: TODO to DONE, DONE to TODO, TODO/DONE to NOT_REQUIRED,
         *     NOT_REQUIRED to TODO. Entering TODO increments todo_cycle and clears registered_at.
         */
        patch: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    /** @description Status identifier */
                    id: string;
                };
                cookie?: never;
            };
            /** @description New status */
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
    "/admin/registration-statuses/{id}/notification-preview": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Render a notification without sending it
         * @description Returns the text a recipient would receive for one registration status: the subject,
         *     the body, the channel that the rules of specification section 10 would pick and the
         *     moment the entry would be scheduled for.
         *
         *     The call has no side effects at all. No notification row is created, no logical_key is
         *     claimed and no deduplication state is touched, no provider is contacted and nothing
         *     reaches the audit log. Calling it twice changes nothing and never suppresses a real
         *     notification that the scheduler is about to create.
         *
         *     The text is rendered in the recipient's own language taken from their profile, not in
         *     the language of the administrator asking: the point of a preview is to show what the
         *     recipient will read.
         *
         *     Pass rule_id to preview a reminder or an overdue notice; the type follows the sign of
         *     the rule offset. Omit it for the primary REGISTRATION_REQUIRED notification, which has
         *     no rule. A status that reconciliation would skip — an unpublished or archived event, an
         *     inactive registration, a participant who is no longer assigned, a status that is not
         *     TODO or a deactivated recipient — has no notification to render and answers 404.
         *
         *     channel_ready=false means the recipient currently has no usable channel. That is not an
         *     error of the preview: it is precisely what the administrator needs to see.
         */
        get: {
            parameters: {
                query?: {
                    /** @description Rule to render */
                    rule_id?: string;
                };
                header?: never;
                path: {
                    /** @description Registration status */
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
                        "application/json": components["schemas"]["models.NotificationPreviewResponse"];
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
                /** @description Forbidden */
                403: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["models.ErrorResponse"];
                    };
                };
                /** @description nothing to render, or a foreign rule */
                404: {
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
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/admin/schedule": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Administrative schedule
         * @description All events with filters by state, participant and date range.
         */
        get: {
            parameters: {
                query?: {
                    /** @description Start of the period, RFC3339 */
                    from?: string;
                    /** @description Include archived records */
                    include_archived?: boolean;
                    /** @description Filter by participant */
                    participant_user_id?: string;
                    /** @description Comma-separated state filter */
                    state?: string;
                    /** @description End of the period, RFC3339 */
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
                        "application/json": components["schemas"]["models.ScheduleResponse"];
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
        /** Delete a stage */
        delete: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    /** @description Stage identifier */
                    id: string;
                };
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description the stage is deleted */
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
        /** Update a stage */
        patch: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    /** @description Stage identifier */
                    id: string;
                };
                cookie?: never;
            };
            /** @description Mutable fields */
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
    "/admin/users": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Search users
         * @description Search by display_name and normalised email to pick participants.
         *     Only minimal fields are returned; credentials and channel data are withheld.
         */
        get: {
            parameters: {
                query?: {
                    /** @description Page number */
                    page?: number;
                    /** @description Page size */
                    page_size?: number;
                    /** @description Search string */
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
         * Irreversible user deletion
         * @description Removes credentials and delivery channels, anonymises the name and email.
         *     Participation references and audit entries are preserved.
         */
        delete: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    /** @description User identifier */
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
         * Reactivate a user
         * @description Restores access. Previously cancelled notifications are not revived.
         */
        post: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    /** @description User identifier */
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
         * Deactivate a user
         * @description Revokes sessions, removes the Telegram link and moves pending notifications to CANCELLED.
         */
        post: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    /** @description User identifier */
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
         * Obtain a CSRF token
         * @description Issues the token in a cookie and in the response body. Every mutating request must send it in the X-CSRF-Token header.
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
         * Confirm an email change
         * @description Promotes pending_email to the primary address. Until confirmation, sign-in uses the previous address.
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
                /** @description address is already taken */
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
         * Sign in with email and password
         * @description Issues a 15-minute access token and a rotating 30-day refresh token in HttpOnly cookies.
         *     Rate limit: 10 attempts per 15 minutes per IP and email pair.
         */
        post: {
            parameters: {
                query?: never;
                header?: never;
                path?: never;
                cookie?: never;
            };
            /** @description Credentials */
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
                /** @description invalid credentials or a deactivated account */
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
         * Sign out of the current session
         * @description Revokes the refresh token of the current session and clears the cookies.
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
         * Sign out of all sessions
         * @description Revokes every active session of the user.
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
         * Request a password reset
         * @description Issues a one-time token valid for 30 minutes. The response does not disclose whether an account exists.
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
         * Set a new password
         * @description After a password change every active session of the user is revoked.
         */
        post: {
            parameters: {
                query?: never;
                header?: never;
                path?: never;
                cookie?: never;
            };
            /** @description Token and new password */
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
         * Refresh the session
         * @description Rotates the refresh token. Reusing a revoked token revokes the entire session chain.
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
         * Register a user
         * @description Creates an account, sends a confirmation email valid for 24 hours and opens a session.
         *     Sign-in is allowed before the address is confirmed; product email notifications are not.
         *     If invite_token is supplied, the invite is accepted in the same transaction.
         */
        post: {
            parameters: {
                query?: never;
                header?: never;
                path?: never;
                cookie?: never;
            };
            /** @description Registration payload */
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
                /** @description email is already taken */
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
         * Confirm an email address
         * @description Consumes a one-time confirmation token valid for 24 hours.
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
                /** @description the token is invalid or has expired */
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
         * Resend the confirmation email
         * @description Rate limit: 5 requests per hour per IP and email pair. The response does not disclose whether an account exists.
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
    "/calendar/{token}/feed.ics": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * The calendar feed itself
         * @description Returns the owner's schedule as an iCalendar document (RFC 5545) with the
         *     media type text/calendar. This is the only unauthenticated endpoint in the
         *     system that returns personal data, and everything about it follows from that
         *     (specification 5.6).
         *
         *     The token in the path is the whole credential: there is no session, no cookie
         *     and no CSRF check, because a calendar client sends none of them. The address is
         *     fetched by Google, Apple or Microsoft servers rather than by the owner's
         *     device, so it cannot be bound to a device or an address range.
         *
         *     The content is exactly what the owner sees in GET /me/schedule: their assigned
         *     published events, the stages of those events and the registration deadline.
         *     No other participant, no administrative field and nothing from the personal
         *     layer appears here — widening the feed would be a privilege escalation through
         *     a channel that has no authentication.
         *
         *     An unknown, malformed or revoked token answers 404, and so does the feed of a
         *     deactivated account. A revoked token and one that never existed are
         *     deliberately indistinguishable: 403 would confirm that the address was once
         *     real. Rate limiting is keyed on the presented token, since there is no account
         *     context until the token has been resolved.
         */
        get: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    /** @description Feed secret */
                    token: string;
                };
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description iCalendar document */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "text/calendar": string;
                    };
                };
                /** @description unknown, revoked or malformed token */
                404: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "text/calendar": components["schemas"]["models.ErrorResponse"];
                    };
                };
                /** @description Too Many Requests */
                429: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "text/calendar": components["schemas"]["models.ErrorResponse"];
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
    "/catalog": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Event catalog
         * @description Every published, non-archived event regardless of participation. The response
         *     carries a dedicated payload that cannot include administrative notes.
         *
         *     The catalog requires a session: an anonymous request is answered with 401. An
         *     unauthenticated listing would enumerate every event of the organisation together
         *     with its organisers and prize pools, and the system is internal. It also carries
         *     its own rate limit, counted per account, because a catalog page is heavier than
         *     other reads: substring search, filters and the stages of the page.
         */
        get: {
            parameters: {
                query?: {
                    /** @description Comma-separated format filter. OFFLINE and HYBRID also match an event whose own format is ONLINE when at least one of its stages is held in person. */
                    format?: "ONLINE" | "OFFLINE" | "HYBRID";
                    /** @description Lower bound of the period */
                    from?: string;
                    /** @description Comma-separated kind filter */
                    kind?: "HACKATHON" | "MEETUP";
                    /** @description Comma-separated origin filter. Omit it for the All view: RU and WORLD cover every event. */
                    origin?: "RU" | "WORLD";
                    /** @description Page number */
                    page?: number;
                    /** @description Page size */
                    page_size?: number;
                    /** @description Search by title and organiser */
                    search?: string;
                    /** @description Comma-separated state filter */
                    state?: "UPCOMING" | "ACTIVE" | "FINISHED";
                    /** @description Upper bound of the period */
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
                        "application/json": components["schemas"]["models.CatalogPage"];
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
                /** @description too many catalog requests */
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
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/events/{id}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Assigned event card
         * @description Participant role, computed state, stages, the nearest stage, registration status,
         *     deadline and link. Administrative notes are withheld from the participant.
         */
        get: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    /** @description Event identifier */
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
                        "application/json": components["schemas"]["models.EventCard"];
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
    "/events/{id}/join": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Join an event
         * @description Self-signup: the user joins a published event and supplies their own team role.
         *     A meetup has no team role, so the field may be omitted; for a hackathon it is
         *     required. A finished event cannot be joined: only an administrator may assign a
         *     participant after the fact.
         */
        post: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    /** @description Event identifier */
                    id: string;
                };
                cookie?: never;
            };
            /** @description Own team role */
            requestBody: {
                content: {
                    "application/json": components["schemas"]["models.JoinEventRequest"];
                };
            };
            responses: {
                /** @description Created */
                201: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["models.ParticipantSelfResponse"];
                    };
                };
                /** @description a hackathon requires a team role */
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
                /** @description Not Found */
                404: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["models.ErrorResponse"];
                    };
                };
                /** @description already a participant, or the event has finished */
                409: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["models.ErrorResponse"];
                    };
                };
                /** @description too many join attempts */
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
    "/events/{id}/links": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Resource links of an event
         * @description Every link attached to the event: rules, chat, submission form, dataset,
         *     judging criteria and the rest. Pinned links come first, then the explicit
         *     sort order.
         *
         *     A link carrying stage_id belongs to that stage and is meant to surface while
         *     the stage runs rather than for the whole event. The system never follows a
         *     link: no title, favicon or availability is fetched from the address, so an
         *     address supplied here can never make the server call out (plan IVa.4).
         *
         *     The scheme is not restricted to HTTPS (specification 5.1): a plain http
         *     address, an internal host or a tg:// address is stored as given. Only schemes
         *     that execute in the browser are rejected. The client marks a non-HTTPS link
         *     but never blocks it.
         */
        get: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    /** @description Event identifier */
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
                        "application/json": components["schemas"]["models.ResourceLinkListResponse"];
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
                /** @description the event is not visible to the caller */
                404: {
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
        put?: never;
        /**
         * Add a resource link
         * @description Attaches a link to the event or, when stage_id is given, to one of its stages.
         *     A stage belonging to another event is rejected: the composite foreign key
         *     (stage_id, event_id) makes the mismatch impossible to store.
         *
         *     The canonical registration address stays in Registration.url because it takes
         *     part in notification content versioning (specification 7); a REGISTRATION link
         *     here only displays that same value.
         */
        post: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    /** @description Event identifier */
                    id: string;
                };
                cookie?: never;
            };
            /** @description Link */
            requestBody: {
                content: {
                    "application/json": components["schemas"]["models.CreateResourceLinkRequest"];
                };
            };
            responses: {
                /** @description Created */
                201: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["models.ResourceLink"];
                    };
                };
                /** @description bad address, executable scheme or a foreign stage */
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
                /** @description only an administrator edits event links */
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
                /** @description the link limit for the event is reached */
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
    "/events/{id}/links/{linkId}": {
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
         * Remove a resource link
         * @description Deletes one link of the event. The action is recorded in the audit log.
         */
        delete: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    /** @description Event identifier */
                    id: string;
                    /** @description Link identifier */
                    linkId: string;
                };
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description the link is removed */
                204: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
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
        options?: never;
        head?: never;
        /**
         * Change a resource link
         * @description Edits one link of the event. Moving a link to a stage of another event is
         *     rejected the same way as on creation.
         */
        patch: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    /** @description Event identifier */
                    id: string;
                    /** @description Link identifier */
                    linkId: string;
                };
                cookie?: never;
            };
            /** @description Fields to change */
            requestBody: {
                content: {
                    "application/json": components["schemas"]["models.UpdateResourceLinkRequest"];
                };
            };
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["models.ResourceLink"];
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
        trace?: never;
    };
    "/events/{id}/registration/done": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Mark registration as completed
         * @description Participant self-report: moves their own TODO status to DONE. Available with an active
         *     registration, an assigned participation and a non-archived event. The system does not verify the external site.
         */
        post: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    /** @description Event identifier */
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
                /** @description invalid state transition */
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
    "/events/{id}/stages": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Event stages
         * @description Available to an assigned participant for a published event, and to an administrator always.
         */
        get: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    /** @description Event identifier */
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
        /** Liveness probe */
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
         * Public invite preview
         * @description Returns the address and expiry of the invite without disclosing any other data.
         */
        get: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    /** @description Invite token */
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
         * Accept an invite
         * @description Creates an account for the invited address and opens a session.
         *     Any other unexpired invites for this address are revoked in the same transaction.
         */
        post: {
            parameters: {
                query?: never;
                header?: never;
                path?: never;
                cookie?: never;
            };
            /** @description Token and account data */
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
        /** Your own profile */
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
         * Update your own profile
         * @description The administrator flag, Telegram chat_id and password are not changed by this endpoint.
         */
        patch: {
            parameters: {
                query?: never;
                header?: never;
                path?: never;
                cookie?: never;
            };
            /** @description Mutable fields */
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
        trace?: never;
    };
    "/me/artifacts/{id}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post?: never;
        /** Delete an own artifact */
        delete: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    /** @description Artifact identifier */
                    id: string;
                };
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description the artifact is deleted */
                204: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
                /** @description Unauthorized */
                401: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "*/*": components["schemas"]["models.ErrorResponse"];
                    };
                };
                /** @description Not Found */
                404: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "*/*": components["schemas"]["models.ErrorResponse"];
                    };
                };
                /** @description Too Many Requests */
                429: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "*/*": components["schemas"]["models.ErrorResponse"];
                    };
                };
            };
        };
        options?: never;
        head?: never;
        /**
         * Update an own artifact
         * @description Changes one artifact of the caller, including the self-reported submitted mark.
         */
        patch: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    /** @description Artifact id */
                    id: string;
                };
                cookie?: never;
            };
            /** @description Fields to change */
            requestBody: {
                content: {
                    "application/json": components["schemas"]["models.UpdateArtifactRequest"];
                };
            };
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["models.ParticipantArtifact"];
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
                /** @description the artifact belongs to another user */
                404: {
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
        trace?: never;
    };
    "/me/bookmarks": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Own bookmarks
         * @description Events the caller saved for later, newest first. The payload matches the catalog
         *     entry, so the same card renders in both places.
         */
        get: {
            parameters: {
                query?: {
                    /** @description Page number */
                    page?: number;
                    /** @description Page size */
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
                        "application/json": components["schemas"]["models.BookmarkListResponse"];
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
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/me/bookmarks/{id}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        /**
         * Bookmark an event
         * @description Marks a catalog event as interesting without joining it. A bookmark is not
         *     participation: it creates no assignment, no registration status and no
         *     notifications, and an administrator does not see it.
         *
         *     Bookmarking twice is not an error — the operation is idempotent.
         */
        put: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    /** @description Event identifier */
                    id: string;
                };
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description the event is bookmarked */
                204: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
                /** @description Unauthorized */
                401: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "*/*": components["schemas"]["models.ErrorResponse"];
                    };
                };
                /** @description the event is not in the catalog */
                404: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "*/*": components["schemas"]["models.ErrorResponse"];
                    };
                };
                /** @description Too Many Requests */
                429: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "*/*": components["schemas"]["models.ErrorResponse"];
                    };
                };
            };
        };
        post?: never;
        /** Remove a bookmark */
        delete: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    /** @description Event identifier */
                    id: string;
                };
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description the bookmark is removed */
                204: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
                /** @description Unauthorized */
                401: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "*/*": components["schemas"]["models.ErrorResponse"];
                    };
                };
                /** @description Not Found */
                404: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "*/*": components["schemas"]["models.ErrorResponse"];
                    };
                };
                /** @description Too Many Requests */
                429: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "*/*": components["schemas"]["models.ErrorResponse"];
                    };
                };
            };
        };
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/me/calendar-feed": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * State of the own calendar feed
         * @description Tells whether a calendar feed is currently issued for the caller and when it
         *     was last fetched by a calendar client.
         *
         *     The address itself is never returned here. The secret exists exactly once, in
         *     the response that issued or rotated it (specification 5.6.1): a feed URL is a
         *     bearer credential, the database keeps only its hash, and an endpoint that
         *     handed it back on demand would turn any read of this resource into a way to
         *     recover it. A lost address is replaced by rotation, not recovered.
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
                        "application/json": components["schemas"]["models.CalendarFeedResponse"];
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
        put?: never;
        /**
         * Issue a calendar feed
         * @description Creates the caller's calendar feed and returns its address once. The address
         *     carries a secret of at least 128 bits; only its hash reaches the database.
         *
         *     One feed per account (specification 5.6.1). When a feed already exists the
         *     call answers 409 rather than silently issuing a second address: rotation is an
         *     explicit operation, so that replacing a feed is never something that happens by
         *     accident to a subscription living in someone's calendar service.
         *
         *     The issue is written to the audit log — it is an account security operation of
         *     the same kind as revoking a session — but neither the secret nor its hash is
         *     recorded there.
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
                /** @description Created */
                201: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["models.CalendarFeedSecretResponse"];
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
                /** @description a feed already exists; rotate it instead */
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
        /**
         * Revoke the calendar feed
         * @description Stops the caller's feed. Idempotent: revoking an absent or already revoked
         *     feed answers 204 as well.
         *
         *     The row is not deleted — it keeps the token hash taken and records that the
         *     address was deliberately revoked rather than lost. After this the address
         *     answers 404, indistinguishable from one that never existed.
         */
        delete: {
            parameters: {
                query?: never;
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description the feed is revoked */
                204: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
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
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/me/calendar-feed/rotate": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Rotate the calendar feed
         * @description Revokes the current address and issues a new one in a single transaction. The
         *     previous address stops working immediately: every calendar already subscribed
         *     to it starts receiving 404 and must be re-subscribed to the new address.
         *
         *     This is the response to a leaked feed URL. Because the address is a bearer
         *     credential stored on third-party servers, there is no narrower remedy: the
         *     holder of a leaked URL cannot be identified or blocked individually.
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
                        "application/json": components["schemas"]["models.CalendarFeedSecretResponse"];
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
    "/me/checklist-templates": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Checklist templates
         * @description The built-in checklist templates. A template is a shared reference list, not a
         *     personal record: applying one creates the caller's own tasks, and editing a
         *     template afterwards does not touch tasks already created.
         *
         *     Titles are dictionary keys, not finished text: the client renders them in the
         *     reader's language.
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
                        "application/json": components["schemas"]["models.TemplateListResponse"];
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
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
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
         * Deactivate your own account
         * @description Revokes sessions, removes the Telegram link and cancels pending notifications.
         *     Reactivation is performed by an administrator.
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
         * Request an email change
         * @description The new address is stored as pending_email and becomes primary only after confirmation.
         */
        post: {
            parameters: {
                query?: never;
                header?: never;
                path?: never;
                cookie?: never;
            };
            /** @description New address and current password */
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
                /** @description address is already taken */
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
    "/me/events": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * My events
         * @description Published events with an assigned participation: UPCOMING, ACTIVE and FINISHED.
         *     Archived records are hidden by default and available through a filter.
         */
        get: {
            parameters: {
                query?: {
                    /** @description Include archived records */
                    include_archived?: boolean;
                    /** @description Page number */
                    page?: number;
                    /** @description Page size */
                    page_size?: number;
                    /** @description Comma-separated state filter */
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
                        "application/json": components["schemas"]["models.MyEventPage"];
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
    "/me/events-feed": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Own event feed
         * @description The system event bus, not the notification queue of specification section 9. A row here
         *     mirrors something that happened; it never competes with Telegram or email for delivery
         *     and never enters the deduplication and retry machinery of a Notification.
         *
         *     The feed returns exactly two audiences: events addressed to the caller personally and,
         *     for an administrator, events addressed to administrators. There is no way to read
         *     somebody else's feed.
         */
        get: {
            parameters: {
                query?: {
                    /** @description Page number, from 1 */
                    page?: number;
                    /** @description Page size */
                    page_size?: number;
                    /** @description Return only entries the caller has not read */
                    unread?: boolean;
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
                        "application/json": components["schemas"]["models.SystemEventPage"];
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
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/me/events-feed/read": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Mark events as read
         * @description Marks the listed events read for the caller. An empty list marks the whole visible feed.
         *     Identifiers outside the caller's audience are ignored rather than reported: the endpoint
         *     must not become a way to probe which events exist.
         */
        post: {
            parameters: {
                query?: never;
                header?: never;
                path?: never;
                cookie?: never;
            };
            /** @description Identifiers to mark, empty for all */
            requestBody: {
                content: {
                    "application/json": components["schemas"]["models.MarkReadRequest"];
                };
            };
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["models.UnreadCountResponse"];
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
    "/me/events-feed/unread-count": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Unread event count
         * @description The number the bell shows. Requested over REST on connect; the socket only sends the
         *     delta afterwards, so the counter is correct even when the socket never opens.
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
                        "application/json": components["schemas"]["models.UnreadCountResponse"];
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
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/me/events/{id}/artifacts": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Own submission artifacts
         * @description What the caller says they submitted for the event: repository, video, slides,
         *     demo stand or submission page.
         *
         *     The submitted mark is the participant's own word, exactly like the registration
         *     status of specification 1: the system never checks an external site, so nothing
         *     here is a verified fact.
         */
        get: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    /** @description Event identifier */
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
                        "application/json": components["schemas"]["models.ArtifactListResponse"];
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
                /** @description Not Found */
                404: {
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
        put?: never;
        /**
         * Add an own artifact
         * @description Records one artifact of the caller for the event. The link is only checked for
         *     being a parseable address; schemes that execute in a browser are rejected.
         */
        post: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    /** @description Event identifier */
                    id: string;
                };
                cookie?: never;
            };
            /** @description Artifact */
            requestBody: {
                content: {
                    "application/json": components["schemas"]["models.CreateArtifactRequest"];
                };
            };
            responses: {
                /** @description Created */
                201: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["models.ParticipantArtifact"];
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
                /** @description Not Found */
                404: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["models.ErrorResponse"];
                    };
                };
                /** @description the artifact limit for this event is reached */
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
    "/me/events/{id}/links": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Own links for an event
         * @description The caller's private links for one event, kept in a table of their own rather
         *     than mixed into the event links. Separate storage keeps the permission check
         *     simple: an event link is administrative, a personal link belongs to whoever
         *     created it, and no query has to tell the two apart at read time.
         *
         *     Nobody else can read these links, an administrator included.
         */
        get: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    /** @description Event identifier */
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
                        "application/json": components["schemas"]["models.ParticipantLinkListResponse"];
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
                /** @description the event is not visible to the caller */
                404: {
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
        put?: never;
        /**
         * Add an own link
         * @description Saves a private link of the caller for one event. The address is validated the
         *     same way as everywhere else: it must parse, and schemes that execute in the
         *     browser are rejected. HTTPS is not required.
         */
        post: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    /** @description Event identifier */
                    id: string;
                };
                cookie?: never;
            };
            /** @description Link */
            requestBody: {
                content: {
                    "application/json": components["schemas"]["models.CreateParticipantLinkRequest"];
                };
            };
            responses: {
                /** @description Created */
                201: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["models.ParticipantLink"];
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
                /** @description Not Found */
                404: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["models.ErrorResponse"];
                    };
                };
                /** @description the personal link limit for the event is reached */
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
    "/me/events/{id}/note": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Own note for an event
         * @description The caller's private Markdown note for one event. A missing note is answered
         *     with an empty body rather than 404, so the editor opens on a blank page.
         *
         *     The server stores and returns the Markdown source and never renders it to HTML;
         *     rendering belongs to the client. Nobody else can read this note, an
         *     administrator included.
         */
        get: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    /** @description Event identifier */
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
                        "application/json": components["schemas"]["models.ParticipantNote"];
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
                /** @description the event is not visible to the caller */
                404: {
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
        /**
         * Save an own note
         * @description Stores the caller's note for the event; the endpoint suits autosave. Saving an
         *     empty body deletes the record instead of keeping a blank one, so a list of
         *     events carrying notes never fills with empty entries.
         */
        put: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    /** @description Event identifier */
                    id: string;
                };
                cookie?: never;
            };
            /** @description Markdown source */
            requestBody: {
                content: {
                    "application/json": components["schemas"]["models.SaveNoteRequest"];
                };
            };
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["models.ParticipantNote"];
                    };
                };
                /** @description the note is too long */
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
                /** @description Not Found */
                404: {
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
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/me/events/{id}/outcome": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Own outcome for an event
         * @description The caller's self-reported result: how it went, and optionally a place, a prize,
         *     a track and a note. The outcome is the participant's own account, not a verified
         *     standing.
         */
        get: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    /** @description Event identifier */
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
                        "application/json": components["schemas"]["models.ParticipantOutcome"];
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
                /** @description no outcome recorded yet */
                404: {
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
        /**
         * Record an own outcome
         * @description Stores the caller's result for the event. The default is PARTICIPATED, and that
         *     is a complete outcome rather than an empty one: most events end without a prize,
         *     and a tracker that can only record wins makes the ordinary case look like a
         *     failure.
         *
         *     A place may accompany only SHORTLISTED, WINNER or PRIZE — "first place" alongside
         *     "took part" would contradict itself.
         */
        put: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    /** @description Event identifier */
                    id: string;
                };
                cookie?: never;
            };
            /** @description Outcome */
            requestBody: {
                content: {
                    "application/json": components["schemas"]["models.SaveOutcomeRequest"];
                };
            };
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["models.ParticipantOutcome"];
                    };
                };
                /** @description a place requires a placing outcome */
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
                /** @description Not Found */
                404: {
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
        post?: never;
        /** Delete an own outcome */
        delete: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    /** @description Event identifier */
                    id: string;
                };
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description the outcome is deleted */
                204: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
                /** @description Unauthorized */
                401: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "*/*": components["schemas"]["models.ErrorResponse"];
                    };
                };
                /** @description Not Found */
                404: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "*/*": components["schemas"]["models.ErrorResponse"];
                    };
                };
                /** @description Too Many Requests */
                429: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "*/*": components["schemas"]["models.ErrorResponse"];
                    };
                };
            };
        };
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/me/events/{id}/retrospective": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Own retrospective for an event
         * @description Three free-text fields the participant fills in after the event: what went well,
         *     what did not, and what to do differently next time. A personal record in every
         *     sense of specification 5.4 — only the owner reads it, an administrator has no
         *     privilege here, and a foreign record answers 404 rather than 403.
         *
         *     An absent retrospective is returned as an empty one rather than a 404: the screen
         *     that offers to write it must not have to distinguish "nothing yet" from an error.
         */
        get: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    /** @description Event identifier */
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
                        "application/json": components["schemas"]["models.ParticipantRetrospective"];
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
                /** @description the event is not visible to the caller */
                404: {
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
        /**
         * Save an own retrospective
         * @description Stores the caller's retrospective for the event. Every field is optional on its
         *     own, but a retrospective whose three fields are all blank is equivalent to an
         *     absent one and deletes the record — the same rule as the note in specification
         *     5.4.3, so that a list of events with retrospectives does not fill with blanks.
         *
         *     The retrospective is a personal record: it never becomes a queued notification
         *     and never reaches the audit log. Its reminder arrives as a system event on the
         *     bus of specification 9.9, two days after the event ends.
         */
        put: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    /** @description Event identifier */
                    id: string;
                };
                cookie?: never;
            };
            /** @description Retrospective */
            requestBody: {
                content: {
                    "application/json": components["schemas"]["models.SaveRetrospectiveRequest"];
                };
            };
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["models.ParticipantRetrospective"];
                    };
                };
                /** @description a field is too long */
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
                /** @description Not Found */
                404: {
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
        post?: never;
        /** Delete an own retrospective */
        delete: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    /** @description Event identifier */
                    id: string;
                };
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description the retrospective is deleted */
                204: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
                /** @description Unauthorized */
                401: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "*/*": components["schemas"]["models.ErrorResponse"];
                    };
                };
                /** @description Not Found */
                404: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "*/*": components["schemas"]["models.ErrorResponse"];
                    };
                };
                /** @description Too Many Requests */
                429: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "*/*": components["schemas"]["models.ErrorResponse"];
                    };
                };
            };
        };
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/me/events/{id}/tasks": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Own tasks for an event
         * @description The personal checklist of the caller for one event. A task belongs to the
         *     person who created it: the listing never shows anyone else's tasks, and an
         *     administrator has no privilege here either (specification 5.4).
         *
         *     Personal records are outside the notification and audit domains: a task never
         *     becomes a queued notification and never reaches the audit log.
         */
        get: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    /** @description Event identifier */
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
                        "application/json": components["schemas"]["models.TaskListResponse"];
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
                /** @description the event is not visible to the caller */
                404: {
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
        put?: never;
        /**
         * Create an own task
         * @description Adds one task to the caller's personal checklist for the event. The optional
         *     stage must belong to the same event.
         */
        post: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    /** @description Event identifier */
                    id: string;
                };
                cookie?: never;
            };
            /** @description Task */
            requestBody: {
                content: {
                    "application/json": components["schemas"]["models.CreateTaskRequest"];
                };
            };
            responses: {
                /** @description Created */
                201: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["models.ParticipantTask"];
                    };
                };
                /** @description the stage belongs to another event */
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
                /** @description Not Found */
                404: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["models.ErrorResponse"];
                    };
                };
                /** @description the task limit for this event is reached */
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
    "/me/events/{id}/tasks/apply-template": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Apply a checklist template
         * @description Creates the caller's tasks from a template in one action. Due dates are counted
         *     from the event start using the offset of each template item, so a negative
         *     offset means "before the start".
         *
         *     A template item whose title already exists among the caller's tasks for this
         *     event is skipped rather than duplicated, and the per-item outcome is reported
         *     line by line, so applying the same template twice changes nothing.
         */
        post: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    /** @description Event identifier */
                    id: string;
                };
                cookie?: never;
            };
            /** @description Template to apply */
            requestBody: {
                content: {
                    "application/json": components["schemas"]["models.ApplyTemplateRequest"];
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
                /** @description Unauthorized */
                401: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["models.ErrorResponse"];
                    };
                };
                /** @description unknown template or invisible event */
                404: {
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
    "/me/history": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Own participation history
         * @description A read model over what the caller already accumulated: the events they were
         *     assigned to, with their team role, their recorded outcome, their artifacts and
         *     the count of their tasks. It owns no tables and shows only the caller's records.
         */
        get: {
            parameters: {
                query?: {
                    /** @description Page number */
                    page?: number;
                    /** @description Page size */
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
                        "application/json": components["schemas"]["models.HistoryResponse"];
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
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/me/links/{id}": {
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
         * Remove an own link
         * @description Deletes one of the caller's private links. Personal records stay outside the
         *     audit log, so the removal is not recorded there.
         */
        delete: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    /** @description Link identifier */
                    id: string;
                };
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description the link is removed */
                204: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
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
                /** @description Not Found */
                404: {
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
        options?: never;
        head?: never;
        /**
         * Change an own link
         * @description Edits one of the caller's private links. Somebody else's link answers 404: its
         *     existence is not disclosed (specification 5.4).
         */
        patch: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    /** @description Link identifier */
                    id: string;
                };
                cookie?: never;
            };
            /** @description Fields to change */
            requestBody: {
                content: {
                    "application/json": components["schemas"]["models.UpdateParticipantLinkRequest"];
                };
            };
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["models.ParticipantLink"];
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
                /** @description Not Found */
                404: {
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
        trace?: never;
    };
    "/me/notifications": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Own notification history
         * @description What the system sent the caller and when: date, type, channel and a short
         *     preview. Read-only and scoped to the caller by recipient — an administrator
         *     reading this endpoint sees their own notifications, not anyone else's.
         *
         *     The preview is a short excerpt, never the whole payload. Specification 4 clears
         *     payload_json after 90 days while the row itself must survive for deduplication,
         *     so an older entry returns no preview and no event title and is marked redacted.
         *     The screen is required to render that state rather than treat it as an error.
         */
        get: {
            parameters: {
                query?: {
                    /** @description Page number */
                    page?: number;
                    /** @description Page size */
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
                        "application/json": components["schemas"]["models.NotificationHistoryResponse"];
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
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/me/schedule": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * User schedule
         * @description Only assigned, published, non-archived events. Each event is a separate row,
         *     stages are returned as intervals and the registration deadline as a separate marker.
         *     registration_status is the participant's own self reported mark, never a fact the
         *     system verified against the external registration site.
         */
        get: {
            parameters: {
                query?: {
                    /** @description Start of the period, RFC3339 */
                    from?: string;
                    /** @description End of the period, RFC3339 */
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
                        "application/json": components["schemas"]["models.ScheduleResponse"];
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
    "/me/sessions": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Own active sessions
         * @description Every active session of the calling account: the device that opened it, the address
         *     it was opened from, when it was opened, when it was last used and when it expires.
         *     One entry carries current=true — the session this very request authenticated with,
         *     determined by the session identifier inside the access token.
         *
         *     Only the caller's own sessions are returned, and only to their owner. The user agent
         *     and the address are personal data of the account holder: no other account reaches them
         *     through this endpoint, an administrator included. Revoked and expired sessions are not
         *     listed — the endpoint shows what is live now, it is not a sign-in history.
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
                        "application/json": components["schemas"]["models.SessionListResponse"];
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
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/me/sessions/{id}": {
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
         * Terminate one own session
         * @description Revokes the refresh token of a single session, leaving the other devices signed in.
         *     Repeating the call on an already revoked or expired session succeeds as well.
         *
         *     The session must belong to the caller. An identifier of somebody else's session is
         *     answered with 404 rather than 403: the very existence of another account's session
         *     must not be disclosed. Terminating the current session is allowed and clears the
         *     cookies of this response, which makes it equivalent to signing out.
         *
         *     The outstanding access token stays valid for the rest of its 15 minutes: revocation
         *     ends the refresh chain, it does not reach a token already issued.
         */
        delete: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    /** @description Session identifier */
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
                /** @description the session does not exist or belongs to another account */
                404: {
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
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/me/shortcuts": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Your own keyboard shortcut overrides
         * @description The map binds an action identifier to a shortcut. An action missing from the map keeps its default.
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
                        "application/json": components["schemas"]["models.ShortcutsResponse"];
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
        /**
         * Replace your own keyboard shortcut overrides
         * @description The whole map is replaced. Two actions may not claim the same shortcut,
         *     and shortcuts owned by the browser or the operating system are refused.
         */
        put: {
            parameters: {
                query?: never;
                header?: never;
                path?: never;
                cookie?: never;
            };
            /** @description Action to shortcut map */
            requestBody: {
                content: {
                    "application/json": components["schemas"]["models.UpdateShortcutsRequest"];
                };
            };
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["models.ShortcutsResponse"];
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
                /** @description the shortcut is taken or reserved */
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
        post?: never;
        /** Reset every keyboard shortcut to its default */
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
                        "application/json": components["schemas"]["models.ShortcutsResponse"];
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
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/me/tasks/{id}": {
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
         * Delete an own task
         * @description Removes one task of the caller. Personal records may be deleted outright:
         *     unlike the administrative layer, they carry no retention obligation.
         */
        delete: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    /** @description Task identifier */
                    id: string;
                };
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description the task is deleted */
                204: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
                /** @description Unauthorized */
                401: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "*/*": components["schemas"]["models.ErrorResponse"];
                    };
                };
                /** @description Not Found */
                404: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "*/*": components["schemas"]["models.ErrorResponse"];
                    };
                };
                /** @description Too Many Requests */
                429: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "*/*": components["schemas"]["models.ErrorResponse"];
                    };
                };
            };
        };
        options?: never;
        head?: never;
        /**
         * Update an own task
         * @description Changes one task of the caller. Marking a task done and undone are both plain
         *     updates: the transition is reversible and produces neither a notification nor
         *     an audit entry. A task of another user answers 404, never 403.
         */
        patch: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    /** @description Task identifier */
                    id: string;
                };
                cookie?: never;
            };
            /** @description Fields to change */
            requestBody: {
                content: {
                    "application/json": components["schemas"]["models.UpdateTaskRequest"];
                };
            };
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["models.ParticipantTask"];
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
                /** @description the task belongs to another user */
                404: {
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
        /** Unlink Telegram */
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
         * Telegram link URL
         * @description Returns a one-time deep link bound to the current user.
         *     The chat identifier is set only by this flow.
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
    "/metrics": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Prometheus metrics
         * @description Protected endpoint. Requires an Authorization header with the METRICS_TOKEN bearer token,
         *     when the token is set by configuration.
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
                /** @description metrics in Prometheus format */
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
    "/ops/queue": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Queue diagnostics
         * @description The rows an operator needs to tell a stuck queue apart from a busy one. The heartbeat
         *     answers whether something is broken; this answers what exactly.
         *
         *     scope=failures lists terminal failures — FAILED after the four provider calls of
         *     specification section 9.4.8 are spent, and UNDELIVERABLE when no channel was available
         *     or every channel closed with a permanent error — each with the reason recorded in
         *     last_error, the attempt count and the channels already tried.
         *
         *     scope=stuck-leases lists entries left in PROCESSING whose worker lease expired. That is
         *     the same set the recovery task of section 9.4.9 returns to the queue; this endpoint only
         *     reports it and recovers nothing. lease_overdue_seconds says how long the lease has been
         *     overdue, which separates a worker that died from one that is merely slow.
         *
         *     The rows carry no payload_json, no recipient and no registration status: an operations
         *     screen is not a way to read other people's notifications or assignments.
         */
        get: {
            parameters: {
                query?: {
                    /** @description Page number, from 1 */
                    page?: number;
                    /** @description Page size */
                    page_size?: number;
                    /** @description Rows to return */
                    scope?: "failures" | "stuck-leases";
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
                        "application/json": components["schemas"]["models.QueueEntryPage"];
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
                /** @description Forbidden */
                403: {
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
         * Background process status
         * @description Last run times of the scheduler and worker, queue lengths by status
         *     and the age of the oldest pending entry.
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
                        "application/json": components["schemas"]["models.WorkerHeartbeatResponse"];
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
         * Readiness probe
         * @description Checks that the database is reachable.
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
    "/realtime": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Realtime channel
         * @description WebSocket upgrade. The socket is read-only: it carries cache invalidation addresses and
         *     event-bus entries, never domain payloads. Data still arrives over the ordinary authorized
         *     REST endpoints, so the socket cannot reveal anything a GET would refuse.
         *
         *     The handshake carries no CSRF header — a WebSocket handshake cannot set one — so Origin is
         *     checked explicitly and a mismatch is refused with 403. SameSite=Lax does not cover a
         *     WebSocket upgrade: without this check any site a signed-in user visits could open a socket
         *     as them.
         *
         *     The connection is bound to the session rather than to the 15-minute access token, and is
         *     closed when the session is revoked, the user signs out or the account is deactivated.
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
                /** @description switching protocols */
                101: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "*/*": string;
                    };
                };
                /** @description Unauthorized */
                401: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "*/*": components["schemas"]["models.ErrorResponse"];
                    };
                };
                /** @description Forbidden */
                403: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "*/*": components["schemas"]["models.ErrorResponse"];
                    };
                };
                /** @description Too Many Requests */
                429: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "*/*": components["schemas"]["models.ErrorResponse"];
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
            /** @example John Smith */
            display_name?: string;
            /** @example correct-horse-battery */
            password?: string;
            /** @example abc123 */
            token?: string;
        };
        "models.AddParticipantItem": {
            /** @example Developer */
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
        "models.ApplyTemplateRequest": {
            /** @example preparation */
            template_id?: string;
        };
        /** @enum {string} */
        "models.ArtifactKind": "REPOSITORY" | "VIDEO" | "SLIDES" | "DEMO" | "SUBMISSION" | "OTHER";
        "models.ArtifactListResponse": {
            items: components["schemas"]["models.ParticipantArtifact"][];
        };
        /** @enum {string} */
        "models.AuditAction": "USER_REGISTER" | "USER_DEACTIVATE" | "USER_ACTIVATE" | "USER_DELETE" | "USER_PROFILE_CHANGE" | "USER_ADMIN_FLAG_CHANGE" | "INVITE_CREATE" | "INVITE_REVOKE" | "INVITE_ACCEPT" | "EVENT_CREATE" | "EVENT_UPDATE" | "EVENT_PUBLISH" | "EVENT_ARCHIVE" | "STAGE_CREATE" | "STAGE_UPDATE" | "STAGE_DELETE" | "PARTICIPANT_ADD" | "PARTICIPANT_REMOVE" | "PARTICIPANT_REACTIVATE" | "TEAM_ROLE_CHANGE" | "REGISTRATION_CHANGE" | "STATUS_CHANGE" | "RULE_CHANGE" | "RESOURCE_LINK_CREATE" | "RESOURCE_LINK_UPDATE" | "RESOURCE_LINK_DELETE" | "CALENDAR_FEED_ISSUE" | "CALENDAR_FEED_REVOKE";
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
            entity_id?: string;
            entity_type: components["schemas"]["models.EntityType"];
            id: string;
            request_id?: string;
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
            /** @example the participant is already assigned */
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
        "models.BookmarkListResponse": {
            items: components["schemas"]["models.CatalogEvent"][];
            meta: components["schemas"]["models.PageMeta"];
        };
        "models.CalendarFeedResponse": {
            /** Format: date-time */
            created_at: string;
            /** @example true */
            enabled: boolean;
            /** Format: date-time */
            last_used_at: string;
        };
        "models.CalendarFeedSecretResponse": {
            /** Format: date-time */
            created_at: string;
            /** @example https://timeline.example.com/api/v1/calendar/9Qk3.../feed.ics */
            url: string;
        };
        "models.CatalogEvent": {
            /** @example Moscow */
            city?: string;
            /** @example RU */
            country_code?: string;
            description?: string;
            effective_format: components["schemas"]["models.EventFormat"];
            /** Format: date-time */
            end_at: string;
            format: components["schemas"]["models.EventFormat"];
            id: string;
            /** @example false */
            joined: boolean;
            kind: components["schemas"]["models.EventKind"];
            offline_stages: components["schemas"]["models.CatalogPlace"][];
            /** @example Organising committee */
            organizer?: string;
            origin: components["schemas"]["models.EventOrigin"];
            /** @example RUB */
            prize_currency?: string;
            /** @example 500000.00 */
            prize_pool?: string;
            /** Format: date-time */
            start_at: string;
            state: components["schemas"]["models.EventState"];
            /** @example 5 */
            team_size_max?: number;
            /** @example National event */
            title: string;
            /** @example Smart city */
            track?: string;
            /** @example https://example.com */
            website_url?: string;
        };
        "models.CatalogPage": {
            items: components["schemas"]["models.CatalogEvent"][];
            meta: components["schemas"]["models.PageMeta"];
        };
        "models.CatalogPlace": {
            /** Format: date-time */
            end_at: string;
            id: string;
            /** @example Final */
            name: string;
            place: components["schemas"]["models.Place"];
            /** Format: date-time */
            start_at: string;
            type: components["schemas"]["models.StageType"];
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
        "models.ChecklistTemplate": {
            /** @example preparation */
            id: string;
            items: components["schemas"]["models.ChecklistTemplateItem"][];
        };
        "models.ChecklistTemplateItem": {
            /** @example -10080 */
            due_offset_minutes: number;
            /** @example 1 */
            slot_no: number;
            /** @example task.read_rules */
            title_key: string;
        };
        "models.CopyParticipantsRequest": {
            overrides?: components["schemas"]["models.CopyRoleOverride"][];
            source_event_id?: string;
        };
        "models.CopyRoleOverride": {
            /** @example Mentor */
            team_role: string;
            user_id: string;
        };
        "models.CreateArtifactRequest": {
            kind?: components["schemas"]["models.ArtifactKind"];
            /** @example 0 */
            sort_order?: number;
            /** @example Project repository */
            title?: string;
            /** @example https://github.com/example/project */
            url?: string;
        };
        "models.CreateEventRequest": {
            /** @example Moscow */
            city?: string;
            /** @example RU */
            country_code?: string;
            description?: string;
            /** Format: date-time */
            end_at?: string;
            format?: components["schemas"]["models.EventFormat"];
            kind?: components["schemas"]["models.EventKind"];
            notes?: string;
            organizer?: string;
            origin?: components["schemas"]["models.EventOrigin"];
            /** @example RUB */
            prize_currency?: string;
            /** @example 500000.00 */
            prize_pool?: string;
            /** Format: date-time */
            start_at?: string;
            /** @example 5 */
            team_size_max?: number;
            /** @example National event */
            title?: string;
            /** @example Smart city */
            track?: string;
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
        "models.CreateParticipantLinkRequest": {
            /** @example OTHER */
            kind?: string;
            /** @example 0 */
            sort_order?: number;
            /** @example My scratch notes */
            title?: string;
            /** @example https://example.org/my-notes */
            url?: string;
        };
        "models.CreateRegistrationRequest": {
            /** Format: date-time */
            deadline_at?: string;
            description?: string;
            /** @example https://example.com/register */
            url?: string;
        };
        "models.CreateResourceLinkRequest": {
            /** @example false */
            is_pinned?: boolean;
            /** @example RULES */
            kind?: string;
            /** @example 0 */
            sort_order?: number;
            stage_id?: string;
            /** @example Rules and code of conduct */
            title?: string;
            /** @example https://example.org/rules */
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
            /** @example Kazan */
            city?: string;
            /** @example RU */
            country_code?: string;
            description?: string;
            /** Format: date-time */
            end_at?: string;
            format?: components["schemas"]["models.EventFormat"];
            /** @example Call for applications */
            name?: string;
            /** @example https://example.com/stream */
            online_url?: string;
            sort_order?: number;
            /** Format: date-time */
            start_at?: string;
            type?: components["schemas"]["models.StageType"];
            url?: string;
            /** @example IT Park */
            venue?: string;
        };
        "models.CreateTaskRequest": {
            /** Format: date-time */
            due_at?: string;
            notes?: string;
            /** @example 0 */
            sort_order?: number;
            stage_id?: string;
            /** @example Record the demo video */
            title?: string;
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
            event_id: string;
            event_title: string;
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
        "models.EntityType": "USER" | "INVITE" | "EVENT" | "STAGE" | "EVENT_PARTICIPANT" | "REGISTRATION" | "REGISTRATION_STATUS" | "NOTIFICATION_RULE" | "RESOURCE_LINK" | "CALENDAR_FEED";
        "models.ErrorBody": {
            /** @example validation_failed */
            code: string;
            fields?: components["schemas"]["models.FieldError"][];
            /** @example invalid request data */
            message: string;
            /** @example 01HZY0Q2K7 */
            request_id: string;
        };
        "models.ErrorResponse": {
            error: components["schemas"]["models.ErrorBody"];
        };
        "models.EventCard": {
            /** @example true */
            can_mark_done: boolean;
            event: components["schemas"]["models.EventResponse"];
            next_stage?: components["schemas"]["models.StageShort"];
            registration?: components["schemas"]["models.RegistrationPublic"];
            registration_status?: components["schemas"]["models.RegistrationStatusShort"];
            stages: components["schemas"]["models.StageResponse"][];
            /** @example Developer */
            team_role?: string;
        };
        /** @enum {string} */
        "models.EventFormat": "ONLINE" | "OFFLINE" | "HYBRID";
        /** @enum {string} */
        "models.EventKind": "HACKATHON" | "MEETUP";
        /** @enum {string} */
        "models.EventOrigin": "RU" | "WORLD";
        "models.EventPage": {
            items: components["schemas"]["models.EventResponse"][];
            meta: components["schemas"]["models.PageMeta"];
        };
        "models.EventResponse": {
            /** Format: date-time */
            archived_at?: string;
            /** @example Moscow */
            city?: string;
            /** @example RU */
            country_code?: string;
            /** Format: date-time */
            created_at: string;
            description?: string;
            effective_format: components["schemas"]["models.EventFormat"];
            /** Format: date-time */
            end_at: string;
            format: components["schemas"]["models.EventFormat"];
            id: string;
            kind: components["schemas"]["models.EventKind"];
            notes?: string;
            /** @example Organising committee */
            organizer?: string;
            origin: components["schemas"]["models.EventOrigin"];
            /** @example RUB */
            prize_currency?: string;
            /** @example 500000.00 */
            prize_pool?: string;
            /** Format: date-time */
            published_at?: string;
            /** Format: date-time */
            start_at: string;
            state: components["schemas"]["models.EventState"];
            /** @example 5 */
            team_size_max?: number;
            /** @example National event */
            title: string;
            /** @example Smart city */
            track?: string;
            /** Format: date-time */
            updated_at: string;
            /** @example https://example.com */
            website_url?: string;
        };
        /** @enum {string} */
        "models.EventState": "UNPUBLISHED" | "UPCOMING" | "ACTIVE" | "FINISHED" | "ARCHIVED";
        "models.FieldError": {
            /** @example email */
            field: string;
            /** @example invalid address */
            message: string;
        };
        "models.HealthResponse": {
            /** @example ok */
            status: string;
            /** Format: date-time */
            time: string;
        };
        "models.HistoryItem": {
            artifacts: components["schemas"]["models.ParticipantArtifact"][];
            /** Format: date-time */
            end_at: string;
            event_id: string;
            /** @example true */
            joined: boolean;
            kind: components["schemas"]["models.EventKind"];
            outcome: components["schemas"]["models.ParticipantOutcome"];
            /** Format: date-time */
            start_at: string;
            /** @example 9 */
            tasks_done: number;
            /** @example 12 */
            tasks_total: number;
            /** @example Backend developer */
            team_role: string;
            /** @example National event */
            title: string;
        };
        "models.HistoryResponse": {
            items: components["schemas"]["models.HistoryItem"][];
            meta: components["schemas"]["models.PageMeta"];
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
        "models.JoinEventRequest": {
            /** @example Backend developer */
            team_role?: string;
        };
        /** @enum {string} */
        "models.LinkKind": "WEBSITE" | "RULES" | "REGISTRATION" | "SUBMISSION" | "CHAT" | "DATASET" | "API_DOCS" | "JUDGING" | "MENTORS" | "RESULTS" | "SPONSOR" | "OTHER";
        "models.LoginRequest": {
            /** @example ivan@example.com */
            email?: string;
            /** @example correct-horse-battery */
            password?: string;
        };
        "models.MarkReadRequest": {
            ids?: string[];
        };
        "models.MeResponse": {
            /** @example https://example.com/a.png */
            avatar_url?: string;
            /** @example Backend developer */
            bio?: string;
            /** Format: date-time */
            created_at: string;
            /** @example John Smith */
            display_name: string;
            /** @example ivan@example.com */
            email: string;
            /** @example true */
            email_verified: boolean;
            /** @example https://github.com/ivan */
            github_url?: string;
            id: string;
            /** @example true */
            is_active: boolean;
            /** @example false */
            is_admin: boolean;
            /**
             * @example ru
             * @enum {string}
             */
            locale: "ru" | "en";
            pending_email?: string;
            preferred_channel?: components["schemas"]["models.Channel"];
            shortcuts: components["schemas"]["models.Shortcuts"];
            /** @example false */
            telegram_linked: boolean;
            telegram_username?: string;
            /** @example Europe/Moscow */
            timezone: string;
            /** Format: date-time */
            updated_at: string;
            /** @example https://ivan.example.com */
            website_url?: string;
        };
        "models.MessageResponse": {
            /** @example operation completed */
            message: string;
        };
        "models.MyEventItem": {
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
            state: components["schemas"]["models.EventState"];
            /** @example Developer */
            team_role: string;
            /** @example National event */
            title: string;
        };
        "models.MyEventPage": {
            items: components["schemas"]["models.MyEventItem"][];
            meta: components["schemas"]["models.PageMeta"];
        };
        "models.NotificationHistoryItem": {
            channel: components["schemas"]["models.Channel"];
            /** Format: date-time */
            created_at: string;
            /** @example Demo Day */
            event_title: string;
            id: string;
            /** @example The registration deadline is approaching */
            preview: string;
            /** @example false */
            redacted: boolean;
            /** Format: date-time */
            scheduled_at: string;
            /** Format: date-time */
            sent_at: string;
            status: components["schemas"]["models.NotificationStatus"];
            type: components["schemas"]["models.NotificationType"];
        };
        "models.NotificationHistoryResponse": {
            items: components["schemas"]["models.NotificationHistoryItem"][];
            meta: components["schemas"]["models.PageMeta"];
        };
        "models.NotificationPreviewResponse": {
            body: string;
            channel: components["schemas"]["models.Channel"];
            /** @example true */
            channel_ready: boolean;
            /** @example 14.09.2026 18:00 */
            deadline_local: string;
            deadline_utc: string;
            /** @example Autumn hackathon */
            event_title: string;
            /** @example ru */
            language: string;
            /** @example https://example.com/register */
            registration_url: string;
            rule_id: string;
            /** Format: date-time */
            scheduled_at: string;
            /** @example Timeline: register for the event */
            subject: string;
            /** @example Europe/Moscow */
            timezone_id: string;
            type: components["schemas"]["models.NotificationType"];
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
        "models.NotificationStatus": "PENDING" | "PROCESSING" | "SENT" | "FAILED" | "CANCELLED" | "UNDELIVERABLE";
        /** @enum {string} */
        "models.NotificationType": "REGISTRATION_REQUIRED" | "REGISTRATION_REMINDER" | "REGISTRATION_OVERDUE";
        /** @enum {string} */
        "models.Outcome": "PARTICIPATED" | "SHORTLISTED" | "WINNER" | "PRIZE";
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
        "models.ParticipantArtifact": {
            /** Format: date-time */
            created_at: string;
            event_id: string;
            id: string;
            kind: components["schemas"]["models.ArtifactKind"];
            /** @example 0 */
            sort_order: number;
            /** Format: date-time */
            submitted_at: string;
            /** @example Project repository */
            title: string;
            /** Format: date-time */
            updated_at: string;
            /** @example https://github.com/example/project */
            url: string;
        };
        "models.ParticipantLink": {
            /** Format: date-time */
            created_at: string;
            event_id: string;
            id: string;
            kind: components["schemas"]["models.LinkKind"];
            /** @example 0 */
            sort_order: number;
            /** @example My scratch notes */
            title: string;
            /** Format: date-time */
            updated_at: string;
            /** @example https://example.org/my-notes */
            url: string;
        };
        "models.ParticipantLinkListResponse": {
            items: components["schemas"]["models.ParticipantLink"][];
        };
        "models.ParticipantNote": {
            /** @example Draft notes in Markdown */
            body: string;
            event_id: string;
            /** Format: date-time */
            updated_at: string;
        };
        "models.ParticipantOutcome": {
            /** Format: date-time */
            created_at: string;
            event_id: string;
            note: string;
            outcome: components["schemas"]["models.Outcome"];
            /** @example 2 */
            place: number;
            /** @example Jury award */
            prize: string;
            /** @example Smart city */
            track: string;
            /** Format: date-time */
            updated_at: string;
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
            event_id: string;
            id: string;
            participation_status: components["schemas"]["models.ParticipationStatus"];
            registration_status?: components["schemas"]["models.RegistrationStatusShort"];
            /** Format: date-time */
            removed_at?: string;
            /** @example Developer */
            team_role: string;
            user: components["schemas"]["models.UserSummary"];
        };
        "models.ParticipantRetrospective": {
            /** Format: date-time */
            created_at: string;
            event_id: string;
            next_time: string;
            /** Format: date-time */
            updated_at: string;
            went_badly: string;
            went_well: string;
        };
        "models.ParticipantSelfResponse": {
            /** Format: date-time */
            assigned_at: string;
            event_id: string;
            id: string;
            participation_status: components["schemas"]["models.ParticipationStatus"];
            /** @example Backend developer */
            team_role: string;
        };
        "models.ParticipantTask": {
            /** Format: date-time */
            created_at: string;
            /** Format: date-time */
            done_at: string;
            /** Format: date-time */
            due_at: string;
            event_id: string;
            id: string;
            notes: string;
            /** @example 0 */
            sort_order: number;
            stage_id: string;
            /** @example Record the demo video */
            title: string;
            /** Format: date-time */
            updated_at: string;
        };
        /** @enum {string} */
        "models.ParticipationStatus": "ASSIGNED" | "REMOVED";
        "models.Place": {
            /** @example Kazan */
            city?: string;
            /** @example RU */
            country_code?: string;
            format: components["schemas"]["models.EventFormat"];
            /** @example true */
            inherited: boolean;
            /** @example https://example.com/stream */
            online_url?: string;
            /** @example IT Park */
            venue?: string;
        };
        "models.PreviewResponse": {
            /** @example 12 */
            affected: number;
            /** @example 3 */
            skipped: number;
        };
        "models.QueueEntryPage": {
            items: components["schemas"]["models.QueueEntryResponse"][];
            meta: components["schemas"]["models.PageMeta"];
        };
        "models.QueueEntryResponse": {
            actual_channel: components["schemas"]["models.Channel"];
            /** @example 4 */
            attempt_count: number;
            /** Format: date-time */
            created_at: string;
            failed_channels: components["schemas"]["models.Channel"][];
            id: string;
            /** @example permanent provider error */
            last_error: string;
            /** Format: date-time */
            lease_expires_at: string;
            /** @example 93.4 */
            lease_overdue_seconds: number;
            notification_type: components["schemas"]["models.NotificationType"];
            requested_channel: components["schemas"]["models.Channel"];
            /** Format: date-time */
            scheduled_at: string;
            status: components["schemas"]["models.NotificationStatus"];
            /** Format: date-time */
            updated_at: string;
        };
        "models.ReadyResponse": {
            /** @example ok */
            database: string;
            /** @example ready */
            status: string;
        };
        "models.RegisterRequest": {
            /** @example John Smith */
            display_name?: string;
            /** @example ivan@example.com */
            email?: string;
            invite_token?: string;
            /** @example correct-horse-battery */
            password?: string;
        };
        "models.RegistrationCoverage": {
            /** @example true */
            applicable: boolean;
            /** @example 4 */
            events_covered: number;
            /** @example 1 */
            not_required: number;
            /** @example 2 */
            outstanding: number;
            /** @example 9 */
            self_reported_done: number;
            /** @example 0.75 */
            share?: number;
            /** @example 12 */
            total: number;
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
            event_id: string;
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
            event_id: string;
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
        "models.ResourceLink": {
            /** Format: date-time */
            created_at: string;
            event_id: string;
            id: string;
            /** @example false */
            is_pinned: boolean;
            kind: components["schemas"]["models.LinkKind"];
            /** @example 0 */
            sort_order: number;
            stage_id: string;
            /** @example Rules and code of conduct */
            title: string;
            /** Format: date-time */
            updated_at: string;
            /** @example https://example.org/rules */
            url: string;
        };
        "models.ResourceLinkListResponse": {
            items: components["schemas"]["models.ResourceLink"][];
        };
        "models.SaveNoteRequest": {
            /** @example Draft notes in Markdown */
            body?: string;
        };
        "models.SaveOutcomeRequest": {
            note?: string;
            outcome?: components["schemas"]["models.Outcome"];
            /** @example 2 */
            place?: number;
            /** @example Jury award */
            prize?: string;
            /** @example Smart city */
            track?: string;
        };
        "models.SaveRetrospectiveRequest": {
            next_time?: string;
            went_badly?: string;
            went_well?: string;
        };
        "models.ScheduleItem": {
            /** Format: date-time */
            end_at: string;
            id: string;
            /** @example Call for applications */
            name: string;
            place: components["schemas"]["models.Place"];
            /** Format: date-time */
            start_at: string;
            type: components["schemas"]["models.StageType"];
        };
        "models.ScheduleResponse": {
            range: components["schemas"]["models.TimeRange"];
            rows: components["schemas"]["models.ScheduleRow"][];
        };
        "models.ScheduleRow": {
            effective_format: components["schemas"]["models.EventFormat"];
            /** Format: date-time */
            end_at: string;
            event_id: string;
            /** Format: date-time */
            registration_deadline?: string;
            registration_status?: components["schemas"]["models.RegistrationStatusShort"];
            stages: components["schemas"]["models.ScheduleItem"][];
            /** Format: date-time */
            start_at: string;
            state: components["schemas"]["models.EventState"];
            team_role?: string;
            /** @example National event */
            title: string;
        };
        "models.SessionListResponse": {
            items: components["schemas"]["models.SessionResponse"][];
        };
        "models.SessionResponse": {
            /** Format: date-time */
            created_at: string;
            /** @example true */
            current: boolean;
            /** Format: date-time */
            expires_at: string;
            id: string;
            /** @example 203.0.113.7 */
            ip: string;
            /** Format: date-time */
            last_used_at: string;
            /** @example Mozilla/5.0 (X11; Linux x86_64) */
            user_agent: string;
        };
        "models.Shortcuts": {
            [key: string]: string;
        };
        "models.ShortcutsResponse": {
            shortcuts: components["schemas"]["models.Shortcuts"];
        };
        "models.StageResponse": {
            /** @example Kazan */
            city?: string;
            /** @example RU */
            country_code?: string;
            /** Format: date-time */
            created_at: string;
            description?: string;
            /** Format: date-time */
            end_at: string;
            event_id: string;
            format?: components["schemas"]["models.EventFormat"];
            id: string;
            /** @example Call for applications */
            name: string;
            /** @example https://example.com/stream */
            online_url?: string;
            place: components["schemas"]["models.Place"];
            /** @example 0 */
            sort_order: number;
            /** Format: date-time */
            start_at: string;
            type: components["schemas"]["models.StageType"];
            /** Format: date-time */
            updated_at: string;
            /** @example https://example.com/stage */
            url?: string;
            /** @example IT Park */
            venue?: string;
        };
        "models.StageShort": {
            /** Format: date-time */
            end_at: string;
            id: string;
            /** @example Call for applications */
            name: string;
            /** Format: date-time */
            start_at: string;
            type: components["schemas"]["models.StageType"];
        };
        /** @enum {string} */
        "models.StageType": "REGISTRATION" | "SELECTION" | "PARTICIPATION" | "CHECKPOINT" | "SUBMISSION" | "DEMO" | "RESULTS" | "OTHER";
        "models.SystemEventPage": {
            items: components["schemas"]["models.SystemEventResponse"][];
            meta: components["schemas"]["models.PageMeta"];
        };
        "models.SystemEventResponse": {
            /** Format: date-time */
            created_at: string;
            id: string;
            payload: {
                [key: string]: unknown;
            };
            /** @example false */
            read: boolean;
            /**
             * @example WARNING
             * @enum {string}
             */
            severity: "INFO" | "WARNING" | "CRITICAL";
            subject_id: string;
            /** @example notification */
            subject_type: string;
            /** @example NOTIFICATION_FAILED */
            type: string;
        };
        "models.TaskListResponse": {
            items: components["schemas"]["models.ParticipantTask"][];
        };
        "models.TelegramLinkResponse": {
            /** @example https://t.me/timeline_bot?start=abc123 */
            deep_link: string;
            /** Format: date-time */
            expires_at: string;
        };
        "models.TemplateListResponse": {
            items: components["schemas"]["models.ChecklistTemplate"][];
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
        "models.UnreadCountResponse": {
            /** @example 3 */
            unread: number;
        };
        "models.UpdateArtifactRequest": {
            /** @example false */
            clear_title?: boolean;
            kind?: components["schemas"]["models.ArtifactKind"];
            /** @example 0 */
            sort_order?: number;
            /** @example true */
            submitted?: boolean;
            /** @example Project repository */
            title?: string;
            /** @example https://github.com/example/project */
            url?: string;
        };
        "models.UpdateEventRequest": {
            /** @example Moscow */
            city?: string;
            /** @example RU */
            country_code?: string;
            description?: string;
            /** Format: date-time */
            end_at?: string;
            format?: components["schemas"]["models.EventFormat"];
            kind?: components["schemas"]["models.EventKind"];
            notes?: string;
            organizer?: string;
            origin?: components["schemas"]["models.EventOrigin"];
            /** @example RUB */
            prize_currency?: string;
            /** @example 500000.00 */
            prize_pool?: string;
            /** Format: date-time */
            start_at?: string;
            /** @example 5 */
            team_size_max?: number;
            title?: string;
            /** @example Smart city */
            track?: string;
            website_url?: string;
        };
        "models.UpdateParticipantLinkRequest": {
            /** @example false */
            clear_title?: boolean;
            /** @example OTHER */
            kind?: string;
            /** @example 0 */
            sort_order?: number;
            /** @example My scratch notes */
            title?: string;
            /** @example https://example.org/my-notes */
            url?: string;
        };
        "models.UpdateProfileRequest": {
            /** @example https://example.com/a.png */
            avatar_url?: string;
            /** @example Backend developer */
            bio?: string;
            /** @example John Smith */
            display_name?: string;
            /** @example https://github.com/ivan */
            github_url?: string;
            /**
             * @example en
             * @enum {string}
             */
            locale?: "ru" | "en";
            /** @enum {string} */
            preferred_channel?: "TELEGRAM" | "EMAIL";
            /** @example @ivan */
            telegram_username?: string;
            /** @example Asia/Tokyo */
            timezone?: string;
            /** @example https://ivan.example.com */
            website_url?: string;
        };
        "models.UpdateRegistrationRequest": {
            /** Format: date-time */
            deadline_at?: string;
            description?: string;
            url?: string;
        };
        "models.UpdateResourceLinkRequest": {
            /** @example false */
            clear_stage?: boolean;
            /** @example false */
            clear_title?: boolean;
            /** @example true */
            is_pinned?: boolean;
            /** @example RULES */
            kind?: string;
            /** @example 0 */
            sort_order?: number;
            stage_id?: string;
            /** @example Rules and code of conduct */
            title?: string;
            /** @example https://example.org/rules */
            url?: string;
        };
        "models.UpdateRuleRequest": {
            /** @enum {string} */
            channel_override?: "TELEGRAM" | "EMAIL";
            enabled?: boolean;
            offset_minutes?: number;
        };
        "models.UpdateShortcutsRequest": {
            shortcuts?: components["schemas"]["models.Shortcuts"];
        };
        "models.UpdateStageRequest": {
            /** @example Kazan */
            city?: string;
            /** @example false */
            clear_format?: boolean;
            /** @example RU */
            country_code?: string;
            description?: string;
            /** Format: date-time */
            end_at?: string;
            format?: components["schemas"]["models.EventFormat"];
            name?: string;
            /** @example https://example.com/stream */
            online_url?: string;
            sort_order?: number;
            /** Format: date-time */
            start_at?: string;
            type?: components["schemas"]["models.StageType"];
            url?: string;
            /** @example IT Park */
            venue?: string;
        };
        "models.UpdateTaskRequest": {
            /** @example false */
            clear_due_at?: boolean;
            /** @example false */
            clear_stage?: boolean;
            /** @example true */
            done?: boolean;
            /** Format: date-time */
            due_at?: string;
            notes?: string;
            /** @example 0 */
            sort_order?: number;
            stage_id?: string;
            /** @example Record the demo video */
            title?: string;
        };
        "models.UpdateTeamRoleRequest": {
            /** @example Captain */
            team_role?: string;
        };
        "models.UserPage": {
            items: components["schemas"]["models.UserSummary"][];
            meta: components["schemas"]["models.PageMeta"];
        };
        "models.UserSummary": {
            /** @example John Smith */
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
        /** @description Participants and target status */
        "models.BatchSetStatusRequest": {
            content: {
                "application/json": components["schemas"]["models.BatchSetStatusRequest"];
            };
        };
        /** @description Email address */
        "models.EmailRequest": {
            content: {
                "application/json": components["schemas"]["models.EmailRequest"];
            };
        };
        /** @description Confirmation token */
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
