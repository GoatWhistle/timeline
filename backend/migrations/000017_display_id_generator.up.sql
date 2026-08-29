CREATE OR REPLACE FUNCTION display_id_suffix(len integer) RETURNS text AS $$
DECLARE
    alphabet CONSTANT text := '23456789abcdefghjkmnpqrstuvwxyz';
    span     CONSTANT integer := length(alphabet);
    out      text := '';
    pool     text := '';
    chunk    integer;
    i        integer;
BEGIN
    IF len < 1 THEN
        RAISE EXCEPTION 'display_id_suffix length must be positive, got %', len;
    END IF;
    WHILE length(pool) < len * 2 LOOP
        pool := pool || translate(gen_random_uuid()::text, '-', '');
    END LOOP;
    FOR i IN 0 .. len - 1 LOOP
        chunk := ('x' || substr(pool, i * 2 + 1, 2))::bit(8)::integer;
        out := out || substr(alphabet, (chunk % span) + 1, 1);
    END LOOP;
    RETURN out;
END;
$$ LANGUAGE plpgsql VOLATILE;

CREATE OR REPLACE FUNCTION display_id(prefix text, len integer DEFAULT 12) RETURNS text AS $$
BEGIN
    IF prefix !~ '^[a-z]{2}$' THEN
        RAISE EXCEPTION 'display_id prefix must be two lowercase letters, got %', prefix;
    END IF;
    RETURN prefix || '_' || display_id_suffix(len);
END;
$$ LANGUAGE plpgsql VOLATILE;
