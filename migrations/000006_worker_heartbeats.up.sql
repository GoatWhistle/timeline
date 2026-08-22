-- Отметки запуска фоновых процессов для служебных проверок (раздел 18 ТЗ).
CREATE TABLE worker_heartbeats (
    process     text PRIMARY KEY,
    last_run_at timestamptz NOT NULL,

    CONSTRAINT worker_heartbeats_process_enum CHECK (process IN ('scheduler', 'worker', 'retention'))
);
