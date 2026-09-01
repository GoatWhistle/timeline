ALTER TABLE sessions ADD COLUMN label text;

ALTER TABLE sessions ADD CONSTRAINT sessions_label_length
    CHECK (label IS NULL OR char_length(label) BETWEEN 1 AND 64);
