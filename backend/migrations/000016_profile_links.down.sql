ALTER TABLE users ADD COLUMN github_url  text;
ALTER TABLE users ADD COLUMN website_url text;

ALTER TABLE users ADD CONSTRAINT users_github_url_len
    CHECK (github_url IS NULL OR length(btrim(github_url)) BETWEEN 1 AND 2048);
ALTER TABLE users ADD CONSTRAINT users_website_url_len
    CHECK (website_url IS NULL OR length(btrim(website_url)) BETWEEN 1 AND 2048);

DROP TABLE IF EXISTS profile_links;
