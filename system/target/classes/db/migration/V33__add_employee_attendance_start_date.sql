ALTER TABLE employees
    ADD COLUMN attendance_started_on DATE NULL;

UPDATE employees
SET attendance_started_on = DATE(created_at)
WHERE attendance_started_on IS NULL;
