CREATE TABLE vendors (
    id CHAR(36) PRIMARY KEY,
    code VARCHAR(80) NOT NULL UNIQUE,
    name VARCHAR(140) NOT NULL,
    status VARCHAR(20) NOT NULL
);

CREATE TABLE branches (
    id CHAR(36) PRIMARY KEY,
    vendor_id CHAR(36) NOT NULL REFERENCES vendors(id),
    name VARCHAR(140) NOT NULL,
    address VARCHAR(220) NOT NULL,
    latitude NUMERIC(10,7) NOT NULL,
    longitude NUMERIC(10,7) NOT NULL,
    radius_meters NUMERIC(8,2) NOT NULL
);

CREATE TABLE employees (
    id CHAR(36) PRIMARY KEY,
    vendor_id CHAR(36) NOT NULL REFERENCES vendors(id),
    branch_id CHAR(36) NOT NULL REFERENCES branches(id),
    employee_code VARCHAR(60) NOT NULL,
    name VARCHAR(140) NOT NULL,
    email VARCHAR(160) NOT NULL UNIQUE,
    phone VARCHAR(30) NOT NULL,
    status VARCHAR(20) NOT NULL,
    designation VARCHAR(100) NOT NULL
);

CREATE TABLE app_users (
    id CHAR(36) PRIMARY KEY,
    vendor_id CHAR(36) NOT NULL REFERENCES vendors(id),
    employee_id CHAR(36) REFERENCES employees(id),
    name VARCHAR(140) NOT NULL,
    email VARCHAR(160) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL,
    active BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE attendance_records (
    id CHAR(36) PRIMARY KEY,
    vendor_id CHAR(36) NOT NULL REFERENCES vendors(id),
    employee_id CHAR(36) NOT NULL REFERENCES employees(id),
    branch_id CHAR(36) NOT NULL REFERENCES branches(id),
    attendance_date DATE NOT NULL,
    check_in_time DATETIME(6) NOT NULL,
    check_out_time DATETIME(6),
    check_in_latitude NUMERIC(10,7) NOT NULL,
    check_in_longitude NUMERIC(10,7) NOT NULL,
    check_out_latitude NUMERIC(10,7),
    check_out_longitude NUMERIC(10,7),
    check_in_distance_meters NUMERIC(8,2) NOT NULL,
    check_out_distance_meters NUMERIC(8,2),
    check_in_photo_ref TEXT,
    check_out_photo_ref TEXT,
    status VARCHAR(20) NOT NULL
);

CREATE INDEX idx_branches_vendor_id ON branches(vendor_id);
CREATE INDEX idx_employees_vendor_id ON employees(vendor_id);
CREATE INDEX idx_employees_vendor_branch ON employees(vendor_id, branch_id);
CREATE INDEX idx_app_users_vendor_id ON app_users(vendor_id);
CREATE INDEX idx_attendance_vendor_date ON attendance_records(vendor_id, attendance_date);
CREATE INDEX idx_attendance_vendor_employee_date ON attendance_records(vendor_id, employee_id, attendance_date);
CREATE INDEX idx_attendance_vendor_branch_date ON attendance_records(vendor_id, branch_id, attendance_date);
