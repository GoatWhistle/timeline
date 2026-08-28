ALTER TABLE stages ADD CONSTRAINT stages_id_event_key UNIQUE (id, event_id);

CREATE TABLE participant_tasks (
    id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id    uuid        NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    event_id   uuid        NOT NULL REFERENCES events (id) ON DELETE CASCADE,
    stage_id   uuid,
    stage_event_id uuid,
    title      text        NOT NULL,
    notes      text,
    due_at     timestamptz,
    done_at    timestamptz,
    sort_order integer     NOT NULL DEFAULT 0,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),

    CONSTRAINT tasks_title_len CHECK (length(btrim(title)) BETWEEN 1 AND 200),
    CONSTRAINT tasks_notes_len CHECK (notes IS NULL OR length(notes) <= 20000),
    CONSTRAINT tasks_stage_pair CHECK ((stage_id IS NULL) = (stage_event_id IS NULL)),
    CONSTRAINT tasks_stage_same_event CHECK (stage_event_id IS NULL OR stage_event_id = event_id),
    CONSTRAINT tasks_stage_fk FOREIGN KEY (stage_id, stage_event_id)
        REFERENCES stages (id, event_id) ON DELETE SET NULL
);

CREATE INDEX tasks_owner_event_idx ON participant_tasks (user_id, event_id, sort_order, created_at);
CREATE INDEX tasks_owner_due_idx ON participant_tasks (user_id, due_at) WHERE done_at IS NULL;

CREATE TRIGGER tasks_set_updated_at BEFORE UPDATE ON participant_tasks
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE participant_notes (
    user_id    uuid        NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    event_id   uuid        NOT NULL REFERENCES events (id) ON DELETE CASCADE,
    body       text        NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),

    CONSTRAINT notes_body_len CHECK (length(body) BETWEEN 1 AND 20000),
    CONSTRAINT notes_owner_event_pk PRIMARY KEY (user_id, event_id)
);

CREATE TRIGGER notes_set_updated_at BEFORE UPDATE ON participant_notes
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE participant_artifacts (
    id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id      uuid        NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    event_id     uuid        NOT NULL REFERENCES events (id) ON DELETE CASCADE,
    kind         text        NOT NULL,
    url          text        NOT NULL,
    title        text,
    submitted_at timestamptz,
    sort_order   integer     NOT NULL DEFAULT 0,
    created_at   timestamptz NOT NULL DEFAULT now(),
    updated_at   timestamptz NOT NULL DEFAULT now(),

    CONSTRAINT artifacts_kind_enum CHECK (kind IN (
        'REPOSITORY', 'VIDEO', 'SLIDES', 'DEMO', 'SUBMISSION', 'OTHER')),
    CONSTRAINT artifacts_url_len CHECK (length(btrim(url)) BETWEEN 1 AND 2048),
    CONSTRAINT artifacts_title_len CHECK (title IS NULL OR length(btrim(title)) BETWEEN 1 AND 200)
);

CREATE INDEX artifacts_owner_event_idx ON participant_artifacts (user_id, event_id, sort_order, created_at);

CREATE TRIGGER artifacts_set_updated_at BEFORE UPDATE ON participant_artifacts
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE participant_outcomes (
    user_id    uuid        NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    event_id   uuid        NOT NULL REFERENCES events (id) ON DELETE CASCADE,
    outcome    text        NOT NULL DEFAULT 'PARTICIPATED',
    place      integer,
    prize      text,
    track      text,
    note       text,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),

    CONSTRAINT outcomes_enum CHECK (outcome IN ('PARTICIPATED', 'SHORTLISTED', 'WINNER', 'PRIZE')),
    CONSTRAINT outcomes_place_range CHECK (place IS NULL OR place BETWEEN 1 AND 10000),
    CONSTRAINT outcomes_place_needs_result CHECK (
        place IS NULL OR outcome IN ('SHORTLISTED', 'WINNER', 'PRIZE')),
    CONSTRAINT outcomes_prize_len CHECK (prize IS NULL OR length(btrim(prize)) BETWEEN 1 AND 200),
    CONSTRAINT outcomes_track_len CHECK (track IS NULL OR length(btrim(track)) BETWEEN 1 AND 120),
    CONSTRAINT outcomes_note_len CHECK (note IS NULL OR length(note) <= 20000),
    CONSTRAINT outcomes_owner_event_pk PRIMARY KEY (user_id, event_id)
);

CREATE TRIGGER outcomes_set_updated_at BEFORE UPDATE ON participant_outcomes
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE event_bookmarks (
    user_id    uuid        NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    event_id   uuid        NOT NULL REFERENCES events (id) ON DELETE CASCADE,
    created_at timestamptz NOT NULL DEFAULT now(),

    CONSTRAINT bookmarks_owner_event_pk PRIMARY KEY (user_id, event_id)
);

CREATE INDEX bookmarks_owner_idx ON event_bookmarks (user_id, created_at DESC);

CREATE TABLE checklist_templates (
    id          text PRIMARY KEY,
    sort_order  integer NOT NULL DEFAULT 0,

    CONSTRAINT templates_id_len CHECK (length(btrim(id)) BETWEEN 1 AND 60)
);

CREATE TABLE checklist_template_items (
    template_id  text    NOT NULL REFERENCES checklist_templates (id) ON DELETE CASCADE,
    slot_no      integer NOT NULL,
    title_key    text    NOT NULL,
    due_offset_minutes integer,

    CONSTRAINT template_items_slot_range CHECK (slot_no BETWEEN 1 AND 50),
    CONSTRAINT template_items_title_key_len CHECK (length(btrim(title_key)) BETWEEN 1 AND 120),
    CONSTRAINT template_items_offset_range CHECK (
        due_offset_minutes IS NULL OR due_offset_minutes BETWEEN -525600 AND 525600),
    CONSTRAINT template_items_pk PRIMARY KEY (template_id, slot_no)
);

INSERT INTO checklist_templates (id, sort_order) VALUES
    ('preparation', 1),
    ('build_day', 2),
    ('submission_day', 3);

INSERT INTO checklist_template_items (template_id, slot_no, title_key, due_offset_minutes) VALUES
    ('preparation', 1, 'task.read_rules', -10080),
    ('preparation', 2, 'task.assemble_team', -10080),
    ('preparation', 3, 'task.register_on_site', -4320),
    ('preparation', 4, 'task.install_toolchain', -2880),
    ('preparation', 5, 'task.book_travel', -2880),
    ('preparation', 6, 'task.plan_idea', -1440),
    ('build_day', 1, 'task.create_repository', 0),
    ('build_day', 2, 'task.split_the_work', 60),
    ('build_day', 3, 'task.prepare_environment', 120),
    ('build_day', 4, 'task.checkpoint_progress', 480),
    ('submission_day', 1, 'task.freeze_scope', -720),
    ('submission_day', 2, 'task.record_demo', -360),
    ('submission_day', 3, 'task.prepare_slides', -300),
    ('submission_day', 4, 'task.open_repository', -120),
    ('submission_day', 5, 'task.submit_the_work', -60),
    ('submission_day', 6, 'task.write_retrospective', 2880);
