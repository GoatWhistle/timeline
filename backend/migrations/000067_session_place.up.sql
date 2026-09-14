ALTER TABLE sessions ADD COLUMN country_code char(2);
ALTER TABLE sessions ADD COLUMN city text;

ALTER TABLE sessions ADD CONSTRAINT sessions_country_code_format
    CHECK (country_code IS NULL OR country_code ~ '^[A-Z]{2}$');
