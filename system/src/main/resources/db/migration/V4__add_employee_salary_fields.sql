ALTER TABLE employees
    ADD COLUMN monthly_salary NUMERIC(12,2) NOT NULL DEFAULT 0,
    ADD COLUMN monthly_leave_allowance INT NOT NULL DEFAULT 0,
    ADD COLUMN advance_paid NUMERIC(12,2) NOT NULL DEFAULT 0;
