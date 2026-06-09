CREATE TABLE attendance_correction_requests (
    id CHAR(36) PRIMARY KEY,
    vendor_id CHAR(36) NOT NULL REFERENCES vendors(id),
    employee_id CHAR(36) NOT NULL REFERENCES employees(id),
    branch_id CHAR(36) NOT NULL REFERENCES branches(id),
    attendance_record_id CHAR(36) REFERENCES attendance_records(id),
    correction_type VARCHAR(30) NOT NULL,
    status VARCHAR(20) NOT NULL,
    attendance_date DATE NOT NULL,
    requested_time DATETIME(6) NOT NULL,
    applied_time DATETIME(6),
    reason VARCHAR(400) NOT NULL,
    review_note VARCHAR(400),
    reviewed_by_name VARCHAR(140),
    created_at DATETIME(6) NOT NULL,
    reviewed_at DATETIME(6)
);

CREATE TABLE attendance_correction_audit_logs (
    id CHAR(36) PRIMARY KEY,
    vendor_id CHAR(36) NOT NULL REFERENCES vendors(id),
    correction_request_id CHAR(36) NOT NULL REFERENCES attendance_correction_requests(id),
    actor_name VARCHAR(140) NOT NULL,
    action_type VARCHAR(40) NOT NULL,
    note VARCHAR(400),
    before_check_in_time DATETIME(6),
    before_check_out_time DATETIME(6),
    after_check_in_time DATETIME(6),
    after_check_out_time DATETIME(6),
    created_at DATETIME(6) NOT NULL
);

CREATE INDEX idx_attendance_corrections_vendor_id ON attendance_correction_requests(vendor_id);
CREATE INDEX idx_attendance_corrections_employee_date ON attendance_correction_requests(employee_id, attendance_date);
CREATE INDEX idx_attendance_corrections_status ON attendance_correction_requests(status);
CREATE INDEX idx_attendance_correction_audit_request ON attendance_correction_audit_logs(correction_request_id);
