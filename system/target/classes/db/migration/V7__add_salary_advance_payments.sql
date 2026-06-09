CREATE TABLE salary_advance_payments (
    id CHAR(36) PRIMARY KEY,
    vendor_id CHAR(36) NOT NULL REFERENCES vendors(id),
    employee_id CHAR(36) NOT NULL REFERENCES employees(id),
    payment_date DATE NOT NULL,
    amount NUMERIC(12,2) NOT NULL,
    note VARCHAR(400),
    created_at DATETIME(6) NOT NULL
);

CREATE INDEX idx_salary_advance_vendor_date ON salary_advance_payments(vendor_id, payment_date);
CREATE INDEX idx_salary_advance_employee_date ON salary_advance_payments(employee_id, payment_date);
