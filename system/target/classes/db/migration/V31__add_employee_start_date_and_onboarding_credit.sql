ALTER TABLE employees
    ADD COLUMN start_date DATE NULL,
    ADD COLUMN onboarding_paid_leave_days INT NOT NULL DEFAULT 0;

UPDATE employees
SET start_date = DATE(created_at)
WHERE start_date IS NULL;

ALTER TABLE employees
    MODIFY COLUMN start_date DATE NOT NULL;
