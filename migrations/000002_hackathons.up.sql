-- Хакатоны и этапы (раздел 5 ТЗ).

CREATE TABLE hackathons (
    id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    title        text        NOT NULL,
    description  text,
    organizer    text,
    website_url  text,
    notes        text,
    start_at     timestamptz NOT NULL,
    end_at       timestamptz NOT NULL,
    published_at timestamptz,
    archived_at  timestamptz,
    created_at   timestamptz NOT NULL DEFAULT now(),
    updated_at   timestamptz NOT NULL DEFAULT now(),

    CONSTRAINT hackathons_title_len CHECK (length(btrim(title)) BETWEEN 1 AND 200),
    CONSTRAINT hackathons_organizer_len CHECK (organizer IS NULL OR length(organizer) <= 200),
    CONSTRAINT hackathons_website_https CHECK (website_url IS NULL OR website_url ~ '^https://'),
    CONSTRAINT hackathons_period CHECK (end_at > start_at),

    -- Ключ нужен составному внешнему ключу регистрации: он переносит изменение
    -- end_at каскадом и не даёт сдвинуть окончание раньше действующего дедлайна.
    CONSTRAINT hackathons_id_end_at_key UNIQUE (id, end_at)
);

CREATE INDEX hackathons_published_idx ON hackathons (published_at) WHERE archived_at IS NULL;
CREATE INDEX hackathons_period_idx ON hackathons (start_at, end_at);
CREATE INDEX hackathons_title_search_idx ON hackathons (lower(title));

CREATE TRIGGER hackathons_set_updated_at BEFORE UPDATE ON hackathons
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Этап служит только временной шкале и карточке: уведомлений он не порождает.
CREATE TABLE stages (
    id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    hackathon_id uuid        NOT NULL REFERENCES hackathons (id) ON DELETE CASCADE,
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

CREATE INDEX stages_hackathon_idx ON stages (hackathon_id, sort_order, start_at);

CREATE TRIGGER stages_set_updated_at BEFORE UPDATE ON stages
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
