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
         *
         *     The actor is identified by the external display identifier of the user. The row id and
         *     entity_id stay internal: the journal records arbitrary entity types, which have no single
         *     external identifier space.
         */
        get: {
            parameters: {
                query?: {
                    /** @description Filter by action */
                    action?: string;
                    /**
                     * @description Filter by actor
                     * @example us_3k7d8gb9be
                     */
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
                        "application/json": components["schemas"]["dto.AuditPage"];
                    };
                };
                /** @description Bad Request */
                400: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["dto.ErrorResponse"];
                    };
                };
                /** @description Forbidden */
                403: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["dto.ErrorResponse"];
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
    "/admin/cases/{id}": {
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
         * Delete a case
         * @description The case and its prize leave the reconciliation; the track it pointed at is
         *     untouched.
         */
        delete: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    /**
                     * @description Case identifier
                     * @example cs_42ej2s5gh7e8
                     */
                    id: string;
                };
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description the case is deleted */
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
                        "application/json": components["schemas"]["dto.ErrorResponse"];
                    };
                };
                /** @description Not Found */
                404: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["dto.ErrorResponse"];
                    };
                };
            };
        };
        options?: never;
        head?: never;
        /**
         * Update a case
         * @description Omitted fields are left as they are. Detaching a case from its track needs
         *     clear_track, and dropping its prize needs clear_prize: a null is indistinguishable
         *     from an absent field otherwise.
         */
        patch: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    /** @description Case identifier */
                    id: string;
                };
                cookie?: never;
            };
            /** @description Mutable fields */
            requestBody: {
                content: {
                    "application/json": components["schemas"]["dto.UpdateEventCaseRequest"];
                };
            };
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["dto.EventCaseResponse"];
                    };
                };
                /** @description Bad Request */
                400: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["dto.ErrorResponse"];
                    };
                };
                /** @description Forbidden */
                403: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["dto.ErrorResponse"];
                    };
                };
                /** @description Not Found */
                404: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["dto.ErrorResponse"];
                    };
                };
            };
        };
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
                    /** @description Comma-separated format filter */
                    format?: "ONLINE" | "OFFLINE" | "HYBRID";
                    /** @description Include archived records */
                    include_archived?: boolean;
                    /** @description Comma-separated kind filter */
                    kind?: "HACKATHON" | "MEETUP";
                    /** @description Comma-separated origin filter */
                    origin?: "RU" | "WORLD";
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
                        "application/json": components["schemas"]["dto.EventPage"];
                    };
                };
                /** @description Forbidden */
                403: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["dto.ErrorResponse"];
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
                    "application/json": components["schemas"]["dto.CreateEventRequest"];
                };
            };
            responses: {
                /** @description Created */
                201: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["dto.EventResponse"];
                    };
                };
                /** @description Bad Request */
                400: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["dto.ErrorResponse"];
                    };
                };
                /** @description Forbidden */
                403: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["dto.ErrorResponse"];
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
         * @description Administrative read of the whole event.
         */
        get: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    /**
                     * @description Event identifier
                     * @example ev_3k7d8gb9be
                     */
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
                        "application/json": components["schemas"]["dto.EventResponse"];
                    };
                };
                /** @description Forbidden */
                403: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["dto.ErrorResponse"];
                    };
                };
                /** @description Not Found */
                404: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["dto.ErrorResponse"];
                    };
                };
            };
        };
        put?: never;
        post?: never;
        /**
         * Delete an event
         * @description Removes the event together with its stages, participants and stored covers.
         *     An event that already produced notifications cannot be removed: archive it instead.
         */
        delete: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    /**
                     * @description Event identifier
                     * @example ev_3k7d8gb9be
                     */
                    id: string;
                };
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description No Content */
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
                        "application/json": components["schemas"]["dto.ErrorResponse"];
                    };
                };
                /** @description Not Found */
                404: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["dto.ErrorResponse"];
                    };
                };
                /** @description the event is referenced by notifications */
                409: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["dto.ErrorResponse"];
                    };
                };
            };
        };
        options?: never;
        head?: never;
        /**
         * Update an event
         * @description Changing end_at increments the registration schedule_version, cancels stale
         *     pending notifications and triggers reconciliation. Violating the condition
         *     deadline_at <= end_at is rejected.
         *
         *     The kind is fixed once the event exists: a hackathon never becomes a meetup.
         *     Sending the kind it already has is not an attempted change and is accepted;
         *     sending a different one is refused with invalid_state_transition and leaves
         *     the event as it was.
         */
        patch: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    /**
                     * @description Event identifier
                     * @example ev_3k7d8gb9be
                     */
                    id: string;
                };
                cookie?: never;
            };
            /** @description Mutable fields */
            requestBody: {
                content: {
                    "application/json": components["schemas"]["dto.UpdateEventRequest"];
                };
            };
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["dto.EventResponse"];
                    };
                };
                /** @description Bad Request */
                400: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["dto.ErrorResponse"];
                    };
                };
                /** @description Forbidden */
                403: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["dto.ErrorResponse"];
                    };
                };
                /** @description Not Found */
                404: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["dto.ErrorResponse"];
                    };
                };
                /** @description the kind was changed, or the registration deadline falls outside end_at */
                409: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["dto.ErrorResponse"];
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
                    /**
                     * @description Event identifier
                     * @example ev_3k7d8gb9be
                     */
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
                        "application/json": components["schemas"]["dto.EventResponse"];
                    };
                };
                /** @description Forbidden */
                403: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["dto.ErrorResponse"];
                    };
                };
                /** @description Not Found */
                404: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["dto.ErrorResponse"];
                    };
                };
                /** @description event is already archived */
                409: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["dto.ErrorResponse"];
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
    "/admin/events/{id}/cases": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Create a case
         * @description Only the name is required: a case without a track belongs to the event as a whole,
         *     and a case without a prize is a research task rather than a funded one. A prize is
         *     a whole number in the event currency, the same units track prizes use.
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
            /** @description Case payload */
            requestBody: {
                content: {
                    "application/json": components["schemas"]["dto.CreateEventCaseRequest"];
                };
            };
            responses: {
                /** @description Created */
                201: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["dto.EventCaseResponse"];
                    };
                };
                /** @description Bad Request */
                400: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["dto.ErrorResponse"];
                    };
                };
                /** @description Forbidden */
                403: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["dto.ErrorResponse"];
                    };
                };
                /** @description Not Found */
                404: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["dto.ErrorResponse"];
                    };
                };
                /** @description Conflict */
                409: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["dto.ErrorResponse"];
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
    "/admin/events/{id}/cover": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Upload or replace the event cover
         * @description Accepts a single image part named "file". The stored type is decided by the file
         *     content, not by its name or declared type: only PNG, JPEG and WebP are kept, and
         *     metadata is stripped. An uploaded cover always wins over the automatically fetched
         *     one and is never overwritten by a refresh.
         */
        post: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    /** @description Event display id */
                    id: string;
                };
                cookie?: never;
            };
            requestBody: components["requestBodies"]["postAdminEvents_id_cover"];
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["dto.EventResponse"];
                    };
                };
                /** @description Bad Request */
                400: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["dto.ErrorResponse"];
                    };
                };
                /** @description Forbidden */
                403: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["dto.ErrorResponse"];
                    };
                };
                /** @description Not Found */
                404: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["dto.ErrorResponse"];
                    };
                };
                /** @description Request Entity Too Large */
                413: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["dto.ErrorResponse"];
                    };
                };
            };
        };
        /**
         * Remove the uploaded event cover
         * @description Deletes the stored file. An automatically fetched cover, if any, becomes visible again.
         */
        delete: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    /** @description Event display id */
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
                        "application/json": components["schemas"]["dto.EventResponse"];
                    };
                };
                /** @description Forbidden */
                403: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["dto.ErrorResponse"];
                    };
                };
                /** @description Not Found */
                404: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["dto.ErrorResponse"];
                    };
                };
            };
        };
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/admin/events/{id}/cover/refresh": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Fetch the cover from the event website
         * @description Reads the og:image declared by website_url. The address is validated against
         *     private and loopback networks after DNS resolution and on every redirect; the
         *     response is capped in size, time and redirect count and must decode as an image.
         *     An uploaded cover is left untouched and keeps taking precedence.
         */
        post: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    /** @description Event display id */
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
                        "application/json": components["schemas"]["dto.EventResponse"];
                    };
                };
                /** @description Forbidden */
                403: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["dto.ErrorResponse"];
                    };
                };
                /** @description Not Found */
                404: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["dto.ErrorResponse"];
                    };
                };
                /** @description Conflict */
                409: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["dto.ErrorResponse"];
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
                    /**
                     * @description Event identifier
                     * @example ev_3k7d8gb9be
                     */
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
                        "application/json": components["schemas"]["dto.ParticipantPage"];
                    };
                };
                /** @description Forbidden */
                403: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["dto.ErrorResponse"];
                    };
                };
                /** @description Not Found */
                404: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["dto.ErrorResponse"];
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
                    /**
                     * @description Event identifier
                     * @example ev_3k7d8gb9be
                     */
                    id: string;
                };
                cookie?: never;
            };
            /** @description List of users and their roles */
            requestBody: {
                content: {
                    "application/json": components["schemas"]["dto.AddParticipantsRequest"];
                };
            };
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["dto.BatchResult"];
                    };
                };
                /** @description Bad Request */
                400: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["dto.ErrorResponse"];
                    };
                };
                /** @description Forbidden */
                403: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["dto.ErrorResponse"];
                    };
                };
                /** @description Not Found */
                404: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["dto.ErrorResponse"];
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
                    /**
                     * @description Event identifier
                     * @example ev_3k7d8gb9be
                     */
                    id: string;
                };
                cookie?: never;
            };
            /** @description Participant identifiers */
            requestBody: {
                content: {
                    "application/json": components["schemas"]["dto.RemoveParticipantsRequest"];
                };
            };
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["dto.BatchResult"];
                    };
                };
                /** @description Bad Request */
                400: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["dto.ErrorResponse"];
                    };
                };
                /** @description Forbidden */
                403: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["dto.ErrorResponse"];
                    };
                };
                /** @description Not Found */
                404: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["dto.ErrorResponse"];
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
                    /**
                     * @description Target event identifier
                     * @example ev_3k7d8gb9be
                     */
                    id: string;
                };
                cookie?: never;
            };
            /** @description Source and role overrides */
            requestBody: {
                content: {
                    "application/json": components["schemas"]["dto.CopyParticipantsRequest"];
                };
            };
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["dto.BatchResult"];
                    };
                };
                /** @description Bad Request */
                400: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["dto.ErrorResponse"];
                    };
                };
                /** @description Forbidden */
                403: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["dto.ErrorResponse"];
                    };
                };
                /** @description Not Found */
                404: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["dto.ErrorResponse"];
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
                    /**
                     * @description Event identifier
                     * @example ev_3k7d8gb9be
                     */
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
                        "application/json": components["schemas"]["dto.EventResponse"];
                    };
                };
                /** @description Forbidden */
                403: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["dto.ErrorResponse"];
                    };
                };
                /** @description Not Found */
                404: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["dto.ErrorResponse"];
                    };
                };
                /** @description the event is already published or archived */
                409: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["dto.ErrorResponse"];
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
    "/admin/events/{id}/purge-cancel": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Cancel a scheduled deletion
         * @description Clears purge_scheduled_at on an archived event, keeping it archived indefinitely.
         *     Available only while the scheduled date has not yet been reached.
         */
        post: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    /**
                     * @description Event identifier
                     * @example ev_3k7d8gb9be
                     */
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
                        "application/json": components["schemas"]["dto.EventResponse"];
                    };
                };
                /** @description Unauthorized */
                401: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["dto.ErrorResponse"];
                    };
                };
                /** @description Forbidden */
                403: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["dto.ErrorResponse"];
                    };
                };
                /** @description no deletion is scheduled for this event */
                404: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["dto.ErrorResponse"];
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
                    /**
                     * @description Event identifier
                     * @example ev_3k7d8gb9be
                     */
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
                        "application/json": components["schemas"]["dto.RegistrationResponse"];
                    };
                };
                /** @description Forbidden */
                403: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["dto.ErrorResponse"];
                    };
                };
                /** @description Not Found */
                404: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["dto.ErrorResponse"];
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
                    /**
                     * @description Event identifier
                     * @example ev_3k7d8gb9be
                     */
                    id: string;
                };
                cookie?: never;
            };
            /** @description Link and deadline */
            requestBody: {
                content: {
                    "application/json": components["schemas"]["dto.CreateRegistrationRequest"];
                };
            };
            responses: {
                /** @description Created */
                201: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["dto.RegistrationResponse"];
                    };
                };
                /** @description Bad Request */
                400: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["dto.ErrorResponse"];
                    };
                };
                /** @description Forbidden */
                403: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["dto.ErrorResponse"];
                    };
                };
                /** @description Not Found */
                404: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["dto.ErrorResponse"];
                    };
                };
                /** @description registration already exists or the deadline falls outside end_at */
                409: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["dto.ErrorResponse"];
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
                    /**
                     * @description Event identifier
                     * @example ev_3k7d8gb9be
                     */
                    id: string;
                };
                cookie?: never;
            };
            /** @description Mutable fields */
            requestBody: {
                content: {
                    "application/json": components["schemas"]["dto.UpdateRegistrationRequest"];
                };
            };
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["dto.RegistrationResponse"];
                    };
                };
                /** @description Bad Request */
                400: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["dto.ErrorResponse"];
                    };
                };
                /** @description Forbidden */
                403: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["dto.ErrorResponse"];
                    };
                };
                /** @description Not Found */
                404: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["dto.ErrorResponse"];
                    };
                };
                /** @description Conflict */
                409: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["dto.ErrorResponse"];
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
                    /**
                     * @description Event identifier
                     * @example ev_3k7d8gb9be
                     */
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
                        "application/json": components["schemas"]["dto.RegistrationStatusPage"];
                    };
                };
                /** @description Forbidden */
                403: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["dto.ErrorResponse"];
                    };
                };
                /** @description Not Found */
                404: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["dto.ErrorResponse"];
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
                    /**
                     * @description Event identifier
                     * @example ev_3k7d8gb9be
                     */
                    id: string;
                };
                cookie?: never;
            };
            requestBody: components["requestBodies"]["dto.BatchSetStatusRequest"];
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["dto.BatchResult"];
                    };
                };
                /** @description Bad Request */
                400: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["dto.ErrorResponse"];
                    };
                };
                /** @description Forbidden */
                403: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["dto.ErrorResponse"];
                    };
                };
                /** @description Not Found */
                404: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["dto.ErrorResponse"];
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
                    /**
                     * @description Event identifier
                     * @example ev_3k7d8gb9be
                     */
                    id: string;
                };
                cookie?: never;
            };
            requestBody: components["requestBodies"]["dto.BatchSetStatusRequest"];
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["dto.PreviewResponse"];
                    };
                };
                /** @description Bad Request */
                400: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["dto.ErrorResponse"];
                    };
                };
                /** @description Forbidden */
                403: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["dto.ErrorResponse"];
                    };
                };
                /** @description Not Found */
                404: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["dto.ErrorResponse"];
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
                    /**
                     * @description Event identifier
                     * @example ev_3k7d8gb9be
                     */
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
                        "application/json": components["schemas"]["dto.RegistrationResponse"];
                    };
                };
                /** @description Forbidden */
                403: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["dto.ErrorResponse"];
                    };
                };
                /** @description Not Found */
                404: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["dto.ErrorResponse"];
                    };
                };
                /** @description registration is already disabled */
                409: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["dto.ErrorResponse"];
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
                    /**
                     * @description Event identifier
                     * @example ev_3k7d8gb9be
                     */
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
                        "application/json": components["schemas"]["dto.RegistrationResponse"];
                    };
                };
                /** @description Forbidden */
                403: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["dto.ErrorResponse"];
                    };
                };
                /** @description Not Found */
                404: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["dto.ErrorResponse"];
                    };
                };
                /** @description registration is already active */
                409: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["dto.ErrorResponse"];
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
                    /**
                     * @description Event identifier
                     * @example ev_3k7d8gb9be
                     */
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
                        "application/json": components["schemas"]["dto.NotificationRuleResponse"][];
                    };
                };
                /** @description Forbidden */
                403: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["dto.ErrorResponse"];
                    };
                };
                /** @description Not Found */
                404: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["dto.ErrorResponse"];
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
                    /**
                     * @description Event identifier
                     * @example ev_3k7d8gb9be
                     */
                    id: string;
                };
                cookie?: never;
            };
            /** @description Rule parameters */
            requestBody: {
                content: {
                    "application/json": components["schemas"]["dto.CreateRuleRequest"];
                };
            };
            responses: {
                /** @description Created */
                201: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["dto.NotificationRuleResponse"];
                    };
                };
                /** @description Bad Request */
                400: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["dto.ErrorResponse"];
                    };
                };
                /** @description Forbidden */
                403: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["dto.ErrorResponse"];
                    };
                };
                /** @description Not Found */
                404: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["dto.ErrorResponse"];
                    };
                };
                /** @description a rule with this offset already exists or the slot limit is reached */
                409: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["dto.ErrorResponse"];
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
         * @description Overlapping stages and stages outside the event period are allowed.
         *     A stage produces no notifications.
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
                    "application/json": components["schemas"]["dto.CreateStageRequest"];
                };
            };
            responses: {
                /** @description Created */
                201: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["dto.StageResponse"];
                    };
                };
                /** @description Bad Request */
                400: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["dto.ErrorResponse"];
                    };
                };
                /** @description Forbidden */
                403: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["dto.ErrorResponse"];
                    };
                };
                /** @description Not Found */
                404: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["dto.ErrorResponse"];
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
    "/admin/events/{id}/tracks": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Create a track
         * @description Tracks belong to hackathons only; a meetup is refused with 409 tracks_not_supported.
         *     Prize amounts are whole numbers in the event currency. The sum of every prize of
         *     every track must not exceed prize_pool, and a request that would break that is
         *     refused with 400 without writing anything.
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
            /** @description Track payload */
            requestBody: {
                content: {
                    "application/json": components["schemas"]["dto.CreateEventTrackRequest"];
                };
            };
            responses: {
                /** @description Created */
                201: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["dto.EventTrackResponse"];
                    };
                };
                /** @description Bad Request */
                400: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["dto.ErrorResponse"];
                    };
                };
                /** @description Forbidden */
                403: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["dto.ErrorResponse"];
                    };
                };
                /** @description Not Found */
                404: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["dto.ErrorResponse"];
                    };
                };
                /** @description Conflict */
                409: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["dto.ErrorResponse"];
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
                        "application/json": components["schemas"]["dto.InvitePage"];
                    };
                };
                /** @description Forbidden */
                403: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["dto.ErrorResponse"];
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
                    "application/json": components["schemas"]["dto.CreateInviteRequest"];
                };
            };
            responses: {
                /** @description Created */
                201: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["dto.CreateInviteResponse"];
                    };
                };
                /** @description Bad Request */
                400: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["dto.ErrorResponse"];
                    };
                };
                /** @description Forbidden */
                403: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["dto.ErrorResponse"];
                    };
                };
                /** @description a user with this email already exists */
                409: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["dto.ErrorResponse"];
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
                    /**
                     * @description Invite identifier
                     * @example in_42ej2s5gh7e8
                     */
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
                        "application/json": components["schemas"]["dto.MessageResponse"];
                    };
                };
                /** @description Forbidden */
                403: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["dto.ErrorResponse"];
                    };
                };
                /** @description Not Found */
                404: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["dto.ErrorResponse"];
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
                    /**
                     * @description Participant identifier
                     * @example pa_42ej2s5gh7e8
                     */
                    id: string;
                };
                cookie?: never;
            };
            /** @description Participant role */
            requestBody: {
                content: {
                    "application/json": components["schemas"]["dto.UpdateTeamRoleRequest"];
                };
            };
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["dto.ParticipantResponse"];
                    };
                };
                /** @description Bad Request */
                400: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["dto.ErrorResponse"];
                    };
                };
                /** @description Forbidden */
                403: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["dto.ErrorResponse"];
                    };
                };
                /** @description Not Found */
                404: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["dto.ErrorResponse"];
                    };
                };
                /** @description the participant is already assigned */
                409: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["dto.ErrorResponse"];
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
                    /**
                     * @description Participant identifier
                     * @example pa_42ej2s5gh7e8
                     */
                    id: string;
                };
                cookie?: never;
            };
            /** @description New role */
            requestBody: {
                content: {
                    "application/json": components["schemas"]["dto.UpdateTeamRoleRequest"];
                };
            };
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["dto.ParticipantResponse"];
                    };
                };
                /** @description Bad Request */
                400: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["dto.ErrorResponse"];
                    };
                };
                /** @description Forbidden */
                403: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["dto.ErrorResponse"];
                    };
                };
                /** @description Not Found */
                404: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["dto.ErrorResponse"];
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
                        "application/json": components["schemas"]["dto.DeadlinePage"];
                    };
                };
                /** @description Forbidden */
                403: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["dto.ErrorResponse"];
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
                        "application/json": components["schemas"]["dto.RegistrationCoverage"];
                    };
                };
                /** @description Forbidden */
                403: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["dto.ErrorResponse"];
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
                        "application/json": components["schemas"]["dto.DeadlinePage"];
                    };
                };
                /** @description Forbidden */
                403: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["dto.ErrorResponse"];
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
                    /**
                     * @description Rule identifier
                     * @example nr_42ej2s5gh7e8
                     */
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
                        "application/json": components["schemas"]["dto.ErrorResponse"];
                    };
                };
                /** @description Not Found */
                404: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["dto.ErrorResponse"];
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
                    /**
                     * @description Rule identifier
                     * @example nr_42ej2s5gh7e8
                     */
                    id: string;
                };
                cookie?: never;
            };
            /** @description Mutable fields */
            requestBody: {
                content: {
                    "application/json": components["schemas"]["dto.UpdateRuleRequest"];
                };
            };
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["dto.NotificationRuleResponse"];
                    };
                };
                /** @description Bad Request */
                400: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["dto.ErrorResponse"];
                    };
                };
                /** @description Forbidden */
                403: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["dto.ErrorResponse"];
                    };
                };
                /** @description Not Found */
                404: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["dto.ErrorResponse"];
                    };
                };
                /** @description Conflict */
                409: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["dto.ErrorResponse"];
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
                    /**
                     * @description Status identifier
                     * @example rs_42ej2s5gh7
                     */
                    id: string;
                };
                cookie?: never;
            };
            /** @description New status */
            requestBody: {
                content: {
                    "application/json": components["schemas"]["dto.AdminChangeStatusRequest"];
                };
            };
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["dto.RegistrationStatusResponse"];
                    };
                };
                /** @description Bad Request */
                400: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["dto.ErrorResponse"];
                    };
                };
                /** @description Forbidden */
                403: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["dto.ErrorResponse"];
                    };
                };
                /** @description Not Found */
                404: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["dto.ErrorResponse"];
                    };
                };
                /** @description Conflict */
                409: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["dto.ErrorResponse"];
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
                    /**
                     * @description Rule to render
                     * @example nr_42ej2s5gh7e8
                     */
                    rule_id?: string;
                };
                header?: never;
                path: {
                    /**
                     * @description Registration status
                     * @example rs_42ej2s5gh7
                     */
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
                        "application/json": components["schemas"]["dto.NotificationPreviewResponse"];
                    };
                };
                /** @description Bad Request */
                400: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["dto.ErrorResponse"];
                    };
                };
                /** @description Unauthorized */
                401: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["dto.ErrorResponse"];
                    };
                };
                /** @description Forbidden */
                403: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["dto.ErrorResponse"];
                    };
                };
                /** @description nothing to render, or a foreign rule */
                404: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["dto.ErrorResponse"];
                    };
                };
                /** @description Too Many Requests */
                429: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["dto.ErrorResponse"];
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
    "/admin/retention-settings": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Storage retention settings
         * @description Admin-configured policy for automatic event archiving and deletion: how many days
         *     after an event ends it is archived automatically, whether the archive is kept forever
         *     or purged after a number of months, whether the cover is dropped when an event is
         *     archived, and how long the audit log is retained.
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
                        "application/json": components["schemas"]["dto.RetentionSettingsResponse"];
                    };
                };
                /** @description Unauthorized */
                401: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["dto.ErrorResponse"];
                    };
                };
                /** @description Forbidden */
                403: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["dto.ErrorResponse"];
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
         * Update storage retention settings
         * @description Setting archive_after_days or delete_archive_after_months to null disables that
         *     automatic step; an event is never deleted immediately, only marked with a future
         *     purge_scheduled_at that the admin can still cancel per event before it is reached.
         */
        patch: {
            parameters: {
                query?: never;
                header?: never;
                path?: never;
                cookie?: never;
            };
            /** @description Retention policy */
            requestBody: {
                content: {
                    "application/json": components["schemas"]["dto.UpdateRetentionSettingsRequest"];
                };
            };
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["dto.RetentionSettingsResponse"];
                    };
                };
                /** @description Bad Request */
                400: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["dto.ErrorResponse"];
                    };
                };
                /** @description Unauthorized */
                401: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["dto.ErrorResponse"];
                    };
                };
                /** @description Forbidden */
                403: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["dto.ErrorResponse"];
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
        /** Delete a stage */
        delete: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    /**
                     * @description Stage identifier
                     * @example st_42ej2s5gh7
                     */
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
                        "application/json": components["schemas"]["dto.ErrorResponse"];
                    };
                };
                /** @description Not Found */
                404: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["dto.ErrorResponse"];
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
                    "application/json": components["schemas"]["dto.UpdateStageRequest"];
                };
            };
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["dto.StageResponse"];
                    };
                };
                /** @description Bad Request */
                400: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["dto.ErrorResponse"];
                    };
                };
                /** @description Forbidden */
                403: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["dto.ErrorResponse"];
                    };
                };
                /** @description Not Found */
                404: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["dto.ErrorResponse"];
                    };
                };
            };
        };
        trace?: never;
    };
    "/admin/tracks/{id}": {
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
         * Delete a track
         * @description Teams that had chosen this track keep their entry and lose the choice: the
         *     track becomes unset rather than the registration being withdrawn.
         */
        delete: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    /**
                     * @description Track identifier
                     * @example tr_42ej2s5gh7e8
                     */
                    id: string;
                };
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description the track is deleted */
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
                        "application/json": components["schemas"]["dto.ErrorResponse"];
                    };
                };
                /** @description Not Found */
                404: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["dto.ErrorResponse"];
                    };
                };
            };
        };
        options?: never;
        head?: never;
        /**
         * Update a track
         * @description Prizes are replaced wholesale only when set_prizes is true; otherwise they are
         *     left as they are. The pool ceiling is rechecked against every other track.
         */
        patch: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    /** @description Track identifier */
                    id: string;
                };
                cookie?: never;
            };
            /** @description Mutable fields */
            requestBody: {
                content: {
                    "application/json": components["schemas"]["dto.UpdateEventTrackRequest"];
                };
            };
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["dto.EventTrackResponse"];
                    };
                };
                /** @description Bad Request */
                400: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["dto.ErrorResponse"];
                    };
                };
                /** @description Forbidden */
                403: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["dto.ErrorResponse"];
                    };
                };
                /** @description Not Found */
                404: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["dto.ErrorResponse"];
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
                        "application/json": components["schemas"]["dto.UserPage"];
                    };
                };
                /** @description Forbidden */
                403: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["dto.ErrorResponse"];
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
                    /**
                     * @description User identifier
                     * @example us_42ej2s5gh7e8
                     */
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
                        "application/json": components["schemas"]["dto.MessageResponse"];
                    };
                };
                /** @description Forbidden */
                403: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["dto.ErrorResponse"];
                    };
                };
                /** @description Not Found */
                404: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["dto.ErrorResponse"];
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
                    /**
                     * @description User identifier
                     * @example us_42ej2s5gh7e8
                     */
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
                        "application/json": components["schemas"]["dto.MessageResponse"];
                    };
                };
                /** @description Forbidden */
                403: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["dto.ErrorResponse"];
                    };
                };
                /** @description Not Found */
                404: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["dto.ErrorResponse"];
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
                    /**
                     * @description User identifier
                     * @example us_42ej2s5gh7e8
                     */
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
                        "application/json": components["schemas"]["dto.MessageResponse"];
                    };
                };
                /** @description Forbidden */
                403: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["dto.ErrorResponse"];
                    };
                };
                /** @description Not Found */
                404: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["dto.ErrorResponse"];
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
                        "application/json": components["schemas"]["dto.CSRFResponse"];
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
    "/auth/email-change/cancel": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Cancel an email change
         * @description Reverts the account to the address the change was requested from. Works both before and
         *     after the new address has been confirmed, for as long as the cancellation link is valid.
         */
        post: {
            parameters: {
                query?: never;
                header?: never;
                path?: never;
                cookie?: never;
            };
            /** @description Cancellation token */
            requestBody: {
                content: {
                    "application/json": components["schemas"]["dto.TokenRequest"];
                };
            };
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["dto.MessageResponse"];
                    };
                };
                /** @description Bad Request */
                400: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["dto.ErrorResponse"];
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
            requestBody: components["requestBodies"]["dto.TokenRequest"];
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["dto.MessageResponse"];
                    };
                };
                /** @description Bad Request */
                400: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["dto.ErrorResponse"];
                    };
                };
                /** @description address is already taken */
                409: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["dto.ErrorResponse"];
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
                    "application/json": components["schemas"]["dto.LoginRequest"];
                };
            };
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["dto.AuthResponse"];
                    };
                };
                /** @description Bad Request */
                400: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["dto.ErrorResponse"];
                    };
                };
                /** @description invalid credentials or a deactivated account */
                401: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["dto.ErrorResponse"];
                    };
                };
                /** @description Too Many Requests */
                429: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["dto.ErrorResponse"];
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
                        "application/json": components["schemas"]["dto.MessageResponse"];
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
                        "application/json": components["schemas"]["dto.MessageResponse"];
                    };
                };
                /** @description Unauthorized */
                401: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["dto.ErrorResponse"];
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
    "/auth/password/change": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Change your own password
         * @description Requires the current password. Revokes every other session; this device stays signed in.
         *     A notice is sent to every channel linked to the account.
         */
        post: {
            parameters: {
                query?: never;
                header?: never;
                path?: never;
                cookie?: never;
            };
            /** @description Current and new password */
            requestBody: {
                content: {
                    "application/json": components["schemas"]["dto.ChangePasswordRequest"];
                };
            };
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["dto.MessageResponse"];
                    };
                };
                /** @description Bad Request */
                400: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["dto.ErrorResponse"];
                    };
                };
                /** @description Unauthorized */
                401: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["dto.ErrorResponse"];
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
            requestBody: components["requestBodies"]["dto.EmailRequest"];
            responses: {
                /** @description Accepted */
                202: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["dto.MessageResponse"];
                    };
                };
                /** @description Bad Request */
                400: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["dto.ErrorResponse"];
                    };
                };
                /** @description Too Many Requests */
                429: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["dto.ErrorResponse"];
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
                    "application/json": components["schemas"]["dto.ResetPasswordRequest"];
                };
            };
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["dto.MessageResponse"];
                    };
                };
                /** @description Bad Request */
                400: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["dto.ErrorResponse"];
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
                        "application/json": components["schemas"]["dto.AuthResponse"];
                    };
                };
                /** @description Unauthorized */
                401: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["dto.ErrorResponse"];
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
                    "application/json": components["schemas"]["dto.RegisterRequest"];
                };
            };
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["dto.AuthResponse"];
                    };
                };
                /** @description Bad Request */
                400: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["dto.ErrorResponse"];
                    };
                };
                /** @description email or nickname is already taken */
                409: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["dto.ErrorResponse"];
                    };
                };
                /** @description Too Many Requests */
                429: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["dto.ErrorResponse"];
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
            requestBody: components["requestBodies"]["dto.TokenRequest"];
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["dto.MessageResponse"];
                    };
                };
                /** @description the token is invalid or has expired */
                400: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["dto.ErrorResponse"];
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
            requestBody: components["requestBodies"]["dto.EmailRequest"];
            responses: {
                /** @description Accepted */
                202: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["dto.MessageResponse"];
                    };
                };
                /** @description Bad Request */
                400: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["dto.ErrorResponse"];
                    };
                };
                /** @description Too Many Requests */
                429: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["dto.ErrorResponse"];
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
    "/avatars/{key}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Fetch a stored avatar
         * @description Serves an uploaded avatar by its server-generated key. The key is opaque and
         *     unguessable; no client-supplied path ever reaches the storage.
         */
        get: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    /** @description Storage key */
                    key: string;
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
                    content?: never;
                };
                /** @description Not Found */
                404: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "image/jpeg": components["schemas"]["dto.ErrorResponse"];
                        "image/png": components["schemas"]["dto.ErrorResponse"];
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
         *     carries a dedicated payload built for the catalog.
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
                    /** @description Participation filter: true keeps only the events the caller takes part in, false only the rest. Omit it for every event. */
                    joined?: boolean;
                    /** @description Comma-separated kind filter */
                    kind?: "HACKATHON" | "MEETUP";
                    /** @description Sort direction */
                    order?: "asc" | "desc";
                    /** @description Comma-separated origin filter. Omit it for the All view: RU and WORLD cover every event. */
                    origin?: "RU" | "WORLD";
                    /** @description Page number */
                    page?: number;
                    /** @description Page size */
                    page_size?: number;
                    /** @description Search by title and organiser */
                    search?: string;
                    /** @description Sort field */
                    sort?: "start_at" | "end_at" | "title";
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
                        "application/json": components["schemas"]["dto.CatalogPage"];
                    };
                };
                /** @description Bad Request */
                400: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["dto.ErrorResponse"];
                    };
                };
                /** @description Unauthorized */
                401: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["dto.ErrorResponse"];
                    };
                };
                /** @description too many catalog requests */
                429: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["dto.ErrorResponse"];
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
    "/catalog/export": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Export the catalog as CSV
         * @description The same events the catalog listing returns, under the same filters and the same
         *     sort, streamed as CSV instead of paginated JSON. Only the fields the listing
         *     itself exposes are written.
         *
         *     Like the listing it requires a session and is counted against the catalog rate
         *     limit of the account. Rows are streamed as they are read, so the response is not
         *     built in memory.
         *
         *     The `joined` column repeats the participation the listing shows. It says whether
         *     the account takes part in the event, not whether anyone registered on an external
         *     site: the system never checks that.
         */
        get: {
            parameters: {
                query?: {
                    /** @description Comma-separated format filter */
                    format?: "ONLINE" | "OFFLINE" | "HYBRID";
                    /** @description Lower bound of the period */
                    from?: string;
                    /** @description Comma-separated kind filter */
                    kind?: "HACKATHON" | "MEETUP";
                    /** @description Sort direction */
                    order?: "asc" | "desc";
                    /** @description Comma-separated origin filter */
                    origin?: "RU" | "WORLD";
                    /** @description Search by title and organiser */
                    search?: string;
                    /** @description Sort field */
                    sort?: "start_at" | "end_at" | "title";
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
                /** @description CSV payload */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "text/csv": string;
                    };
                };
                /** @description Bad Request */
                400: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "text/csv": components["schemas"]["dto.ErrorResponse"];
                    };
                };
                /** @description Unauthorized */
                401: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "text/csv": components["schemas"]["dto.ErrorResponse"];
                    };
                };
                /** @description too many catalog requests */
                429: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "text/csv": components["schemas"]["dto.ErrorResponse"];
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
    "/covers/{key}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Fetch a stored cover
         * @description Serves a stored cover by its server-generated key. The key is opaque and
         *     unguessable; no client-supplied path ever reaches the storage.
         */
        get: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    /** @description Storage key */
                    key: string;
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
                    content?: never;
                };
                /** @description Not Found */
                404: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "image/jpeg": components["schemas"]["dto.ErrorResponse"];
                        "image/png": components["schemas"]["dto.ErrorResponse"];
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
         *     deadline and link.
         */
        get: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    /**
                     * @description Event identifier
                     * @example ev_3k7d8gb9be
                     */
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
                        "application/json": components["schemas"]["dto.EventCard"];
                    };
                };
                /** @description Unauthorized */
                401: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["dto.ErrorResponse"];
                    };
                };
                /** @description Forbidden */
                403: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["dto.ErrorResponse"];
                    };
                };
                /** @description Not Found */
                404: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["dto.ErrorResponse"];
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
    "/events/{id}/cases": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Event cases
         * @description The partner tasks declared for the event, in `case_no` order. A case may belong to
         *     a track or to the event as a whole, and may carry a prize or none at all.
         *     Access follows the track listing.
         */
        get: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    /**
                     * @description Event identifier
                     * @example ev_3k7d8gb9be
                     */
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
                        "application/json": components["schemas"]["dto.EventCaseListResponse"];
                    };
                };
                /** @description Forbidden */
                403: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["dto.ErrorResponse"];
                    };
                };
                /** @description Not Found */
                404: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["dto.ErrorResponse"];
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
    "/events/{id}/finance": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Event finance
         * @description Every sum the event declares, reconciled in one place: the prize pool, the split
         *     across tracks with their places and nominations, the partner cases and what the
         *     three add up to.
         *
         *     `distributed` is `distributed_tracks` plus `distributed_cases`, and `discrepancy`
         *     is `prize_pool` minus that sum. A positive discrepancy is a reserve, a negative one
         *     is an overspend. Neither is an error and neither blocks saving the event: the
         *     organiser may announce a pool larger than the prizes, or a sponsor may add to it
         *     later. When the event declares no pool, `discrepancy_known` is false and no
         *     discrepancy is reported rather than a zero being invented.
         *
         *     Access follows the track listing: an unpublished event answers only to an
         *     administrator, a published one to any reader.
         */
        get: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    /**
                     * @description Event identifier
                     * @example ev_3k7d8gb9be
                     */
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
                        "application/json": components["schemas"]["dto.EventFinanceResponse"];
                    };
                };
                /** @description Forbidden */
                403: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["dto.ErrorResponse"];
                    };
                };
                /** @description Not Found */
                404: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["dto.ErrorResponse"];
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
    "/events/{id}/finance/export": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Export the finance reconciliation as CSV
         * @description The same figures the finance endpoint returns, flattened into rows instead of a
         *     tree: one row per track place or nomination, one row per case, and the totals of
         *     the reconciliation last. The `section` column says which of the three a row is.
         *
         *     Access follows the finance endpoint itself.
         */
        get: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    /**
                     * @description Event identifier
                     * @example ev_3k7d8gb9be
                     */
                    id: string;
                };
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description CSV payload */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "text/csv": string;
                    };
                };
                /** @description Forbidden */
                403: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "text/csv": components["schemas"]["dto.ErrorResponse"];
                    };
                };
                /** @description Not Found */
                404: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "text/csv": components["schemas"]["dto.ErrorResponse"];
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
                    /**
                     * @description Event identifier
                     * @example ev_3k7d8gb9be
                     */
                    id: string;
                };
                cookie?: never;
            };
            /** @description Own team role */
            requestBody: {
                content: {
                    "application/json": components["schemas"]["dto.JoinEventRequest"];
                };
            };
            responses: {
                /** @description Created */
                201: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["dto.ParticipantSelfResponse"];
                    };
                };
                /** @description a hackathon requires a team role */
                400: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["dto.ErrorResponse"];
                    };
                };
                /** @description Unauthorized */
                401: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["dto.ErrorResponse"];
                    };
                };
                /** @description Not Found */
                404: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["dto.ErrorResponse"];
                    };
                };
                /** @description already a participant, or the event has finished */
                409: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["dto.ErrorResponse"];
                    };
                };
                /** @description too many join attempts */
                429: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["dto.ErrorResponse"];
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
         *     address, an internal host or a tg:// address is stored as given. The scheme
         *     must be on the accepted list: http, https, ftp, ftps, mailto, tel, tg,
         *     matrix, webcal, irc, ircs and xmpp. Anything else is rejected, so a scheme
         *     that executes in the browser or hands the address to an operating system
         *     handler can never be stored. The client marks a non-HTTPS link but never
         *     blocks it.
         */
        get: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    /**
                     * @description Event identifier
                     * @example ev_3k7d8gb9be
                     */
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
                        "application/json": components["schemas"]["dto.ResourceLinkListResponse"];
                    };
                };
                /** @description Unauthorized */
                401: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["dto.ErrorResponse"];
                    };
                };
                /** @description the event is not visible to the caller */
                404: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["dto.ErrorResponse"];
                    };
                };
                /** @description Too Many Requests */
                429: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["dto.ErrorResponse"];
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
                    /**
                     * @description Event identifier
                     * @example ev_3k7d8gb9be
                     */
                    id: string;
                };
                cookie?: never;
            };
            /** @description Link */
            requestBody: {
                content: {
                    "application/json": components["schemas"]["dto.CreateResourceLinkRequest"];
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
                        "application/json": components["schemas"]["dto.ErrorResponse"];
                    };
                };
                /** @description Unauthorized */
                401: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["dto.ErrorResponse"];
                    };
                };
                /** @description only an administrator edits event links */
                403: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["dto.ErrorResponse"];
                    };
                };
                /** @description Not Found */
                404: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["dto.ErrorResponse"];
                    };
                };
                /** @description the link limit for the event is reached */
                409: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["dto.ErrorResponse"];
                    };
                };
                /** @description Too Many Requests */
                429: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["dto.ErrorResponse"];
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
                    /**
                     * @description Event identifier
                     * @example ev_3k7d8gb9be
                     */
                    id: string;
                    /**
                     * @description Link identifier
                     * @example rl_42ej2s5gh7e8
                     */
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
                        "application/json": components["schemas"]["dto.ErrorResponse"];
                    };
                };
                /** @description Forbidden */
                403: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["dto.ErrorResponse"];
                    };
                };
                /** @description Not Found */
                404: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["dto.ErrorResponse"];
                    };
                };
                /** @description Too Many Requests */
                429: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["dto.ErrorResponse"];
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
                    /**
                     * @description Event identifier
                     * @example ev_3k7d8gb9be
                     */
                    id: string;
                    /**
                     * @description Link identifier
                     * @example rl_42ej2s5gh7e8
                     */
                    linkId: string;
                };
                cookie?: never;
            };
            /** @description Fields to change */
            requestBody: {
                content: {
                    "application/json": components["schemas"]["dto.UpdateResourceLinkRequest"];
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
                        "application/json": components["schemas"]["dto.ErrorResponse"];
                    };
                };
                /** @description Unauthorized */
                401: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["dto.ErrorResponse"];
                    };
                };
                /** @description Forbidden */
                403: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["dto.ErrorResponse"];
                    };
                };
                /** @description Not Found */
                404: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["dto.ErrorResponse"];
                    };
                };
                /** @description Too Many Requests */
                429: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["dto.ErrorResponse"];
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
                    /**
                     * @description Event identifier
                     * @example ev_3k7d8gb9be
                     */
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
                        "application/json": components["schemas"]["dto.RegistrationStatusResponse"];
                    };
                };
                /** @description Unauthorized */
                401: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["dto.ErrorResponse"];
                    };
                };
                /** @description Forbidden */
                403: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["dto.ErrorResponse"];
                    };
                };
                /** @description Not Found */
                404: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["dto.ErrorResponse"];
                    };
                };
                /** @description invalid state transition */
                409: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["dto.ErrorResponse"];
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
                    /**
                     * @description Event identifier
                     * @example ev_3k7d8gb9be
                     */
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
                        "application/json": components["schemas"]["dto.StageResponse"][];
                    };
                };
                /** @description Forbidden */
                403: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["dto.ErrorResponse"];
                    };
                };
                /** @description Not Found */
                404: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["dto.ErrorResponse"];
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
    "/events/{id}/tracks": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Event tracks
         * @description The cases a hackathon is split into, in order, each with its prize places.
         *     Only a hackathon carries tracks; a meetup answers with an empty list.
         *     The envelope also states the event prize pool, the sum already distributed
         *     across every track, and what is left unallocated.
         */
        get: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    /**
                     * @description Event identifier
                     * @example ev_3k7d8gb9be
                     */
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
                        "application/json": components["schemas"]["dto.EventTrackListResponse"];
                    };
                };
                /** @description Forbidden */
                403: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["dto.ErrorResponse"];
                    };
                };
                /** @description Not Found */
                404: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["dto.ErrorResponse"];
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
                        "application/json": components["schemas"]["dto.HealthResponse"];
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
                        "application/json": components["schemas"]["dto.InvitePreview"];
                    };
                };
                /** @description Not Found */
                404: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["dto.ErrorResponse"];
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
                    "application/json": components["schemas"]["dto.AcceptInviteRequest"];
                };
            };
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["dto.AuthResponse"];
                    };
                };
                /** @description Bad Request */
                400: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["dto.ErrorResponse"];
                    };
                };
                /** @description Conflict */
                409: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["dto.ErrorResponse"];
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
                        "application/json": components["schemas"]["dto.MeResponse"];
                    };
                };
                /** @description Unauthorized */
                401: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["dto.ErrorResponse"];
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
                    "application/json": components["schemas"]["dto.UpdateProfileRequest"];
                };
            };
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["dto.MeResponse"];
                    };
                };
                /** @description Bad Request */
                400: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["dto.ErrorResponse"];
                    };
                };
                /** @description Unauthorized */
                401: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["dto.ErrorResponse"];
                    };
                };
                /** @description Too Many Requests */
                429: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["dto.ErrorResponse"];
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
                    /**
                     * @description Artifact identifier
                     * @example ar_42ej2s5gh7e8
                     */
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
                        "*/*": components["schemas"]["dto.ErrorResponse"];
                    };
                };
                /** @description Not Found */
                404: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "*/*": components["schemas"]["dto.ErrorResponse"];
                    };
                };
                /** @description Too Many Requests */
                429: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "*/*": components["schemas"]["dto.ErrorResponse"];
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
                    /**
                     * @description Artifact identifier
                     * @example ar_42ej2s5gh7e8
                     */
                    id: string;
                };
                cookie?: never;
            };
            /** @description Fields to change */
            requestBody: {
                content: {
                    "application/json": components["schemas"]["dto.UpdateArtifactRequest"];
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
                        "application/json": components["schemas"]["dto.ErrorResponse"];
                    };
                };
                /** @description Unauthorized */
                401: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["dto.ErrorResponse"];
                    };
                };
                /** @description the artifact belongs to another user */
                404: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["dto.ErrorResponse"];
                    };
                };
                /** @description Too Many Requests */
                429: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["dto.ErrorResponse"];
                    };
                };
            };
        };
        trace?: never;
    };
    "/me/avatar": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Upload or replace your avatar
         * @description Accepts a single image part named "file". The stored type is decided by the
         *     file content, not by its name or declared type: only PNG, JPEG and WebP are kept.
         *     A previously stored file is deleted once the new one is in place.
         */
        post: {
            parameters: {
                query?: never;
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody: components["requestBodies"]["postAdminEvents_id_cover"];
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["dto.MeResponse"];
                    };
                };
                /** @description Bad Request */
                400: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["dto.ErrorResponse"];
                    };
                };
                /** @description Unauthorized */
                401: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["dto.ErrorResponse"];
                    };
                };
                /** @description Request Entity Too Large */
                413: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["dto.ErrorResponse"];
                    };
                };
                /** @description Too Many Requests */
                429: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["dto.ErrorResponse"];
                    };
                };
            };
        };
        /**
         * Remove your avatar
         * @description Deletes the stored file and falls back to the initials rendered by the client.
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
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["dto.MeResponse"];
                    };
                };
                /** @description Unauthorized */
                401: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["dto.ErrorResponse"];
                    };
                };
                /** @description Not Found */
                404: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["dto.ErrorResponse"];
                    };
                };
            };
        };
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
                        "application/json": components["schemas"]["dto.TemplateListResponse"];
                    };
                };
                /** @description Unauthorized */
                401: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["dto.ErrorResponse"];
                    };
                };
                /** @description Too Many Requests */
                429: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["dto.ErrorResponse"];
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
                        "application/json": components["schemas"]["dto.MessageResponse"];
                    };
                };
                /** @description Unauthorized */
                401: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["dto.ErrorResponse"];
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
                    "application/json": components["schemas"]["dto.ChangeEmailRequest"];
                };
            };
            responses: {
                /** @description Accepted */
                202: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["dto.MessageResponse"];
                    };
                };
                /** @description Bad Request */
                400: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["dto.ErrorResponse"];
                    };
                };
                /** @description Unauthorized */
                401: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["dto.ErrorResponse"];
                    };
                };
                /** @description address is already taken */
                409: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["dto.ErrorResponse"];
                    };
                };
                /** @description Too Many Requests */
                429: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["dto.ErrorResponse"];
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
                        "application/json": components["schemas"]["dto.MyEventPage"];
                    };
                };
                /** @description Unauthorized */
                401: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["dto.ErrorResponse"];
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
                        "application/json": components["schemas"]["dto.SystemEventPage"];
                    };
                };
                /** @description Bad Request */
                400: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["dto.ErrorResponse"];
                    };
                };
                /** @description Unauthorized */
                401: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["dto.ErrorResponse"];
                    };
                };
                /** @description Too Many Requests */
                429: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["dto.ErrorResponse"];
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
                    "application/json": components["schemas"]["dto.MarkReadRequest"];
                };
            };
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["dto.UnreadCountResponse"];
                    };
                };
                /** @description Bad Request */
                400: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["dto.ErrorResponse"];
                    };
                };
                /** @description Unauthorized */
                401: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["dto.ErrorResponse"];
                    };
                };
                /** @description Too Many Requests */
                429: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["dto.ErrorResponse"];
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
                        "application/json": components["schemas"]["dto.UnreadCountResponse"];
                    };
                };
                /** @description Unauthorized */
                401: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["dto.ErrorResponse"];
                    };
                };
                /** @description Too Many Requests */
                429: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["dto.ErrorResponse"];
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
                    /**
                     * @description Event identifier
                     * @example ev_3k7d8gb9be
                     */
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
                        "application/json": components["schemas"]["dto.ArtifactListResponse"];
                    };
                };
                /** @description Unauthorized */
                401: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["dto.ErrorResponse"];
                    };
                };
                /** @description Not Found */
                404: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["dto.ErrorResponse"];
                    };
                };
                /** @description Too Many Requests */
                429: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["dto.ErrorResponse"];
                    };
                };
            };
        };
        put?: never;
        /**
         * Add an own artifact
         * @description Records one artifact of the caller for the event. The link is only checked for
         *     being a parseable address whose scheme is on the accepted list, so a scheme
         *     that executes in a browser or reaches an operating system handler is rejected.
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
                    "application/json": components["schemas"]["dto.CreateArtifactRequest"];
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
                        "application/json": components["schemas"]["dto.ErrorResponse"];
                    };
                };
                /** @description Unauthorized */
                401: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["dto.ErrorResponse"];
                    };
                };
                /** @description Not Found */
                404: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["dto.ErrorResponse"];
                    };
                };
                /** @description the artifact limit for this event is reached */
                409: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["dto.ErrorResponse"];
                    };
                };
                /** @description Too Many Requests */
                429: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["dto.ErrorResponse"];
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
                    /**
                     * @description Event identifier
                     * @example ev_3k7d8gb9be
                     */
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
                        "application/json": components["schemas"]["dto.ErrorResponse"];
                    };
                };
                /** @description the event is not visible to the caller */
                404: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["dto.ErrorResponse"];
                    };
                };
                /** @description Too Many Requests */
                429: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["dto.ErrorResponse"];
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
                    "application/json": components["schemas"]["dto.SaveNoteRequest"];
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
                        "application/json": components["schemas"]["dto.ErrorResponse"];
                    };
                };
                /** @description Unauthorized */
                401: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["dto.ErrorResponse"];
                    };
                };
                /** @description Not Found */
                404: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["dto.ErrorResponse"];
                    };
                };
                /** @description Too Many Requests */
                429: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["dto.ErrorResponse"];
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
                    /**
                     * @description Event identifier
                     * @example ev_3k7d8gb9be
                     */
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
                        "application/json": components["schemas"]["dto.ErrorResponse"];
                    };
                };
                /** @description no outcome recorded yet */
                404: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["dto.ErrorResponse"];
                    };
                };
                /** @description Too Many Requests */
                429: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["dto.ErrorResponse"];
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
                    "application/json": components["schemas"]["dto.SaveOutcomeRequest"];
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
                        "application/json": components["schemas"]["dto.ErrorResponse"];
                    };
                };
                /** @description Unauthorized */
                401: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["dto.ErrorResponse"];
                    };
                };
                /** @description Not Found */
                404: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["dto.ErrorResponse"];
                    };
                };
                /** @description Too Many Requests */
                429: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["dto.ErrorResponse"];
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
                    /**
                     * @description Event identifier
                     * @example ev_3k7d8gb9be
                     */
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
                        "*/*": components["schemas"]["dto.ErrorResponse"];
                    };
                };
                /** @description Not Found */
                404: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "*/*": components["schemas"]["dto.ErrorResponse"];
                    };
                };
                /** @description Too Many Requests */
                429: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "*/*": components["schemas"]["dto.ErrorResponse"];
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
                    /**
                     * @description Event identifier
                     * @example ev_3k7d8gb9be
                     */
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
                        "application/json": components["schemas"]["dto.ErrorResponse"];
                    };
                };
                /** @description the event is not visible to the caller */
                404: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["dto.ErrorResponse"];
                    };
                };
                /** @description Too Many Requests */
                429: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["dto.ErrorResponse"];
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
                    "application/json": components["schemas"]["dto.SaveRetrospectiveRequest"];
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
                        "application/json": components["schemas"]["dto.ErrorResponse"];
                    };
                };
                /** @description Unauthorized */
                401: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["dto.ErrorResponse"];
                    };
                };
                /** @description Not Found */
                404: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["dto.ErrorResponse"];
                    };
                };
                /** @description Too Many Requests */
                429: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["dto.ErrorResponse"];
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
                    /**
                     * @description Event identifier
                     * @example ev_3k7d8gb9be
                     */
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
                        "*/*": components["schemas"]["dto.ErrorResponse"];
                    };
                };
                /** @description Not Found */
                404: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "*/*": components["schemas"]["dto.ErrorResponse"];
                    };
                };
                /** @description Too Many Requests */
                429: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "*/*": components["schemas"]["dto.ErrorResponse"];
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
                    /**
                     * @description Event identifier
                     * @example ev_3k7d8gb9be
                     */
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
                        "application/json": components["schemas"]["dto.TaskListResponse"];
                    };
                };
                /** @description Unauthorized */
                401: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["dto.ErrorResponse"];
                    };
                };
                /** @description the event is not visible to the caller */
                404: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["dto.ErrorResponse"];
                    };
                };
                /** @description Too Many Requests */
                429: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["dto.ErrorResponse"];
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
                    "application/json": components["schemas"]["dto.CreateTaskRequest"];
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
                        "application/json": components["schemas"]["dto.ErrorResponse"];
                    };
                };
                /** @description Unauthorized */
                401: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["dto.ErrorResponse"];
                    };
                };
                /** @description Not Found */
                404: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["dto.ErrorResponse"];
                    };
                };
                /** @description the task limit for this event is reached */
                409: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["dto.ErrorResponse"];
                    };
                };
                /** @description Too Many Requests */
                429: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["dto.ErrorResponse"];
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
                    "application/json": components["schemas"]["dto.ApplyTemplateRequest"];
                };
            };
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["dto.BatchResult"];
                    };
                };
                /** @description Bad Request */
                400: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["dto.ErrorResponse"];
                    };
                };
                /** @description Unauthorized */
                401: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["dto.ErrorResponse"];
                    };
                };
                /** @description unknown template or invisible event */
                404: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["dto.ErrorResponse"];
                    };
                };
                /** @description Too Many Requests */
                429: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["dto.ErrorResponse"];
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
                        "application/json": components["schemas"]["dto.HistoryResponse"];
                    };
                };
                /** @description Bad Request */
                400: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["dto.ErrorResponse"];
                    };
                };
                /** @description Unauthorized */
                401: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["dto.ErrorResponse"];
                    };
                };
                /** @description Too Many Requests */
                429: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["dto.ErrorResponse"];
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
    "/me/notification-preferences": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Your own per-occasion notification preferences
         * @description One entry per occasion and channel pair. A missing pair defaults to enabled,
         *     so an account that never touched this endpoint keeps receiving everything
         *     its channel set already allows.
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
                        "application/json": components["schemas"]["dto.NotificationPreferencesResponse"];
                    };
                };
                /** @description Unauthorized */
                401: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["dto.ErrorResponse"];
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
    "/me/notification-preferences/{occasion}/{channel}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        /**
         * Switch one occasion off or on for one channel
         * @description This flag decides whether the occasion is sent at all, independently of the channel set
         *     in your profile: an empty channel set means no route exists anywhere, this flag means
         *     you do not want this particular notification even on a route that does exist.
         */
        put: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    /** @description Channel */
                    channel: "TELEGRAM" | "EMAIL";
                    /** @description Occasion */
                    occasion: "REGISTRATION_REQUIRED" | "REGISTRATION_REMINDER" | "REGISTRATION_OVERDUE";
                };
                cookie?: never;
            };
            /** @description Desired state */
            requestBody: {
                content: {
                    "application/json": components["schemas"]["dto.UpdateNotificationPreferenceRequest"];
                };
            };
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["dto.NotificationPreferencesResponse"];
                    };
                };
                /** @description Bad Request */
                400: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["dto.ErrorResponse"];
                    };
                };
                /** @description Unauthorized */
                401: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["dto.ErrorResponse"];
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
    "/me/profile-links": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Your own profile links
         * @description The links shown on the profile, in their display order. The kind of each link
         *     is not stored: the client derives it from the address, so a new service needs
         *     no migration.
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
                        "application/json": components["schemas"]["dto.ProfileLinkListResponse"];
                    };
                };
                /** @description Unauthorized */
                401: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["dto.ErrorResponse"];
                    };
                };
                /** @description Too Many Requests */
                429: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["dto.ErrorResponse"];
                    };
                };
            };
        };
        put?: never;
        /**
         * Add a profile link
         * @description Appends a link to the end of the list. The address must parse and use http or
         *     https; schemes that execute in the browser are rejected. The number of links
         *     per profile is bounded.
         */
        post: {
            parameters: {
                query?: never;
                header?: never;
                path?: never;
                cookie?: never;
            };
            /** @description Link */
            requestBody: {
                content: {
                    "application/json": components["schemas"]["dto.CreateProfileLinkRequest"];
                };
            };
            responses: {
                /** @description Created */
                201: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["models.ProfileLink"];
                    };
                };
                /** @description Bad Request */
                400: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["dto.ErrorResponse"];
                    };
                };
                /** @description Unauthorized */
                401: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["dto.ErrorResponse"];
                    };
                };
                /** @description the profile link limit is reached */
                409: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["dto.ErrorResponse"];
                    };
                };
                /** @description Too Many Requests */
                429: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["dto.ErrorResponse"];
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
    "/me/profile-links/{id}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post?: never;
        /** Remove a profile link */
        delete: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    /**
                     * @description Link identifier
                     * @example pf_42ej2s5gh7e8
                     */
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
                        "application/json": components["schemas"]["dto.MessageResponse"];
                    };
                };
                /** @description Unauthorized */
                401: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["dto.ErrorResponse"];
                    };
                };
                /** @description Not Found */
                404: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["dto.ErrorResponse"];
                    };
                };
                /** @description Too Many Requests */
                429: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["dto.ErrorResponse"];
                    };
                };
            };
        };
        options?: never;
        head?: never;
        /** Change a profile link */
        patch: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    /**
                     * @description Link identifier
                     * @example pf_42ej2s5gh7e8
                     */
                    id: string;
                };
                cookie?: never;
            };
            /** @description Changed fields */
            requestBody: {
                content: {
                    "application/json": components["schemas"]["dto.UpdateProfileLinkRequest"];
                };
            };
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["models.ProfileLink"];
                    };
                };
                /** @description Bad Request */
                400: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["dto.ErrorResponse"];
                    };
                };
                /** @description Unauthorized */
                401: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["dto.ErrorResponse"];
                    };
                };
                /** @description Not Found */
                404: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["dto.ErrorResponse"];
                    };
                };
                /** @description Too Many Requests */
                429: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["dto.ErrorResponse"];
                    };
                };
            };
        };
        trace?: never;
    };
    "/me/profile-links/order": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        /**
         * Reorder the profile links
         * @description Takes every link identifier of the profile exactly once, in the wanted order.
         *     A partial list is rejected, so a reorder cannot silently drop a link.
         */
        put: {
            parameters: {
                query?: never;
                header?: never;
                path?: never;
                cookie?: never;
            };
            /** @description Identifiers in display order */
            requestBody: {
                content: {
                    "application/json": components["schemas"]["dto.ReorderProfileLinksRequest"];
                };
            };
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["dto.ProfileLinkListResponse"];
                    };
                };
                /** @description Bad Request */
                400: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["dto.ErrorResponse"];
                    };
                };
                /** @description Unauthorized */
                401: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["dto.ErrorResponse"];
                    };
                };
                /** @description Not Found */
                404: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["dto.ErrorResponse"];
                    };
                };
                /** @description Too Many Requests */
                429: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["dto.ErrorResponse"];
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
         *     The response is not paginated, so the period is capped at 366 days and a wider
         *     one is rejected with 400 rather than answered with an unbounded document.
         */
        get: {
            parameters: {
                query?: {
                    /** @description Start of the period, RFC3339. Defaults to one month ago */
                    from?: string;
                    /** @description End of the period, RFC3339. Defaults to three months ahead, at most 366 days after from */
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
                        "application/json": components["schemas"]["dto.ScheduleResponse"];
                    };
                };
                /** @description Bad Request */
                400: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["dto.ErrorResponse"];
                    };
                };
                /** @description Unauthorized */
                401: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["dto.ErrorResponse"];
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
                        "application/json": components["schemas"]["dto.SessionListResponse"];
                    };
                };
                /** @description Unauthorized */
                401: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["dto.ErrorResponse"];
                    };
                };
                /** @description Too Many Requests */
                429: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["dto.ErrorResponse"];
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
                    /**
                     * @description Session identifier
                     * @example se_42ej2s5gh7e8
                     */
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
                        "application/json": components["schemas"]["dto.MessageResponse"];
                    };
                };
                /** @description Bad Request */
                400: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["dto.ErrorResponse"];
                    };
                };
                /** @description Unauthorized */
                401: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["dto.ErrorResponse"];
                    };
                };
                /** @description the session does not exist or belongs to another account */
                404: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["dto.ErrorResponse"];
                    };
                };
                /** @description Too Many Requests */
                429: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["dto.ErrorResponse"];
                    };
                };
            };
        };
        options?: never;
        head?: never;
        /**
         * Name one own session
         * @description Gives the session a label of the account holder's choosing, so a list of look-alike
         *     browsers can be told apart. The label is free text of at most 64 characters and it
         *     is stored as written: the server neither interprets it nor derives anything from it.
         *
         *     Sending clear_label drops a label set earlier and leaves the session unnamed. A
         *     request that carries neither label nor clear_label changes nothing and is refused,
         *     so an empty body cannot silently erase a name.
         *
         *     The session must belong to the caller. An identifier of somebody else's session is
         *     answered with 404 rather than 403, exactly as termination is: the very existence of
         *     another account's session must not be disclosed. Naming a session has no effect on
         *     its lifetime — it neither extends nor shortens the refresh chain.
         */
        patch: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    /**
                     * @description Session identifier
                     * @example se_42ej2s5gh7e8
                     */
                    id: string;
                };
                cookie?: never;
            };
            /** @description Changed fields */
            requestBody: {
                content: {
                    "application/json": components["schemas"]["dto.UpdateSessionRequest"];
                };
            };
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["dto.SessionResponse"];
                    };
                };
                /** @description Bad Request */
                400: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["dto.ErrorResponse"];
                    };
                };
                /** @description Unauthorized */
                401: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["dto.ErrorResponse"];
                    };
                };
                /** @description the session does not exist or belongs to another account */
                404: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["dto.ErrorResponse"];
                    };
                };
                /** @description Too Many Requests */
                429: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["dto.ErrorResponse"];
                    };
                };
            };
        };
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
                        "application/json": components["schemas"]["dto.ShortcutsResponse"];
                    };
                };
                /** @description Unauthorized */
                401: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["dto.ErrorResponse"];
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
                    "application/json": components["schemas"]["dto.UpdateShortcutsRequest"];
                };
            };
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["dto.ShortcutsResponse"];
                    };
                };
                /** @description Bad Request */
                400: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["dto.ErrorResponse"];
                    };
                };
                /** @description Unauthorized */
                401: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["dto.ErrorResponse"];
                    };
                };
                /** @description the shortcut is taken or reserved */
                409: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["dto.ErrorResponse"];
                    };
                };
                /** @description Too Many Requests */
                429: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["dto.ErrorResponse"];
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
                        "application/json": components["schemas"]["dto.ShortcutsResponse"];
                    };
                };
                /** @description Unauthorized */
                401: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["dto.ErrorResponse"];
                    };
                };
                /** @description Too Many Requests */
                429: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["dto.ErrorResponse"];
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
                    /**
                     * @description Task identifier
                     * @example tk_42ej2s5gh7e8
                     */
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
                        "*/*": components["schemas"]["dto.ErrorResponse"];
                    };
                };
                /** @description Not Found */
                404: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "*/*": components["schemas"]["dto.ErrorResponse"];
                    };
                };
                /** @description Too Many Requests */
                429: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "*/*": components["schemas"]["dto.ErrorResponse"];
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
                    /**
                     * @description Task identifier
                     * @example tk_42ej2s5gh7e8
                     */
                    id: string;
                };
                cookie?: never;
            };
            /** @description Fields to change */
            requestBody: {
                content: {
                    "application/json": components["schemas"]["dto.UpdateTaskRequest"];
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
                        "application/json": components["schemas"]["dto.ErrorResponse"];
                    };
                };
                /** @description Unauthorized */
                401: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["dto.ErrorResponse"];
                    };
                };
                /** @description the task belongs to another user */
                404: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["dto.ErrorResponse"];
                    };
                };
                /** @description Too Many Requests */
                429: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["dto.ErrorResponse"];
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
                        "application/json": components["schemas"]["dto.MessageResponse"];
                    };
                };
                /** @description Unauthorized */
                401: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["dto.ErrorResponse"];
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
                        "application/json": components["schemas"]["dto.TelegramLinkResponse"];
                    };
                };
                /** @description Unauthorized */
                401: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["dto.ErrorResponse"];
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
                        "text/plain": components["schemas"]["dto.ErrorResponse"];
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
                        "application/json": components["schemas"]["dto.QueueEntryPage"];
                    };
                };
                /** @description Bad Request */
                400: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["dto.ErrorResponse"];
                    };
                };
                /** @description Unauthorized */
                401: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["dto.ErrorResponse"];
                    };
                };
                /** @description Forbidden */
                403: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["dto.ErrorResponse"];
                    };
                };
                /** @description Too Many Requests */
                429: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["dto.ErrorResponse"];
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
         *
         *     Restricted to administrators. The counts describe the delivery backlog, which is the
         *     same class of operational detail as /ops/queue and is not something an anonymous
         *     caller may read. Container liveness probes use /healthz and /readyz instead.
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
                        "application/json": components["schemas"]["dto.WorkerHeartbeatResponse"];
                    };
                };
                /** @description Unauthorized */
                401: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["dto.ErrorResponse"];
                    };
                };
                /** @description Forbidden */
                403: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["dto.ErrorResponse"];
                    };
                };
                /** @description Service Unavailable */
                503: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["dto.WorkerHeartbeatResponse"];
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
    "/organizers": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Organizer suggestions
         * @description The distinct organiser names already used by events the caller may see, offered
         *     while an organiser is being typed. The field itself stays free text: a name that
         *     is not on the list yet remains valid, so this is a suggestion list and not a
         *     closed set of values.
         *
         *     Visibility follows the same rule as every other read. An administrator sees the
         *     organisers of all events; anyone else sees only those of published, non-archived
         *     ones, so an unpublished event is never disclosed through a suggestion.
         */
        get: {
            parameters: {
                query?: {
                    /** @description Narrow the suggestions by substring */
                    search?: string;
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
                        "application/json": components["schemas"]["dto.OrganizerSuggestions"];
                    };
                };
                /** @description Unauthorized */
                401: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["dto.ErrorResponse"];
                    };
                };
                /** @description too many catalog requests */
                429: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["dto.ErrorResponse"];
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
    "/profiles/{nickname}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Public profile by nickname
         * @description Served without authentication. A profile is visible only when its owner
         *     turned visibility on; otherwise the response is 404, so that the existence
         *     of a closed profile is not disclosed. Events are limited to published,
         *     non-archived ones that the person allowed to be shown.
         */
        get: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    /** @description Nickname without the @ sign */
                    nickname: string;
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
                        "application/json": components["schemas"]["dto.PublicProfileResponse"];
                    };
                };
                /** @description Not Found */
                404: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["dto.ErrorResponse"];
                    };
                };
                /** @description Too Many Requests */
                429: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["dto.ErrorResponse"];
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
                        "application/json": components["schemas"]["dto.ReadyResponse"];
                    };
                };
                /** @description Service Unavailable */
                503: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["dto.ReadyResponse"];
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
                        "*/*": components["schemas"]["dto.ErrorResponse"];
                    };
                };
                /** @description Forbidden */
                403: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "*/*": components["schemas"]["dto.ErrorResponse"];
                    };
                };
                /** @description Too Many Requests */
                429: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "*/*": components["schemas"]["dto.ErrorResponse"];
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
    "/team-join/{token}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Join a team through its link
         * @description Any signed-in account that holds the token joins the team as an active member. A
         *     revoked, expired or unknown token answers 404 with the same body, so the address
         *     discloses nothing about the team behind it.
         */
        post: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    /** @description Join token */
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
                        "application/json": components["schemas"]["dto.TeamDetailResponse"];
                    };
                };
                /** @description Unauthorized */
                401: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["dto.ErrorResponse"];
                    };
                };
                /** @description Not Found */
                404: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["dto.ErrorResponse"];
                    };
                };
                /** @description Conflict */
                409: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["dto.ErrorResponse"];
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
    "/team-links/{id}": {
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
         * Remove a team link
         * @description Deletes one link of the team. Any active member may remove any of them: the
         *     list belongs to the team rather than to whoever added a row.
         */
        delete: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    /**
                     * @description Link
                     * @example tl_42ej2s5gh7e8
                     */
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
                        "application/json": components["schemas"]["dto.ErrorResponse"];
                    };
                };
                /** @description Forbidden */
                403: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["dto.ErrorResponse"];
                    };
                };
                /** @description Not Found */
                404: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["dto.ErrorResponse"];
                    };
                };
            };
        };
        options?: never;
        head?: never;
        /**
         * Change a team link
         * @description Edits one link of the team. A link of a team the caller does not belong to
         *     answers 404: its existence is not disclosed.
         */
        patch: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    /**
                     * @description Link
                     * @example tl_42ej2s5gh7e8
                     */
                    id: string;
                };
                cookie?: never;
            };
            /** @description Changes */
            requestBody: {
                content: {
                    "application/json": components["schemas"]["dto.UpdateTeamEventLinkRequest"];
                };
            };
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["models.TeamEventLink"];
                    };
                };
                /** @description Bad Request */
                400: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["dto.ErrorResponse"];
                    };
                };
                /** @description Unauthorized */
                401: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["dto.ErrorResponse"];
                    };
                };
                /** @description Forbidden */
                403: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["dto.ErrorResponse"];
                    };
                };
                /** @description Not Found */
                404: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["dto.ErrorResponse"];
                    };
                };
            };
        };
        trace?: never;
    };
    "/teams": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Own teams
         * @description Teams the caller leads or belongs to, including the ones they were invited into
         *     and have not accepted yet. A team the caller left is not listed.
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
                        "application/json": components["schemas"]["dto.TeamListResponse"];
                    };
                };
                /** @description Unauthorized */
                401: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["dto.ErrorResponse"];
                    };
                };
            };
        };
        put?: never;
        /**
         * Create a team
         * @description The caller becomes the team lead and its first active member.
         */
        post: {
            parameters: {
                query?: never;
                header?: never;
                path?: never;
                cookie?: never;
            };
            /** @description Team name */
            requestBody: {
                content: {
                    "application/json": components["schemas"]["dto.CreateTeamRequest"];
                };
            };
            responses: {
                /** @description Created */
                201: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["dto.TeamDetailResponse"];
                    };
                };
                /** @description Bad Request */
                400: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["dto.ErrorResponse"];
                    };
                };
                /** @description Unauthorized */
                401: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["dto.ErrorResponse"];
                    };
                };
                /** @description Conflict */
                409: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["dto.ErrorResponse"];
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
    "/teams/{id}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Team and its members
         * @description Visible to the members of the team alone. A team the caller does not belong to
         *     answers 404: the existence of somebody else's team is not disclosed.
         */
        get: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    /**
                     * @description Team identifier
                     * @example tm_42ej2s5gh7e8
                     */
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
                        "application/json": components["schemas"]["dto.TeamDetailResponse"];
                    };
                };
                /** @description Unauthorized */
                401: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["dto.ErrorResponse"];
                    };
                };
                /** @description Not Found */
                404: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["dto.ErrorResponse"];
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
         * Rename a team
         * @description Restricted to the team lead. A member who is not the lead receives 403.
         */
        patch: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    /**
                     * @description Team identifier
                     * @example tm_42ej2s5gh7e8
                     */
                    id: string;
                };
                cookie?: never;
            };
            /** @description New name */
            requestBody: {
                content: {
                    "application/json": components["schemas"]["dto.RenameTeamRequest"];
                };
            };
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["dto.TeamDetailResponse"];
                    };
                };
                /** @description Bad Request */
                400: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["dto.ErrorResponse"];
                    };
                };
                /** @description Forbidden */
                403: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["dto.ErrorResponse"];
                    };
                };
                /** @description Not Found */
                404: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["dto.ErrorResponse"];
                    };
                };
            };
        };
        trace?: never;
    };
    "/teams/{id}/events": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Events a team entered
         * @description Every entry the team holds, each with its own roster and derived standing.
         */
        get: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    /**
                     * @description Team identifier
                     * @example tm_42ej2s5gh7e8
                     */
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
                        "application/json": components["schemas"]["dto.TeamEventEntryListResponse"];
                    };
                };
                /** @description Unauthorized */
                401: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["dto.ErrorResponse"];
                    };
                };
                /** @description Not Found */
                404: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["dto.ErrorResponse"];
                    };
                };
            };
        };
        put?: never;
        /**
         * Enter a hackathon as a team
         * @description Restricted to the team lead. Only a published, non-archived event of kind HACKATHON
         *     accepts a team entry. The entry starts with an empty roster: the lead then draws a
         *     lineup for this event from the team's active members, and the team's size limits
         *     apply to that lineup, not to the whole team. Entering registers nobody: registration
         *     stays the self-report of each member and the system never checks the external site.
         *     An event that has already finished no longer accepts an entry and is refused with
         *     409 invalid_state_transition.
         *     A track may be chosen here when the hackathon declares any; the choice is optional
         *     and can be changed until the event starts.
         */
        post: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    /**
                     * @description Team identifier
                     * @example tm_42ej2s5gh7e8
                     */
                    id: string;
                };
                cookie?: never;
            };
            /** @description Event to enter */
            requestBody: {
                content: {
                    "application/json": components["schemas"]["dto.EnterEventRequest"];
                };
            };
            responses: {
                /** @description Created */
                201: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["dto.TeamEventEntryResponse"];
                    };
                };
                /** @description Bad Request */
                400: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["dto.ErrorResponse"];
                    };
                };
                /** @description Forbidden */
                403: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["dto.ErrorResponse"];
                    };
                };
                /** @description Not Found */
                404: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["dto.ErrorResponse"];
                    };
                };
                /** @description Conflict */
                409: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["dto.ErrorResponse"];
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
    "/teams/{id}/events/{event_id}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Team standing on an event
         * @description `registered` is derived, never stored: the team counts as registered once the number
         *     of roster members who reported their own registration reaches the event's
         *     `team_size_min`. Team members outside this event's roster do not count towards it.
         *     An event without `team_size_min` has no threshold and is never derived registered.
         *     Every count is a self-report, not a verified fact.
         */
        get: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    /**
                     * @description Event identifier
                     * @example ev_gma9hq8a96q5
                     */
                    event_id: string;
                    /**
                     * @description Team identifier
                     * @example tm_42ej2s5gh7e8
                     */
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
                        "application/json": components["schemas"]["dto.TeamEventEntryResponse"];
                    };
                };
                /** @description Unauthorized */
                401: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["dto.ErrorResponse"];
                    };
                };
                /** @description Not Found */
                404: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["dto.ErrorResponse"];
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
    "/teams/{id}/events/{event_id}/links": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * The team's own links for one hackathon
         * @description Links the team keeps beside its entry into one hackathon: the repository, the
         *     board, the deployed demo. They belong to the team, not to a person, and only
         *     the team can read them. Somebody outside the team gets 404 for the entry, so
         *     no list discloses that a rival team even entered.
         *
         *     The kind of a link is not stored: the client derives the service from the
         *     address, exactly as it does for profile links, so a new service needs no
         *     migration. `can_write` says whether the caller may change the list: an active
         *     member may, somebody still holding an unaccepted invitation may not.
         */
        get: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    /** @description Event */
                    event_id: string;
                    /** @description Team */
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
                        "application/json": components["schemas"]["dto.TeamEventLinkListResponse"];
                    };
                };
                /** @description Unauthorized */
                401: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["dto.ErrorResponse"];
                    };
                };
                /** @description the team or its entry is not visible to the caller */
                404: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["dto.ErrorResponse"];
                    };
                };
            };
        };
        put?: never;
        /**
         * Add a team link to a hackathon
         * @description Appends a link to the end of the team's list for this entry. Any active member
         *     may add one, the lead included; an invitation that has not been accepted grants
         *     no write. The address must parse and use http or https, so a scheme that
         *     executes in the browser or hands the address to an operating system handler is
         *     rejected. HTTPS is not required. The number of links per entry is bounded.
         */
        post: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    /** @description Event */
                    event_id: string;
                    /** @description Team */
                    id: string;
                };
                cookie?: never;
            };
            /** @description Link */
            requestBody: {
                content: {
                    "application/json": components["schemas"]["dto.CreateTeamEventLinkRequest"];
                };
            };
            responses: {
                /** @description Created */
                201: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["models.TeamEventLink"];
                    };
                };
                /** @description Bad Request */
                400: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["dto.ErrorResponse"];
                    };
                };
                /** @description Unauthorized */
                401: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["dto.ErrorResponse"];
                    };
                };
                /** @description the caller is not an active member */
                403: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["dto.ErrorResponse"];
                    };
                };
                /** @description Not Found */
                404: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["dto.ErrorResponse"];
                    };
                };
                /** @description the link limit for this entry is reached */
                409: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["dto.ErrorResponse"];
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
    "/teams/{id}/events/{event_id}/links/order": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        /**
         * Reorder the team links of a hackathon
         * @description Replaces the display order. Every link of the entry must be listed exactly
         *     once, so a stale client cannot silently drop a row somebody else added.
         */
        put: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    /** @description Event */
                    event_id: string;
                    /** @description Team */
                    id: string;
                };
                cookie?: never;
            };
            /** @description Wanted order */
            requestBody: {
                content: {
                    "application/json": components["schemas"]["dto.ReorderTeamEventLinksRequest"];
                };
            };
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["dto.TeamEventLinkListResponse"];
                    };
                };
                /** @description Bad Request */
                400: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["dto.ErrorResponse"];
                    };
                };
                /** @description Unauthorized */
                401: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["dto.ErrorResponse"];
                    };
                };
                /** @description Forbidden */
                403: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["dto.ErrorResponse"];
                    };
                };
                /** @description Not Found */
                404: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["dto.ErrorResponse"];
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
    "/teams/{id}/events/{event_id}/roster/{user_id}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        /**
         * Put a team member on the event roster
         * @description Restricted to the team lead. The lineup for an event is drawn from the team's active
         *     members and may be smaller than the team. The event's `team_size_max` caps the
         *     lineup and a further addition is refused with `roster_full`; `team_size_min` is only
         *     the threshold of the derived registered state and never blocks an addition, so an
         *     under-filled lineup is allowed while it is being assembled.
         */
        put: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    /**
                     * @description Event identifier
                     * @example ev_gma9hq8a96q5
                     */
                    event_id: string;
                    /**
                     * @description Team identifier
                     * @example tm_42ej2s5gh7e8
                     */
                    id: string;
                    /**
                     * @description User identifier
                     * @example us_42ej2s5gh7e8
                     */
                    user_id: string;
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
                        "application/json": components["schemas"]["dto.TeamEventEntryResponse"];
                    };
                };
                /** @description Unauthorized */
                401: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["dto.ErrorResponse"];
                    };
                };
                /** @description Forbidden */
                403: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["dto.ErrorResponse"];
                    };
                };
                /** @description Not Found */
                404: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["dto.ErrorResponse"];
                    };
                };
                /** @description Conflict */
                409: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["dto.ErrorResponse"];
                    };
                };
            };
        };
        post?: never;
        /**
         * Take a team member off the event roster
         * @description Restricted to the team lead. The member stays in the team; only this event's lineup
         *     loses them. Their personal registration status on the event is left untouched.
         */
        delete: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    /**
                     * @description Event identifier
                     * @example ev_gma9hq8a96q5
                     */
                    event_id: string;
                    /**
                     * @description Team identifier
                     * @example tm_42ej2s5gh7e8
                     */
                    id: string;
                    /**
                     * @description User identifier
                     * @example us_42ej2s5gh7e8
                     */
                    user_id: string;
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
                        "application/json": components["schemas"]["dto.TeamEventEntryResponse"];
                    };
                };
                /** @description Unauthorized */
                401: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["dto.ErrorResponse"];
                    };
                };
                /** @description Forbidden */
                403: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["dto.ErrorResponse"];
                    };
                };
                /** @description Not Found */
                404: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["dto.ErrorResponse"];
                    };
                };
            };
        };
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/teams/{id}/events/{event_id}/roster/{user_id}/registration/done": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Mark a roster member as registered
         * @description Restricted to the team lead, and only for a member on this event's own roster. It
         *     writes the same personal registration status the member writes themselves, so the
         *     value stays a self-report relayed by the lead rather than a verified fact; the audit
         *     log records who marked whom.
         */
        post: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    /**
                     * @description Event identifier
                     * @example ev_gma9hq8a96q5
                     */
                    event_id: string;
                    /**
                     * @description Team identifier
                     * @example tm_42ej2s5gh7e8
                     */
                    id: string;
                    /**
                     * @description User identifier
                     * @example us_42ej2s5gh7e8
                     */
                    user_id: string;
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
                        "application/json": components["schemas"]["dto.TeamEventEntryResponse"];
                    };
                };
                /** @description Unauthorized */
                401: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["dto.ErrorResponse"];
                    };
                };
                /** @description Forbidden */
                403: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["dto.ErrorResponse"];
                    };
                };
                /** @description Not Found */
                404: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["dto.ErrorResponse"];
                    };
                };
                /** @description Conflict */
                409: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["dto.ErrorResponse"];
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
    "/teams/{id}/events/{event_id}/track": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        /**
         * Choose the team's track
         * @description Restricted to the team lead. The choice is optional: an empty track_id clears it.
         *     It can be changed until the event starts; afterwards the request is refused with
         *     409 invalid_state_transition and nothing is written. Deleting a track leaves every
         *     entry that had chosen it in place, with the choice unset.
         */
        put: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    /**
                     * @description Event identifier
                     * @example ev_gma9hq8a96q5
                     */
                    event_id: string;
                    /**
                     * @description Team identifier
                     * @example tm_42ej2s5gh7e8
                     */
                    id: string;
                };
                cookie?: never;
            };
            /** @description Track to compete in */
            requestBody: {
                content: {
                    "application/json": components["schemas"]["dto.ChooseTrackRequest"];
                };
            };
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["dto.TeamEventEntryResponse"];
                    };
                };
                /** @description Bad Request */
                400: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["dto.ErrorResponse"];
                    };
                };
                /** @description Forbidden */
                403: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["dto.ErrorResponse"];
                    };
                };
                /** @description Not Found */
                404: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["dto.ErrorResponse"];
                    };
                };
                /** @description Conflict */
                409: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["dto.ErrorResponse"];
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
    "/teams/{id}/invitations": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Invite a user into the team
         * @description Restricted to the team lead. The person is named by exactly one of `user_id`, `nickname`
         *     and `email`, and must already have an account: a platform invitation to somebody who is
         *     not registered yet is an administrator operation, so an address nobody uses answers 404
         *     with the same body an unknown nickname gets. The invitation lands in the INVITED state
         *     and the invited person accepts it themselves.
         */
        post: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    /**
                     * @description Team identifier
                     * @example tm_42ej2s5gh7e8
                     */
                    id: string;
                };
                cookie?: never;
            };
            /** @description Person to invite, named one way */
            requestBody: {
                content: {
                    "application/json": components["schemas"]["dto.InviteTeamMemberRequest"];
                };
            };
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["dto.TeamDetailResponse"];
                    };
                };
                /** @description Bad Request */
                400: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["dto.ErrorResponse"];
                    };
                };
                /** @description Forbidden */
                403: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["dto.ErrorResponse"];
                    };
                };
                /** @description Not Found */
                404: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["dto.ErrorResponse"];
                    };
                };
                /** @description Conflict */
                409: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["dto.ErrorResponse"];
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
    "/teams/{id}/join-link": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * The team's join link
         * @description Restricted to the team lead. It reports whether a link is active and when it expires;
         *     the token itself is issued once, at rotation, and is never returned again or written
         *     to the log.
         */
        get: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    /**
                     * @description Team identifier
                     * @example tm_42ej2s5gh7e8
                     */
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
                        "application/json": components["schemas"]["dto.TeamJoinLinkResponse"];
                    };
                };
                /** @description Unauthorized */
                401: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["dto.ErrorResponse"];
                    };
                };
                /** @description Forbidden */
                403: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["dto.ErrorResponse"];
                    };
                };
                /** @description Not Found */
                404: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["dto.ErrorResponse"];
                    };
                };
            };
        };
        put?: never;
        /**
         * Issue or rotate the join link
         * @description Restricted to the team lead. A team holds at most one usable link: rotating revokes
         *     the previous one, so a leaked address stops working the moment a new one is issued.
         *     The token is returned exactly once in this response and only its hash is stored.
         *     Anyone signed in who opens the link joins the team as an active member immediately.
         */
        post: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    /**
                     * @description Team identifier
                     * @example tm_42ej2s5gh7e8
                     */
                    id: string;
                };
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
                        "application/json": components["schemas"]["dto.TeamJoinLinkSecretResponse"];
                    };
                };
                /** @description Unauthorized */
                401: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["dto.ErrorResponse"];
                    };
                };
                /** @description Forbidden */
                403: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["dto.ErrorResponse"];
                    };
                };
                /** @description Not Found */
                404: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["dto.ErrorResponse"];
                    };
                };
            };
        };
        /**
         * Revoke the join link
         * @description Restricted to the team lead. The address stops working at once and the team is left
         *     without a link until the lead issues a new one.
         */
        delete: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    /**
                     * @description Team identifier
                     * @example tm_42ej2s5gh7e8
                     */
                    id: string;
                };
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description No Content */
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
                        "application/json": components["schemas"]["dto.ErrorResponse"];
                    };
                };
                /** @description Forbidden */
                403: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["dto.ErrorResponse"];
                    };
                };
                /** @description Not Found */
                404: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["dto.ErrorResponse"];
                    };
                };
            };
        };
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/teams/{id}/members/{user_id}": {
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
         * Remove a member from the team
         * @description Restricted to the team lead. The lead cannot remove themselves.
         */
        delete: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    /**
                     * @description Team identifier
                     * @example tm_42ej2s5gh7e8
                     */
                    id: string;
                    /**
                     * @description User identifier
                     * @example us_42ej2s5gh7e8
                     */
                    user_id: string;
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
                        "application/json": components["schemas"]["dto.TeamDetailResponse"];
                    };
                };
                /** @description Forbidden */
                403: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["dto.ErrorResponse"];
                    };
                };
                /** @description Not Found */
                404: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["dto.ErrorResponse"];
                    };
                };
                /** @description Conflict */
                409: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["dto.ErrorResponse"];
                    };
                };
            };
        };
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/teams/{id}/membership": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Accept an invitation
         * @description The invited user turns their own INVITED membership into ACTIVE. Accepting twice
         *     is not an error.
         */
        post: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    /**
                     * @description Team identifier
                     * @example tm_42ej2s5gh7e8
                     */
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
                        "application/json": components["schemas"]["dto.TeamDetailResponse"];
                    };
                };
                /** @description Unauthorized */
                401: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["dto.ErrorResponse"];
                    };
                };
                /** @description Not Found */
                404: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["dto.ErrorResponse"];
                    };
                };
            };
        };
        /**
         * Leave a team
         * @description The caller leaves the team themselves. The team lead cannot leave their own team.
         */
        delete: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    /**
                     * @description Team identifier
                     * @example tm_42ej2s5gh7e8
                     */
                    id: string;
                };
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description No Content */
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
                        "application/json": components["schemas"]["dto.ErrorResponse"];
                    };
                };
                /** @description Not Found */
                404: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["dto.ErrorResponse"];
                    };
                };
                /** @description Conflict */
                409: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["dto.ErrorResponse"];
                    };
                };
            };
        };
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/telegram/webhook": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Telegram linking webhook
         * @description Consumes a one-time /start token and binds the Telegram chat to its Timeline account.
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
                    content?: never;
                };
                /** @description Bad Request */
                400: {
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
                    content?: never;
                };
            };
        };
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
        "dto.AcceptInviteRequest": {
            /** @example John */
            first_name?: string;
            /** @example Smith */
            last_name?: string;
            /** @example Fitzgerald */
            middle_name?: string;
            /** @example jsmith */
            nickname: string;
            /** @example correct-horse-battery */
            password?: string;
            /** @example abc123 */
            token?: string;
        };
        "dto.AddParticipantItem": {
            /** @example Developer */
            team_role: string;
            /** @example us_42ej2s5gh7e8 */
            user_id: string;
        };
        "dto.AddParticipantsRequest": {
            items?: components["schemas"]["dto.AddParticipantItem"][];
        };
        "dto.AdminChangeStatusRequest": {
            note?: string;
            status?: components["schemas"]["models.RegistrationStatusValue"];
        };
        "dto.ApplyTemplateRequest": {
            /** @example preparation */
            template_id?: string;
        };
        "dto.ArtifactListResponse": {
            items: components["schemas"]["models.ParticipantArtifact"][];
        };
        "dto.AuditPage": {
            items: components["schemas"]["dto.AuditResponse"][];
            meta: components["schemas"]["dto.PageMeta"];
        };
        "dto.AuditResponse": {
            action: components["schemas"]["models.AuditAction"];
            actor_email?: string;
            /** @example us_3k7d8gb9be */
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
        "dto.AuthResponse": {
            /** Format: date-time */
            access_expires_at: string;
            /** Format: date-time */
            refresh_expires_at: string;
            user: components["schemas"]["dto.MeResponse"];
        };
        "dto.BatchItemResult": {
            /** @example already_assigned */
            code?: string;
            /** @example pa_42ej2s5gh7e8 */
            id?: string;
            /** @example 0 */
            index: number;
            /** @example pa_42ej2s5gh7e8 */
            key?: string;
            /** @example the participant is already assigned */
            message?: string;
            /**
             * @example ok
             * @enum {string}
             */
            status: "ok" | "skipped" | "error";
        };
        "dto.BatchResult": {
            /** @example 0 */
            failed: number;
            results: components["schemas"]["dto.BatchItemResult"][];
            /** @example 1 */
            skipped: number;
            /** @example 2 */
            succeeded: number;
        };
        "dto.BatchSetStatusRequest": {
            note?: string;
            /**
             * @example [
             *       "pa_42ej2s5gh7e8"
             *     ]
             */
            participant_ids?: string[];
            status?: components["schemas"]["models.RegistrationStatusValue"];
        };
        "dto.CatalogEvent": {
            /** @example Moscow */
            city?: string;
            color?: components["schemas"]["models.EventColor"];
            /** @example RU */
            country_code?: string;
            /** @example /api/v1/covers/abc.png */
            cover_url?: string;
            description?: string;
            effective_format: components["schemas"]["models.EventFormat"];
            /** Format: date-time */
            end_at: string;
            format: components["schemas"]["models.EventFormat"];
            /** @example ev_gma9hq8a96q5 */
            id: string;
            /** @example false */
            joined: boolean;
            kind: components["schemas"]["models.EventKind"];
            offline_stages: components["schemas"]["dto.CatalogPlace"][];
            /** @example Organising committee */
            organizer?: string;
            origin: components["schemas"]["models.EventOrigin"];
            /** @example RUB */
            prize_currency?: string;
            /** @example 500000.00 */
            prize_pool?: string;
            /** Format: date-time */
            registration_deadline?: string;
            registration_status?: components["schemas"]["dto.RegistrationStatusShort"];
            registration_url?: string;
            /** Format: date-time */
            start_at: string;
            state: components["schemas"]["models.EventState"];
            /** @example Developer */
            team_role?: string;
            /** @example 5 */
            team_size_max?: number;
            /** @example 3 */
            team_size_min?: number;
            /** @example National event */
            title: string;
            tracks: components["schemas"]["dto.EventTrackSummary"][];
            /** @example https://example.com */
            website_url?: string;
        };
        "dto.CatalogPage": {
            items: components["schemas"]["dto.CatalogEvent"][];
            meta: components["schemas"]["dto.PageMeta"];
        };
        "dto.CatalogPlace": {
            /** Format: date-time */
            end_at: string;
            /** @example st_42ej2s5gh7e8 */
            id: string;
            /** @example Final */
            name: string;
            place: components["schemas"]["models.Place"];
            /** Format: date-time */
            start_at: string;
            type: components["schemas"]["models.StageType"];
        };
        "dto.ChangeEmailRequest": {
            /** @example new@example.com */
            new_email?: string;
            /** @example correct-horse-battery */
            password?: string;
        };
        "dto.ChangePasswordRequest": {
            /** @example correct-horse-battery */
            current_password?: string;
            /** @example another-horse-battery-staple */
            new_password?: string;
        };
        "dto.ChooseTrackRequest": {
            /** @example tr_42ej2s5gh7e8 */
            track_id?: string;
        };
        "dto.CopyParticipantsRequest": {
            overrides?: components["schemas"]["dto.CopyRoleOverride"][];
            /** @example ev_gma9hq8a96q5 */
            source_event_id?: string;
        };
        "dto.CopyRoleOverride": {
            /** @example Mentor */
            team_role: string;
            /** @example us_42ej2s5gh7e8 */
            user_id: string;
        };
        "dto.CreateArtifactRequest": {
            kind?: components["schemas"]["models.ArtifactKind"];
            /** @example 0 */
            sort_order?: number;
            /** @example Project repository */
            title?: string;
            /** @example https://github.com/example/project */
            url?: string;
        };
        "dto.CreateEventCaseRequest": {
            /** @example 1 */
            case_no?: number;
            description?: string;
            /** @example Traffic light scheduling */
            name?: string;
            /** @example City transport authority */
            partner?: string;
            /** @example 50000 */
            prize_amount?: string;
            /** @example tr_42ej2s5gh7e8 */
            track_id?: string;
        };
        "dto.CreateEventRequest": {
            /** @example Moscow */
            city?: string;
            /** @example RU */
            country_code?: string;
            description?: string;
            /** Format: date-time */
            end_at?: string;
            format?: components["schemas"]["models.EventFormat"];
            kind?: components["schemas"]["models.EventKind"];
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
            /** @example 3 */
            team_size_min?: number;
            /** @example National event */
            title?: string;
            /** @example https://example.com */
            website_url?: string;
        };
        "dto.CreateEventTrackRequest": {
            description?: string;
            /** @example Smart city */
            name?: string;
            prizes?: components["schemas"]["dto.TrackPrizeInput"][];
            /** @example 1 */
            track_no?: number;
        };
        "dto.CreateInviteRequest": {
            /** @example new@example.com */
            email?: string;
        };
        "dto.CreateInviteResponse": {
            /** @example https://tracker.local/invite/abc123 */
            accept_link: string;
            invite: components["schemas"]["dto.InviteResponse"];
        };
        "dto.CreateProfileLinkRequest": {
            /** @example My repositories */
            label?: string;
            /** @example https://github.com/ivan */
            url?: string;
        };
        "dto.CreateRegistrationRequest": {
            /** Format: date-time */
            deadline_at?: string;
            description?: string;
            /** @example https://example.com/register */
            url?: string;
        };
        "dto.CreateResourceLinkRequest": {
            /** @example false */
            is_pinned?: boolean;
            /** @example RULES */
            kind?: string;
            /** @example 0 */
            sort_order?: number;
            /** @example st_42ej2s5gh7e8 */
            stage_id?: string;
            /** @example Rules and code of conduct */
            title?: string;
            /** @example https://example.org/rules */
            url?: string;
        };
        "dto.CreateRuleRequest": {
            /** @example true */
            enabled?: boolean;
            /** @example 1440 */
            offset_minutes?: number;
            /** @example 1 */
            slot_no?: number;
        };
        "dto.CreateStageRequest": {
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
        "dto.CreateTaskRequest": {
            /** Format: date-time */
            due_at?: string;
            notes?: string;
            /** @example 0 */
            sort_order?: number;
            /** @example st_42ej2s5gh7e8 */
            stage_id?: string;
            /** @example Record the demo video */
            title?: string;
        };
        "dto.CreateTeamEventLinkRequest": {
            /** @example Our repository */
            label?: string;
            /** @example https://github.com/team/project */
            url?: string;
        };
        "dto.CreateTeamRequest": {
            /** @example Night shift */
            name?: string;
        };
        "dto.CSRFResponse": {
            /** @example 0f2a5c8d1b3e4f60 */
            csrf_token: string;
            /** @example X-CSRF-Token */
            header_name: string;
        };
        "dto.DeadlineItem": {
            /** Format: date-time */
            deadline_at: string;
            /** @example ev_gma9hq8a96q5 */
            event_id: string;
            event_title: string;
            /** @example 120 */
            overdue_minutes?: number;
            /** @example pa_42ej2s5gh7e8 */
            participant_id: string;
            status: components["schemas"]["models.RegistrationStatusValue"];
            user: components["schemas"]["dto.UserSummary"];
        };
        "dto.DeadlinePage": {
            items: components["schemas"]["dto.DeadlineItem"][];
            meta: components["schemas"]["dto.PageMeta"];
        };
        "dto.EmailRequest": {
            /** @example ivan@example.com */
            email?: string;
        };
        "dto.EnterEventRequest": {
            /** @example ev_gma9hq8a96q5 */
            event_id?: string;
            /** @example tr_42ej2s5gh7e8 */
            track_id?: string;
        };
        "dto.ErrorBody": {
            /** @example validation_failed */
            code: string;
            fields?: components["schemas"]["models.FieldError"][];
            /** @example invalid request data */
            message: string;
            /** @example 01HZY0Q2K7 */
            request_id: string;
        };
        "dto.ErrorResponse": {
            error: components["schemas"]["dto.ErrorBody"];
        };
        "dto.EventCard": {
            /** @example true */
            can_mark_done: boolean;
            event: components["schemas"]["dto.EventResponse"];
            next_stage?: components["schemas"]["dto.StageShort"];
            registration?: components["schemas"]["dto.RegistrationPublic"];
            registration_status?: components["schemas"]["dto.RegistrationStatusShort"];
            stages: components["schemas"]["dto.StageResponse"][];
            /** @example Developer */
            team_role?: string;
        };
        "dto.EventCaseListResponse": {
            items: components["schemas"]["dto.EventCaseResponse"][];
        };
        "dto.EventCaseResponse": {
            /** @example 1 */
            case_no: number;
            /** Format: date-time */
            created_at: string;
            description: string;
            /** @example ev_gma9hq8a96q5 */
            event_id: string;
            /** @example cs_42ej2s5gh7e8 */
            id: string;
            /** @example Traffic light scheduling */
            name: string;
            /** @example City transport authority */
            partner: string;
            /** @example 50000 */
            prize_amount: string;
            /** @example tr_42ej2s5gh7e8 */
            track_id: string;
            /** @example Smart city */
            track_name: string;
            /** Format: date-time */
            updated_at: string;
        };
        "dto.EventFinanceResponse": {
            cases: components["schemas"]["dto.FinanceCase"][];
            /** @example 50000 */
            discrepancy: string;
            /** @example true */
            discrepancy_known: boolean;
            /** @example 450000 */
            distributed: string;
            /** @example 50000 */
            distributed_cases: string;
            /** @example 400000 */
            distributed_tracks: string;
            /** @example ev_gma9hq8a96q5 */
            event_id: string;
            /** @example 50000 */
            nominations: string;
            /** @example RUB */
            prize_currency: string;
            /** @example 500000 */
            prize_pool: string;
            tracks: components["schemas"]["dto.FinanceTrack"][];
            /** @example 50000 */
            unallocated: string;
        };
        "dto.EventPage": {
            items: components["schemas"]["dto.EventResponse"][];
            meta: components["schemas"]["dto.PageMeta"];
        };
        "dto.EventResponse": {
            /** Format: date-time */
            archived_at?: string;
            /** @example Moscow */
            city?: string;
            color?: components["schemas"]["models.EventColor"];
            /** @example RU */
            country_code?: string;
            cover_source?: components["schemas"]["models.CoverSource"];
            /** @example /api/v1/covers/abc.png */
            cover_url?: string;
            /** Format: date-time */
            created_at: string;
            description?: string;
            effective_format: components["schemas"]["models.EventFormat"];
            /** Format: date-time */
            end_at: string;
            format: components["schemas"]["models.EventFormat"];
            /** @example ev_gma9hq8a96q5 */
            id: string;
            kind: components["schemas"]["models.EventKind"];
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
            purge_scheduled_at?: string;
            /** Format: date-time */
            start_at: string;
            state: components["schemas"]["models.EventState"];
            /** @example 5 */
            team_size_max?: number;
            /** @example 3 */
            team_size_min?: number;
            /** @example National event */
            title: string;
            tracks: components["schemas"]["dto.EventTrackSummary"][];
            /** Format: date-time */
            updated_at: string;
            /** @example https://example.com */
            website_url?: string;
        };
        "dto.EventTrackListResponse": {
            /** @example 450000 */
            distributed: string;
            items: components["schemas"]["dto.EventTrackResponse"][];
            /** @example 50000 */
            nominations: string;
            /** @example RUB */
            prize_currency: string;
            /** @example 500000 */
            prize_pool: string;
            /** @example 50000 */
            unallocated: string;
        };
        "dto.EventTrackResponse": {
            /** Format: date-time */
            created_at: string;
            description?: string;
            /** @example ev_gma9hq8a96q5 */
            event_id: string;
            /** @example tr_42ej2s5gh7e8 */
            id: string;
            /** @example Smart city */
            name: string;
            /** @example 300000 */
            prize_total: string;
            prizes: components["schemas"]["dto.TrackPrizeResponse"][];
            /** @example 1 */
            track_no: number;
            /** Format: date-time */
            updated_at: string;
        };
        "dto.EventTrackSummary": {
            /** @example tr_42ej2s5gh7e8 */
            id: string;
            /** @example Smart city */
            name: string;
            /** @example 300000 */
            prize_total: string;
            /** @example 1 */
            track_no: number;
        };
        "dto.FinanceCase": {
            /** @example 1 */
            case_no: number;
            /** @example cs_42ej2s5gh7e8 */
            id: string;
            /** @example Traffic light scheduling */
            name: string;
            /** @example City transport authority */
            partner: string;
            /** @example 50000 */
            prize_amount: string;
            /** @example tr_42ej2s5gh7e8 */
            track_id: string;
            /** @example Smart city */
            track_name: string;
        };
        "dto.FinanceTrack": {
            /** @example tr_42ej2s5gh7e8 */
            id: string;
            /** @example Smart city */
            name: string;
            /** @example 300000 */
            prize_total: string;
            prizes: components["schemas"]["dto.FinanceTrackPrize"][];
            /** @example 1 */
            track_no: number;
        };
        "dto.FinanceTrackPrize": {
            /** @example 150000 */
            amount: string;
            /** @example 1 */
            place: number;
            /** @example Best design */
            title: string;
        };
        "dto.HealthResponse": {
            /** @example ok */
            status: string;
            /** Format: date-time */
            time: string;
        };
        "dto.HistoryItem": {
            artifacts: components["schemas"]["models.ParticipantArtifact"][];
            /** Format: date-time */
            end_at: string;
            /** @example ev_gma9hq8a96q5 */
            event_id: string;
            /** @example true */
            joined: boolean;
            kind: components["schemas"]["models.EventKind"];
            outcome?: components["schemas"]["models.ParticipantOutcome"];
            /** Format: date-time */
            start_at: string;
            /** @example 9 */
            tasks_done: number;
            /** @example 12 */
            tasks_total: number;
            /** @example Backend developer */
            team_role?: string;
            /** @example National event */
            title: string;
        };
        "dto.HistoryResponse": {
            items: components["schemas"]["dto.HistoryItem"][];
            meta: components["schemas"]["dto.PageMeta"];
        };
        "dto.InvitePage": {
            items: components["schemas"]["dto.InviteResponse"][];
            meta: components["schemas"]["dto.PageMeta"];
        };
        "dto.InvitePreview": {
            /** @example new@example.com */
            email?: string;
            /** Format: date-time */
            expires_at?: string;
            /** @example true */
            valid: boolean;
        };
        "dto.InviteResponse": {
            /** Format: date-time */
            accepted_at?: string;
            /** Format: date-time */
            created_at: string;
            /** @example us_42ej2s5gh7e8 */
            created_by_user_id: string;
            /** @example new@example.com */
            email: string;
            /** Format: date-time */
            expires_at: string;
            /** @example in_42ej2s5gh7e8 */
            id: string;
            /** Format: date-time */
            revoked_at?: string;
        };
        "dto.InviteTeamMemberRequest": {
            /** @example ivan@example.com */
            email?: string;
            /** @example jsmith */
            nickname?: string;
            /** @example us_42ej2s5gh7e8 */
            user_id?: string;
        };
        "dto.JoinEventRequest": {
            /** @example Backend developer */
            team_role?: string;
        };
        "dto.LoginRequest": {
            /** @example ivan@example.com */
            email?: string;
            /** @example correct-horse-battery */
            password?: string;
        };
        "dto.MarkReadRequest": {
            /**
             * @example [
             *       "sy_42ej2s5gh7e8"
             *     ]
             */
            ids?: string[];
        };
        "dto.MeResponse": {
            /** @example /api/v1/avatars/ab12cd34.png */
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
            /** @example John */
            first_name: string;
            /** @example us_42ej2s5gh7e8 */
            id: string;
            /** @example true */
            is_active: boolean;
            /** @example false */
            is_admin: boolean;
            /** @example Smith */
            last_name: string;
            /** @example John Smith */
            legacy_display_name?: string;
            /**
             * @example ru
             * @enum {string}
             */
            locale: "ru" | "en";
            /** @example Fitzgerald */
            middle_name?: string;
            /** @example jsmith */
            nickname?: string;
            notification_channels: components["schemas"]["models.Channel"][];
            pending_email?: string;
            /** @example false */
            profile_public: boolean;
            shortcuts: components["schemas"]["models.Shortcuts"];
            /** @example false */
            telegram_linked: boolean;
            telegram_username?: string;
            /** @example Europe/Moscow */
            timezone: string;
            /** Format: date-time */
            updated_at: string;
        };
        "dto.MessageResponse": {
            /** @example operation completed */
            message: string;
        };
        "dto.MyEventItem": {
            color: components["schemas"]["models.EventColor"];
            /** Format: date-time */
            end_at: string;
            /** @example ev_gma9hq8a96q5 */
            id: string;
            next_stage?: components["schemas"]["dto.StageShort"];
            organizer?: string;
            /** Format: date-time */
            registration_deadline?: string;
            registration_status?: components["schemas"]["dto.RegistrationStatusShort"];
            registration_url?: string;
            /** Format: date-time */
            start_at: string;
            state: components["schemas"]["models.EventState"];
            /** @example Developer */
            team_role: string;
            /** @example National event */
            title: string;
        };
        "dto.MyEventPage": {
            items: components["schemas"]["dto.MyEventItem"][];
            meta: components["schemas"]["dto.PageMeta"];
        };
        "dto.NotificationPreferencesResponse": {
            preferences: components["schemas"]["models.NotificationPreference"][];
        };
        "dto.NotificationPreviewResponse": {
            body: string;
            /** @example true */
            channel_ready: boolean;
            channels: components["schemas"]["models.Channel"][];
            /** @example 14.09.2026 18:00 */
            deadline_local: string;
            deadline_utc: string;
            /** @example Autumn hackathon */
            event_title: string;
            /** @example ru */
            language: string;
            /** @example https://example.com/register */
            registration_url: string;
            /** @example nr_42ej2s5gh7e8 */
            rule_id: string;
            /** Format: date-time */
            scheduled_at: string;
            /** @example Timeline: register for the event */
            subject: string;
            /** @example Europe/Moscow */
            timezone_id: string;
            type: components["schemas"]["models.NotificationType"];
        };
        "dto.NotificationRuleResponse": {
            /** Format: date-time */
            created_at: string;
            /** @example true */
            enabled: boolean;
            /** @example nr_42ej2s5gh7e8 */
            id: string;
            /** @example 1440 */
            offset_minutes: number;
            /** @example rg_42ej2s5gh7e8 */
            registration_id: string;
            /** @example 1 */
            slot_no: number;
            type: components["schemas"]["models.NotificationType"];
            /** Format: date-time */
            updated_at: string;
        };
        "dto.OrganizerSuggestions": {
            /**
             * @example [
             *       "lablab.ai",
             *       "WeMakeDevs"
             *     ]
             */
            items: string[];
        };
        "dto.PageMeta": {
            /** @example true */
            has_next: boolean;
            /** @example 1 */
            page: number;
            /** @example 50 */
            page_size: number;
            /** @example 137 */
            total: number;
        };
        "dto.ParticipantPage": {
            items: components["schemas"]["dto.ParticipantResponse"][];
            meta: components["schemas"]["dto.PageMeta"];
        };
        "dto.ParticipantResponse": {
            /** Format: date-time */
            assigned_at: string;
            /** @example 1 */
            assignment_version: number;
            /** @example ev_gma9hq8a96q5 */
            event_id: string;
            /** @example pa_42ej2s5gh7e8 */
            id: string;
            participation_status: components["schemas"]["models.ParticipationStatus"];
            registration_status?: components["schemas"]["dto.RegistrationStatusShort"];
            /** Format: date-time */
            removed_at?: string;
            /** @example Developer */
            team_role: string;
            user: components["schemas"]["dto.UserSummary"];
        };
        "dto.ParticipantSelfResponse": {
            /** Format: date-time */
            assigned_at: string;
            /** @example ev_gma9hq8a96q5 */
            event_id: string;
            /** @example pa_42ej2s5gh7e8 */
            id: string;
            participation_status: components["schemas"]["models.ParticipationStatus"];
            /** @example Backend developer */
            team_role: string;
        };
        "dto.PreviewResponse": {
            /** @example 12 */
            affected: number;
            /** @example 3 */
            skipped: number;
        };
        "dto.ProfileLinkListResponse": {
            items: components["schemas"]["models.ProfileLink"][];
        };
        "dto.PublicProfileEvent": {
            /** Format: date-time */
            end_at: string;
            /** @example ev_gma9hq8a96q5 */
            id: string;
            /** Format: date-time */
            start_at: string;
            /** @example Timeline Hack */
            title: string;
        };
        "dto.PublicProfileResponse": {
            /** @example /api/v1/avatars/ab12cd34.png */
            avatar_url?: string;
            /** @example Backend developer */
            bio?: string;
            /** @example John Smith */
            display_name: string;
            events: components["schemas"]["dto.PublicProfileEvent"][];
            /** @example John */
            first_name: string;
            /** @example Smith */
            last_name: string;
            /** @example Fitzgerald */
            middle_name?: string;
            /** @example jsmith */
            nickname: string;
        };
        "dto.QueueEntryPage": {
            items: components["schemas"]["dto.QueueEntryResponse"][];
            meta: components["schemas"]["dto.PageMeta"];
        };
        "dto.QueueEntryResponse": {
            actual_channel: components["schemas"]["models.Channel"];
            /** @example 4 */
            attempt_count: number;
            /** Format: date-time */
            created_at: string;
            failed_channels: components["schemas"]["models.Channel"][];
            /** @example nt_42ej2s5gh7e8 */
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
        "dto.ReadyResponse": {
            /** @example ok */
            database: string;
            /** @example ready */
            status: string;
        };
        "dto.RegisterRequest": {
            /** @example ivan@example.com */
            email?: string;
            /** @example John */
            first_name?: string;
            invite_token?: string;
            /** @example Smith */
            last_name?: string;
            /** @example Fitzgerald */
            middle_name?: string;
            /** @example jsmith */
            nickname: string;
            /** @example correct-horse-battery */
            password?: string;
        };
        "dto.RegistrationCoverage": {
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
        "dto.RegistrationPublic": {
            /** Format: date-time */
            deadline_at?: string;
            description?: string;
            state: components["schemas"]["models.RegistrationState"];
            /** @example https://example.com/register */
            url: string;
        };
        "dto.RegistrationResponse": {
            /** @example 1 */
            activation_version: number;
            /** Format: date-time */
            created_at: string;
            /** Format: date-time */
            deadline_at?: string;
            description?: string;
            /** @example ev_gma9hq8a96q5 */
            event_id: string;
            /** @example rg_42ej2s5gh7e8 */
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
        "dto.RegistrationStatusPage": {
            items: components["schemas"]["dto.RegistrationStatusResponse"][];
            meta: components["schemas"]["dto.PageMeta"];
        };
        "dto.RegistrationStatusResponse": {
            /** @example ev_gma9hq8a96q5 */
            event_id: string;
            /** @example rs_42ej2s5gh7e8 */
            id: string;
            last_change_source: components["schemas"]["models.ChangeSource"];
            /** @example us_42ej2s5gh7e8 */
            last_changed_by_user_id?: string;
            note?: string;
            /** @example pa_42ej2s5gh7e8 */
            participant_id: string;
            /** Format: date-time */
            registered_at?: string;
            /** @example rg_42ej2s5gh7e8 */
            registration_id: string;
            status: components["schemas"]["models.RegistrationStatusValue"];
            /** @example 1 */
            todo_cycle: number;
            /** Format: date-time */
            updated_at: string;
            user: components["schemas"]["dto.UserSummary"];
        };
        "dto.RegistrationStatusShort": {
            /** @example rs_42ej2s5gh7e8 */
            id: string;
            note?: string;
            /** Format: date-time */
            registered_at?: string;
            status: components["schemas"]["models.RegistrationStatusValue"];
            /** @example 1 */
            todo_cycle: number;
        };
        "dto.RemoveParticipantsRequest": {
            /**
             * @example [
             *       "pa_42ej2s5gh7e8"
             *     ]
             */
            participant_ids?: string[];
        };
        "dto.RenameTeamRequest": {
            /** @example Day shift */
            name?: string;
        };
        "dto.ReorderProfileLinksRequest": {
            /**
             * @example [
             *       "pf_42ej2s5gh7e8"
             *     ]
             */
            ids?: string[];
        };
        "dto.ReorderTeamEventLinksRequest": {
            /**
             * @example [
             *       "tl_42ej2s5gh7e8"
             *     ]
             */
            ids?: string[];
        };
        "dto.ResetPasswordRequest": {
            /** @example new-correct-horse */
            password?: string;
            /** @example 7f9c0f0e2f4b4a1d */
            token?: string;
        };
        "dto.ResourceLinkListResponse": {
            items: components["schemas"]["models.ResourceLink"][];
        };
        "dto.RetentionSettingsResponse": {
            /** @example 30 */
            archive_after_days?: number;
            /** @example 365 */
            audit_log_retention_days: number;
            /** @example 24 */
            delete_archive_after_months?: number;
            delete_covers_on_archive: boolean;
            /** Format: date-time */
            updated_at: string;
            /** @example us_gma9hq8a96q5 */
            updated_by?: string;
        };
        "dto.SaveNoteRequest": {
            /** @example Draft notes in Markdown */
            body?: string;
        };
        "dto.SaveOutcomeRequest": {
            note?: string;
            outcome?: components["schemas"]["models.Outcome"];
            /** @example 2 */
            place?: number;
            /** @example Jury award */
            prize?: string;
            /** @example Smart city */
            track?: string;
        };
        "dto.SaveRetrospectiveRequest": {
            next_time?: string;
            went_badly?: string;
            went_well?: string;
        };
        "dto.ScheduleItem": {
            /** Format: date-time */
            end_at: string;
            /** @example st_42ej2s5gh7e8 */
            id: string;
            /** @example Call for applications */
            name: string;
            place: components["schemas"]["models.Place"];
            /** Format: date-time */
            start_at: string;
            type: components["schemas"]["models.StageType"];
        };
        "dto.ScheduleResponse": {
            range: components["schemas"]["dto.TimeRange"];
            rows: components["schemas"]["dto.ScheduleRow"][];
        };
        "dto.ScheduleRow": {
            color?: components["schemas"]["models.EventColor"];
            /** @example /api/v1/covers/abc.png */
            cover_url?: string;
            effective_format: components["schemas"]["models.EventFormat"];
            /** Format: date-time */
            end_at: string;
            /** @example ev_gma9hq8a96q5 */
            event_id: string;
            kind: components["schemas"]["models.EventKind"];
            /** @example RUB */
            prize_currency?: string;
            /** @example 500000.00 */
            prize_pool?: string;
            /** Format: date-time */
            registration_deadline?: string;
            registration_status?: components["schemas"]["dto.RegistrationStatusShort"];
            stages: components["schemas"]["dto.ScheduleItem"][];
            /** Format: date-time */
            start_at: string;
            state: components["schemas"]["models.EventState"];
            team_role?: string;
            /** @example National event */
            title: string;
            website_url?: string;
        };
        "dto.SessionListResponse": {
            items: components["schemas"]["dto.SessionResponse"][];
        };
        "dto.SessionResponse": {
            /** Format: date-time */
            created_at: string;
            /** @example true */
            current: boolean;
            /** Format: date-time */
            expires_at: string;
            /** @example se_42ej2s5gh7e8 */
            id: string;
            /** @example 203.0.113.7 */
            ip: string;
            /** @example Work laptop */
            label: string;
            /** Format: date-time */
            last_used_at: string;
            /** @example Mozilla/5.0 (X11; Linux x86_64) */
            user_agent: string;
        };
        "dto.ShortcutsResponse": {
            shortcuts: components["schemas"]["models.Shortcuts"];
        };
        "dto.StageResponse": {
            /** @example Kazan */
            city?: string;
            /** @example RU */
            country_code?: string;
            /** Format: date-time */
            created_at: string;
            description?: string;
            /** Format: date-time */
            end_at: string;
            /** @example ev_gma9hq8a96q5 */
            event_id: string;
            format?: components["schemas"]["models.EventFormat"];
            /** @example st_42ej2s5gh7e8 */
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
        "dto.StageShort": {
            /** Format: date-time */
            end_at: string;
            /** @example st_42ej2s5gh7e8 */
            id: string;
            /** @example Call for applications */
            name: string;
            /** Format: date-time */
            start_at: string;
            type: components["schemas"]["models.StageType"];
        };
        "dto.SystemEventPage": {
            items: components["schemas"]["dto.SystemEventResponse"][];
            meta: components["schemas"]["dto.PageMeta"];
        };
        "dto.SystemEventResponse": {
            /** Format: date-time */
            created_at: string;
            /** @example sy_42ej2s5gh7e8 */
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
            /** @example notification */
            subject_type: string;
            /** @example NOTIFICATION_FAILED */
            type: string;
        };
        "dto.TaskListResponse": {
            items: components["schemas"]["models.ParticipantTask"][];
        };
        "dto.TeamDetailResponse": {
            members: components["schemas"]["dto.TeamMemberResponse"][];
            team: components["schemas"]["dto.TeamResponse"];
        };
        "dto.TeamEventEntryListResponse": {
            items: components["schemas"]["dto.TeamEventEntryResponse"][];
        };
        "dto.TeamEventEntryResponse": {
            /** @example 4 */
            assigned_members: number;
            /** Format: date-time */
            entered_at: string;
            /** @example ev_gma9hq8a96q5 */
            event_id: string;
            /** @example National hackathon */
            event_title: string;
            /** @example te_42ej2s5gh7e8 */
            id: string;
            /** @example true */
            registered: boolean;
            /** @example 3 */
            registered_count: number;
            roster: components["schemas"]["dto.TeamRosterMemberResponse"][];
            /** @example 4 */
            roster_size: number;
            /** @example tm_42ej2s5gh7e8 */
            team_id: string;
            /** @example 5 */
            team_size_max?: number;
            /** @example 3 */
            team_size_min?: number;
            track: components["schemas"]["dto.EventTrackSummary"];
            /** @example false */
            track_locked: boolean;
            tracks: components["schemas"]["dto.EventTrackSummary"][];
        };
        "dto.TeamEventLinkListResponse": {
            /** @example true */
            can_write: boolean;
            items: components["schemas"]["models.TeamEventLink"][];
        };
        "dto.TeamJoinLinkResponse": {
            /** @example true */
            active: boolean;
            /** Format: date-time */
            expires_at?: string;
            /** @example tj_42ej2s5gh7e8 */
            id?: string;
        };
        "dto.TeamJoinLinkSecretResponse": {
            /** Format: date-time */
            expires_at: string;
            /** @example tj_42ej2s5gh7e8 */
            id: string;
            /** @example h9Qx1s3vT7c... */
            token: string;
            /** @example https://timeline.example/teams/join/h9Qx1s3vT7c */
            url: string;
        };
        "dto.TeamListResponse": {
            items: components["schemas"]["dto.TeamResponse"][];
        };
        "dto.TeamMemberResponse": {
            /** @example tb_42ej2s5gh7e8 */
            id: string;
            /** Format: date-time */
            invited_at: string;
            /** @example false */
            is_lead: boolean;
            /** Format: date-time */
            joined_at?: string;
            /** Format: date-time */
            left_at?: string;
            state: components["schemas"]["models.TeamMemberState"];
            /** @example tm_42ej2s5gh7e8 */
            team_id: string;
            user: components["schemas"]["dto.UserSummary"];
        };
        "dto.TeamResponse": {
            /** Format: date-time */
            created_at: string;
            /** @example tm_42ej2s5gh7e8 */
            id: string;
            /** @example true */
            is_lead: boolean;
            lead: components["schemas"]["dto.UserSummary"];
            /**
             * @example ACTIVE
             * @enum {string}
             */
            my_state: "INVITED" | "ACTIVE" | "LEFT";
            /** @example Night shift */
            name: string;
            /** Format: date-time */
            updated_at: string;
        };
        "dto.TeamRosterMemberResponse": {
            /** @example true */
            assigned: boolean;
            /** @example tp_42ej2s5gh7e8 */
            id: string;
            /** @example false */
            is_lead: boolean;
            /** @example tb_42ej2s5gh7e8 */
            member_id: string;
            registration_status?: components["schemas"]["models.RegistrationStatusValue"];
            state: components["schemas"]["models.TeamMemberState"];
            user: components["schemas"]["dto.UserSummary"];
        };
        "dto.TelegramLinkResponse": {
            /** @example https://t.me/timeline_bot?start=abc123 */
            deep_link: string;
            /** Format: date-time */
            expires_at: string;
        };
        "dto.TemplateListResponse": {
            items: components["schemas"]["models.ChecklistTemplate"][];
        };
        "dto.TimeRange": {
            /** Format: date-time */
            from: string;
            /** Format: date-time */
            to: string;
        };
        "dto.TokenRequest": {
            /** @example 7f9c0f0e2f4b4a1d */
            token?: string;
        };
        "dto.TrackPrizeInput": {
            /** @example 150000 */
            amount: string;
            /** @example 1 */
            place?: number;
            /** @example Best design */
            title?: string;
        };
        "dto.TrackPrizeResponse": {
            /** @example 150000 */
            amount: string;
            /** @example pz_42ej2s5gh7e8 */
            id: string;
            /** @example 1 */
            place?: number;
            /** @example Best design */
            title?: string;
        };
        "dto.UnreadCountResponse": {
            /** @example 3 */
            unread: number;
        };
        "dto.UpdateArtifactRequest": {
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
        "dto.UpdateEventCaseRequest": {
            case_no?: number;
            /** @example false */
            clear_prize?: boolean;
            /** @example false */
            clear_track?: boolean;
            description?: string;
            name?: string;
            partner?: string;
            prize_amount?: string;
            track_id?: string;
        };
        "dto.UpdateEventRequest": {
            /** @example Moscow */
            city?: string;
            /** @example RU */
            country_code?: string;
            description?: string;
            /** Format: date-time */
            end_at?: string;
            format?: components["schemas"]["models.EventFormat"];
            kind?: components["schemas"]["models.EventKind"];
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
            /** @example 3 */
            team_size_min?: number;
            title?: string;
            website_url?: string;
        };
        "dto.UpdateEventTrackRequest": {
            description?: string;
            name?: string;
            prizes?: components["schemas"]["dto.TrackPrizeInput"][];
            /** @example false */
            set_prizes?: boolean;
            track_no?: number;
        };
        "dto.UpdateNotificationPreferenceRequest": {
            /** @example false */
            enabled?: boolean;
        };
        "dto.UpdateProfileLinkRequest": {
            /** @example false */
            clear_label?: boolean;
            /** @example My repositories */
            label?: string;
            /** @example https://github.com/ivan */
            url?: string;
        };
        "dto.UpdateProfileRequest": {
            /** @example Backend developer */
            bio?: string;
            /** @example John */
            first_name?: string;
            /** @example Smith */
            last_name?: string;
            /**
             * @example en
             * @enum {string}
             */
            locale?: "ru" | "en";
            /** @example Fitzgerald */
            middle_name?: string;
            /** @example jsmith */
            nickname?: string;
            notification_channels?: ("TELEGRAM" | "EMAIL")[];
            /** @example false */
            profile_public?: boolean;
            /** @example @ivan */
            telegram_username?: string;
            /** @example Asia/Tokyo */
            timezone?: string;
        };
        "dto.UpdateRegistrationRequest": {
            /** Format: date-time */
            deadline_at?: string;
            description?: string;
            url?: string;
        };
        "dto.UpdateResourceLinkRequest": {
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
            /** @example st_42ej2s5gh7e8 */
            stage_id?: string;
            /** @example Rules and code of conduct */
            title?: string;
            /** @example https://example.org/rules */
            url?: string;
        };
        "dto.UpdateRetentionSettingsRequest": {
            archive_after_days?: number;
            /** @example 365 */
            audit_log_retention_days?: number;
            delete_archive_after_months?: number;
            delete_covers_on_archive?: boolean;
        };
        "dto.UpdateRuleRequest": {
            enabled?: boolean;
            offset_minutes?: number;
        };
        "dto.UpdateSessionRequest": {
            /** @example false */
            clear_label?: boolean;
            /** @example Work laptop */
            label?: string;
        };
        "dto.UpdateShortcutsRequest": {
            shortcuts?: components["schemas"]["models.Shortcuts"];
        };
        "dto.UpdateStageRequest": {
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
        "dto.UpdateTaskRequest": {
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
            /** @example st_42ej2s5gh7e8 */
            stage_id?: string;
            /** @example Record the demo video */
            title?: string;
        };
        "dto.UpdateTeamEventLinkRequest": {
            /** @example false */
            clear_label?: boolean;
            /** @example Our repository */
            label?: string;
            /** @example https://github.com/team/project */
            url?: string;
        };
        "dto.UpdateTeamRoleRequest": {
            /** @example Captain */
            team_role?: string;
        };
        "dto.UserPage": {
            items: components["schemas"]["dto.UserSummary"][];
            meta: components["schemas"]["dto.PageMeta"];
        };
        "dto.UserSummary": {
            /** @example John Smith */
            display_name: string;
            /** @example ivan@example.com */
            email: string;
            /** @example John */
            first_name: string;
            /** @example us_42ej2s5gh7e8 */
            id: string;
            /** @example true */
            is_active: boolean;
            /** @example Smith */
            last_name: string;
            /** @example Fitzgerald */
            middle_name?: string;
            /** @example jsmith */
            nickname?: string;
        };
        "dto.WorkerHeartbeatResponse": {
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
        /** @enum {string} */
        "models.ArtifactKind": "REPOSITORY" | "VIDEO" | "SLIDES" | "DEMO" | "SUBMISSION" | "OTHER";
        /** @enum {string} */
        "models.AuditAction": "USER_REGISTER" | "USER_DEACTIVATE" | "USER_ACTIVATE" | "USER_DELETE" | "USER_PROFILE_CHANGE" | "USER_ADMIN_FLAG_CHANGE" | "INVITE_CREATE" | "INVITE_REVOKE" | "INVITE_ACCEPT" | "EVENT_CREATE" | "EVENT_UPDATE" | "EVENT_PUBLISH" | "EVENT_ARCHIVE" | "EVENT_DELETE" | "EVENT_COVER_SET" | "EVENT_COVER_CLEAR" | "STAGE_CREATE" | "STAGE_UPDATE" | "STAGE_DELETE" | "TRACK_CREATE" | "TRACK_UPDATE" | "TRACK_DELETE" | "TRACK_PRIZE_SET" | "EVENT_CASE_CREATE" | "EVENT_CASE_UPDATE" | "EVENT_CASE_DELETE" | "TEAM_TRACK_CHOOSE" | "PARTICIPANT_ADD" | "PARTICIPANT_REMOVE" | "PARTICIPANT_REACTIVATE" | "TEAM_ROLE_CHANGE" | "TEAM_CREATE" | "TEAM_RENAME" | "TEAM_INVITE" | "TEAM_JOIN" | "TEAM_LEAVE" | "TEAM_EVENT_ENTER" | "TEAM_ROSTER_ADD" | "TEAM_ROSTER_REMOVE" | "TEAM_LINK_ISSUE" | "TEAM_LINK_REVOKE" | "TEAM_EVENT_LINK_ADD" | "TEAM_EVENT_LINK_UPDATE" | "TEAM_EVENT_LINK_REMOVE" | "REGISTRATION_CHANGE" | "STATUS_CHANGE" | "RULE_CHANGE" | "RESOURCE_LINK_CREATE" | "RESOURCE_LINK_UPDATE" | "RESOURCE_LINK_DELETE" | "RETENTION_SETTINGS_CHANGE" | "EVENT_AUTO_ARCHIVE" | "EVENT_PURGE_SCHEDULE" | "EVENT_PURGE_CANCEL" | "EVENT_PURGE_DELETE";
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
            due_offset_minutes?: number;
            /** @example 1 */
            slot_no: number;
            /** @example task.read_rules */
            title_key: string;
        };
        /** @enum {string} */
        "models.CoverSource": "MANUAL" | "AUTO";
        /** @enum {string} */
        "models.EntityType": "USER" | "INVITE" | "EVENT" | "STAGE" | "EVENT_TRACK" | "EVENT_CASE" | "EVENT_PARTICIPANT" | "TEAM" | "TEAM_MEMBER" | "TEAM_EVENT_ENTRY" | "TEAM_JOIN_LINK" | "TEAM_EVENT_LINK" | "REGISTRATION" | "REGISTRATION_STATUS" | "NOTIFICATION_RULE" | "RESOURCE_LINK" | "RETENTION_SETTINGS";
        "models.EventColor": {
            /** @enum {string} */
            family: "RU" | "WORLD";
            /** @example 3 */
            slot: number;
        };
        /** @enum {string} */
        "models.EventFormat": "ONLINE" | "OFFLINE" | "HYBRID";
        /** @enum {string} */
        "models.EventKind": "HACKATHON" | "MEETUP";
        /** @enum {string} */
        "models.EventOrigin": "RU" | "WORLD";
        /** @enum {string} */
        "models.EventState": "UNPUBLISHED" | "UPCOMING" | "ACTIVE" | "FINISHED" | "ARCHIVED";
        "models.FieldError": {
            /** @example required */
            code: string;
            /** @example email */
            field: string;
            /** @example invalid address */
            message: string;
        };
        /** @enum {string} */
        "models.LinkKind": "WEBSITE" | "RULES" | "REGISTRATION" | "SUBMISSION" | "CHAT" | "DATASET" | "API_DOCS" | "JUDGING" | "MENTORS" | "RESULTS" | "SPONSOR" | "OTHER";
        /** @enum {string} */
        "models.NotificationOccasion": "REGISTRATION_REQUIRED" | "REGISTRATION_REMINDER" | "REGISTRATION_OVERDUE";
        "models.NotificationPreference": {
            channel: components["schemas"]["models.Channel"];
            enabled: boolean;
            occasion: components["schemas"]["models.NotificationOccasion"];
        };
        /** @enum {string} */
        "models.NotificationStatus": "PENDING" | "PROCESSING" | "SENT" | "FAILED" | "CANCELLED" | "UNDELIVERABLE";
        /** @enum {string} */
        "models.NotificationType": "REGISTRATION_REQUIRED" | "REGISTRATION_REMINDER" | "REGISTRATION_OVERDUE";
        /** @enum {string} */
        "models.Outcome": "PARTICIPATED" | "SHORTLISTED" | "WINNER" | "PRIZE";
        "models.ParticipantArtifact": {
            /** Format: date-time */
            created_at: string;
            /** @example ev_gma9hq8a96q5 */
            event_id: string;
            /** @example ar_42ej2s5gh7e8 */
            id: string;
            kind: components["schemas"]["models.ArtifactKind"];
            /** @example 0 */
            sort_order: number;
            /** Format: date-time */
            submitted_at?: string;
            /** @example Project repository */
            title?: string;
            /** Format: date-time */
            updated_at: string;
            /** @example https://github.com/example/project */
            url: string;
        };
        "models.ParticipantNote": {
            /** @example Draft notes in Markdown */
            body: string;
            /** @example ev_gma9hq8a96q5 */
            event_id: string;
            /** Format: date-time */
            updated_at?: string;
        };
        "models.ParticipantOutcome": {
            /** Format: date-time */
            created_at: string;
            /** @example ev_gma9hq8a96q5 */
            event_id: string;
            note?: string;
            outcome: components["schemas"]["models.Outcome"];
            /** @example 2 */
            place?: number;
            /** @example Jury award */
            prize?: string;
            /** @example Smart city */
            track?: string;
            /** Format: date-time */
            updated_at: string;
        };
        "models.ParticipantRetrospective": {
            /** Format: date-time */
            created_at?: string;
            /** @example ev_gma9hq8a96q5 */
            event_id: string;
            next_time?: string;
            /** Format: date-time */
            updated_at?: string;
            went_badly?: string;
            went_well?: string;
        };
        "models.ParticipantTask": {
            /** Format: date-time */
            created_at: string;
            /** Format: date-time */
            done_at?: string;
            /** Format: date-time */
            due_at?: string;
            /** @example ev_gma9hq8a96q5 */
            event_id: string;
            /** @example tk_42ej2s5gh7e8 */
            id: string;
            notes?: string;
            /** @example 0 */
            sort_order: number;
            /** @example st_42ej2s5gh7e8 */
            stage_id?: string;
            /** @example Record the demo video */
            title: string;
            /** Format: date-time */
            updated_at?: string;
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
        "models.ProfileLink": {
            /** Format: date-time */
            created_at: string;
            /** @example pf_42ej2s5gh7e8 */
            id: string;
            /** @example My repositories */
            label: string;
            /** @example 0 */
            sort_order: number;
            /** Format: date-time */
            updated_at: string;
            /** @example https://github.com/ivan */
            url: string;
        };
        /** @enum {string} */
        "models.RegistrationState": "ACTIVE" | "DISABLED";
        /** @enum {string} */
        "models.RegistrationStatusValue": "TODO" | "DONE" | "NOT_REQUIRED";
        "models.ResourceLink": {
            /** Format: date-time */
            created_at: string;
            /** @example ev_gma9hq8a96q5 */
            event_id: string;
            /** @example rl_42ej2s5gh7e8 */
            id: string;
            /** @example false */
            is_pinned: boolean;
            kind: components["schemas"]["models.LinkKind"];
            /** @example 0 */
            sort_order: number;
            /** @example st_42ej2s5gh7e8 */
            stage_id: string;
            /** @example Rules and code of conduct */
            title: string;
            /** Format: date-time */
            updated_at: string;
            /** @example https://example.org/rules */
            url: string;
        };
        "models.Shortcuts": {
            [key: string]: string;
        };
        /** @enum {string} */
        "models.StageType": "REGISTRATION" | "SELECTION" | "PARTICIPATION" | "CHECKPOINT" | "SUBMISSION" | "DEMO" | "RESULTS" | "OTHER";
        "models.TeamEventLink": {
            /** Format: date-time */
            created_at: string;
            /** @example te_42ej2s5gh7e8 */
            entry_id: string;
            /** @example tl_42ej2s5gh7e8 */
            id: string;
            /** @example Our repository */
            label: string;
            /** @example 0 */
            sort_order: number;
            /** Format: date-time */
            updated_at: string;
            /** @example https://github.com/team/project */
            url: string;
        };
        /** @enum {string} */
        "models.TeamMemberState": "INVITED" | "ACTIVE" | "LEFT";
    };
    responses: never;
    parameters: never;
    requestBodies: {
        /** @description Participants and target status */
        "dto.BatchSetStatusRequest": {
            content: {
                "application/json": components["schemas"]["dto.BatchSetStatusRequest"];
            };
        };
        /** @description Email address */
        "dto.EmailRequest": {
            content: {
                "application/json": components["schemas"]["dto.EmailRequest"];
            };
        };
        /** @description Confirmation token */
        "dto.TokenRequest": {
            content: {
                "application/json": components["schemas"]["dto.TokenRequest"];
            };
        };
        postAdminEvents_id_cover: {
            content: {
                "multipart/form-data": {
                    /**
                     * Format: binary
                     * @description Image file
                     */
                    file: string;
                };
            };
        };
    };
    headers: never;
    pathItems: never;
}
export type $defs = Record<string, never>;
export type operations = Record<string, never>;
