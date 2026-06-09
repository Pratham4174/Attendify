ALTER TABLE branches
    ADD COLUMN half_day_minutes INT NOT NULL DEFAULT 240,
    ADD COLUMN full_day_minutes INT NOT NULL DEFAULT 480;
