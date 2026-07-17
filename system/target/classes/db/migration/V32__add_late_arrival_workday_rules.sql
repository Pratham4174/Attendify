ALTER TABLE branches
    ADD COLUMN late_half_day_enabled BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN late_half_day_after_minutes INT NULL,
    ADD COLUMN late_absent_enabled BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN late_absent_after_minutes INT NULL;
