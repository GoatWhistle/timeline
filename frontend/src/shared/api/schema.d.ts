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
        /** @enum {string} */
        "models.AuditAction": "USER_REGISTER" | "USER_DEACTIVATE" | "USER_ACTIVATE" | "USER_DELETE" | "USER_PROFILE_CHANGE" | "USER_ADMIN_FLAG_CHANGE" | "INVITE_CREATE" | "INVITE_REVOKE" | "INVITE_ACCEPT" | "EVENT_CREATE" | "EVENT_UPDATE" | "EVENT_PUBLISH" | "EVENT_ARCHIVE" | "STAGE_CREATE" | "STAGE_UPDATE" | "STAGE_DELETE" | "PARTICIPANT_ADD" | "PARTICIPANT_REMOVE" | "PARTICIPANT_REACTIVATE" | "TEAM_ROLE_CHANGE" | "REGISTRATION_CHANGE" | "STATUS_CHANGE" | "RULE_CHANGE";
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
        "models.CopyParticipantsRequest": {
            overrides?: components["schemas"]["models.CopyRoleOverride"][];
            source_event_id?: string;
        };
        "models.CopyRoleOverride": {
            /** @example Mentor */
            team_role: string;
            user_id: string;
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
        "models.EntityType": "USER" | "INVITE" | "EVENT" | "STAGE" | "EVENT_PARTICIPANT" | "REGISTRATION" | "REGISTRATION_STATUS" | "NOTIFICATION_RULE";
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
        "models.LoginRequest": {
            /** @example ivan@example.com */
            email?: string;
            /** @example correct-horse-battery */
            password?: string;
        };
        "models.MeResponse": {
            /** Format: date-time */
            created_at: string;
            /** @example John Smith */
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
            /**
             * @example ru
             * @enum {string}
             */
            locale: "ru" | "en";
            pending_email?: string;
            preferred_channel?: components["schemas"]["models.Channel"];
            /** @example false */
            telegram_linked: boolean;
            telegram_username?: string;
            /** Format: date-time */
            updated_at: string;
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
        "models.ParticipantSelfResponse": {
            /** Format: date-time */
            assigned_at: string;
            event_id: string;
            id: string;
            participation_status: components["schemas"]["models.ParticipationStatus"];
            /** @example Backend developer */
            team_role: string;
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
            stages: components["schemas"]["models.ScheduleItem"][];
            /** Format: date-time */
            start_at: string;
            state: components["schemas"]["models.EventState"];
            team_role?: string;
            /** @example National event */
            title: string;
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
        "models.TelegramLinkResponse": {
            /** @example https://t.me/timeline_bot?start=abc123 */
            deep_link: string;
            /** Format: date-time */
            expires_at: string;
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
        "models.UpdateProfileRequest": {
            /** @example John Smith */
            display_name?: string;
            /**
             * @example en
             * @enum {string}
             */
            locale?: "ru" | "en";
            /** @enum {string} */
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
