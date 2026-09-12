DELETE FROM one_time_tokens WHERE purpose = 'EMAIL_CHANGE_CANCEL';

ALTER TABLE one_time_tokens DROP CONSTRAINT one_time_tokens_purpose_enum;

ALTER TABLE one_time_tokens ADD CONSTRAINT one_time_tokens_purpose_enum
    CHECK (purpose IN ('EMAIL_VERIFICATION', 'PASSWORD_RESET', 'EMAIL_CHANGE', 'TELEGRAM_LINK'));

ALTER TABLE one_time_tokens DROP CONSTRAINT one_time_tokens_origin_normalized;

ALTER TABLE one_time_tokens DROP COLUMN origin_email;
