CREATE TABLE attendance_location_logs (
    id CHAR(36) PRIMARY KEY,
    vendor_id CHAR(36) NOT NULL REFERENCES vendors(id),
    employee_id CHAR(36) NOT NULL REFERENCES employees(id),
    attendance_record_id CHAR(36) NOT NULL REFERENCES attendance_records(id),
    latitude NUMERIC(10,7) NOT NULL,
    longitude NUMERIC(10,7) NOT NULL,
    accuracy_meters NUMERIC(8,2),
    captured_at DATETIME(6) NOT NULL
);

CREATE INDEX idx_tracking_vendor_date ON attendance_location_logs(vendor_id, captured_at);
CREATE INDEX idx_tracking_record_captured ON attendance_location_logs(attendance_record_id, captured_at);
CREATE INDEX idx_tracking_employee_captured ON attendance_location_logs(employee_id, captured_at);
