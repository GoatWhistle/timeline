
CREATE TABLE events (
    id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    title        text        NOT NULL,
    description  text,
    organizer    text,
    website_url  text,
    notes        text,
    kind         text        NOT NULL DEFAULT 'HACKATHON',
    format       text        NOT NULL DEFAULT 'ONLINE',
    origin       text        NOT NULL DEFAULT 'RU',
    country_code char(2),
    city         text,
    start_at     timestamptz NOT NULL,
    end_at       timestamptz NOT NULL,
    published_at timestamptz,
    archived_at  timestamptz,
    created_at   timestamptz NOT NULL DEFAULT now(),
    updated_at   timestamptz NOT NULL DEFAULT now(),

    CONSTRAINT events_title_len CHECK (length(btrim(title)) BETWEEN 1 AND 200),
    CONSTRAINT events_organizer_len CHECK (organizer IS NULL OR length(organizer) <= 200),
    CONSTRAINT events_website_https CHECK (website_url IS NULL OR website_url ~ '^https://'),
    CONSTRAINT events_period CHECK (end_at > start_at),
    CONSTRAINT events_kind_enum CHECK (kind IN ('HACKATHON', 'MEETUP')),
    CONSTRAINT events_format_enum CHECK (format IN ('ONLINE', 'OFFLINE', 'HYBRID')),
    CONSTRAINT events_origin_enum CHECK (origin IN ('RU', 'WORLD')),
    CONSTRAINT events_country_code_format CHECK (country_code IS NULL OR country_code ~ '^[A-Z]{2}$'),
    CONSTRAINT events_city_len CHECK (city IS NULL OR length(btrim(city)) BETWEEN 1 AND 120),
    CONSTRAINT events_place_required CHECK (format = 'ONLINE' OR country_code IS NOT NULL),

    CONSTRAINT events_id_end_at_key UNIQUE (id, end_at)
);

CREATE INDEX events_published_idx ON events (published_at) WHERE archived_at IS NULL;
CREATE INDEX events_period_idx ON events (start_at, end_at);
CREATE INDEX events_title_search_idx ON events (lower(title));
CREATE INDEX events_catalog_idx ON events (origin, format, kind, start_at)
    WHERE published_at IS NOT NULL AND archived_at IS NULL;

CREATE TRIGGER events_set_updated_at BEFORE UPDATE ON events
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE stages (
    id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id     uuid        NOT NULL REFERENCES events (id) ON DELETE CASCADE,
    name         text        NOT NULL,
    type         text        NOT NULL,
    start_at     timestamptz NOT NULL,
    end_at       timestamptz NOT NULL,
    description  text,
    url          text,
    sort_order   integer     NOT NULL DEFAULT 0,
    created_at   timestamptz NOT NULL DEFAULT now(),
    updated_at   timestamptz NOT NULL DEFAULT now(),

    CONSTRAINT stages_name_len CHECK (length(btrim(name)) BETWEEN 1 AND 120),
    CONSTRAINT stages_type_enum CHECK (type IN (
        'REGISTRATION', 'SELECTION', 'PARTICIPATION', 'CHECKPOINT',
        'SUBMISSION', 'DEMO', 'RESULTS', 'OTHER')),
    CONSTRAINT stages_period CHECK (end_at > start_at),
    CONSTRAINT stages_url_https CHECK (url IS NULL OR url ~ '^https://')
);

CREATE INDEX stages_event_idx ON stages (event_id, sort_order, start_at);

CREATE TRIGGER stages_set_updated_at BEFORE UPDATE ON stages
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
