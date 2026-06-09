CREATE TABLE leave_requests (
    id CHAR(36) PRIMARY KEY,
    vendor_id CHAR(36) NOT NULL REFERENCES vendors(id),
    employee_id CHAR(36) NOT NULL REFERENCES employees(id),
    branch_id CHAR(36) NOT NULL REFERENCES branches(id),
    leave_type VARCHAR(20) NOT NULL,
    status VARCHAR(20) NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    reason VARCHAR(400) NOT NULL,
    review_note VARCHAR(400),
    created_at DATETIME(6) NOT NULL,
    reviewed_at DATETIME(6)
);

CREATE TABLE holidays (
    id CHAR(36) PRIMARY KEY,
    vendor_id CHAR(36) NOT NULL REFERENCES vendors(id),
    name VARCHAR(140) NOT NULL,
    holiday_date DATE NOT NULL
);

CREATE INDEX idx_leave_requests_vendor_id ON leave_requests(vendor_id);
CREATE INDEX idx_leave_requests_employee_status ON leave_requests(employee_id, status);
CREATE INDEX idx_leave_requests_employee_dates ON leave_requests(employee_id, start_date, end_date);
CREATE INDEX idx_holidays_vendor_date ON holidays(vendor_id, holiday_date);
