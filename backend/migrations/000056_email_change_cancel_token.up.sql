ALTER TABLE one_time_tokens ADD COLUMN origin_email text;

ALTER TABLE one_time_tokens ADD CONSTRAINT one_time_tokens_origin_normalized
    CHECK (origin_email IS NULL OR origin_email = lower(origin_email));

ALTER TABLE one_time_tokens DROP CONSTRAINT one_time_tokens_purpose_enum;

ALTER TABLE one_time_tokens ADD CONSTRAINT one_time_tokens_purpose_enum
    CHECK (purpose IN ('EMAIL_VERIFICATION', 'PASSWORD_RESET', 'EMAIL_CHANGE',
        'EMAIL_CHANGE_CANCEL', 'TELEGRAM_LINK'));
