CREATE TABLE profile_links (
    id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id    uuid        NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    url        text        NOT NULL,
    label      text,
    sort_order integer     NOT NULL DEFAULT 0,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),

    CONSTRAINT profile_links_url_len CHECK (length(btrim(url)) BETWEEN 1 AND 2048),
    CONSTRAINT profile_links_label_len CHECK (label IS NULL OR length(btrim(label)) BETWEEN 1 AND 100),
    CONSTRAINT profile_links_sort_order_range CHECK (sort_order BETWEEN 0 AND 1000)
);

CREATE INDEX profile_links_owner_idx ON profile_links (user_id, sort_order, created_at);

CREATE TRIGGER profile_links_set_updated_at BEFORE UPDATE ON profile_links
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

INSERT INTO profile_links (user_id, url, sort_order)
SELECT id, btrim(github_url), 0
FROM users
WHERE github_url IS NOT NULL AND btrim(github_url) <> '';

INSERT INTO profile_links (user_id, url, sort_order)
SELECT id, btrim(website_url), 1
FROM users
WHERE website_url IS NOT NULL AND btrim(website_url) <> '';

ALTER TABLE users DROP CONSTRAINT IF EXISTS users_github_url_len;
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_website_url_len;
ALTER TABLE users DROP COLUMN github_url;
ALTER TABLE users DROP COLUMN website_url;
