ALTER TABLE branches
    ADD COLUMN weekly_off_mode VARCHAR(30) NOT NULL DEFAULT 'FIXED',
    ADD COLUMN weekly_off_days_csv VARCHAR(120) NOT NULL DEFAULT 'SUNDAY';

CREATE TABLE roster_shifts (
    id CHAR(36) PRIMARY KEY,
    vendor_id CHAR(36) NOT NULL REFERENCES vendors(id),
    branch_id CHAR(36) NOT NULL REFERENCES branches(id),
    code VARCHAR(40) NOT NULL,
    name VARCHAR(120) NOT NULL,
    description VARCHAR(500) NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    crosses_midnight BOOLEAN NOT NULL DEFAULT FALSE,
    work_minutes INT NOT NULL,
    break_minutes INT NOT NULL DEFAULT 0,
    required_headcount INT NOT NULL DEFAULT 1,
    color_hex VARCHAR(7) NOT NULL DEFAULT '#2563EB',
    active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP NOT NULL,
    updated_at TIMESTAMP NOT NULL,
    CONSTRAINT uk_roster_shift_vendor_branch_code UNIQUE (vendor_id, branch_id, code)
);

CREATE TABLE roster_templates (
    id CHAR(36) PRIMARY KEY,
    vendor_id CHAR(36) NOT NULL REFERENCES vendors(id),
    branch_id CHAR(36) NULL REFERENCES branches(id),
    name VARCHAR(160) NOT NULL,
    industry_type VARCHAR(60) NOT NULL,
    rotation_type VARCHAR(40) NOT NULL,
    weekly_off_mode VARCHAR(30) NOT NULL,
    weekly_off_days_csv VARCHAR(120) NOT NULL,
    shift_ids_csv VARCHAR(1000) NOT NULL,
    max_consecutive_night_shifts INT NOT NULL DEFAULT 2,
    min_rest_hours INT NOT NULL DEFAULT 10,
    holiday_policy VARCHAR(40) NOT NULL DEFAULT 'COMP_OFF_OR_PREMIUM',
    description VARCHAR(1000) NULL,
    active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP NOT NULL,
    updated_at TIMESTAMP NOT NULL
);

CREATE TABLE roster_assignments (
    id CHAR(36) PRIMARY KEY,
    vendor_id CHAR(36) NOT NULL REFERENCES vendors(id),
    branch_id CHAR(36) NOT NULL REFERENCES branches(id),
    employee_id CHAR(36) NOT NULL REFERENCES employees(id),
    roster_shift_id CHAR(36) NOT NULL REFERENCES roster_shifts(id),
    assignment_date DATE NOT NULL,
    assignment_type VARCHAR(30) NOT NULL DEFAULT 'WORKING',
    status VARCHAR(30) NOT NULL DEFAULT 'DRAFT',
    notes VARCHAR(500) NULL,
    created_at TIMESTAMP NOT NULL,
    updated_at TIMESTAMP NOT NULL,
    CONSTRAINT uk_roster_assignment_employee_date_shift UNIQUE (employee_id, assignment_date, roster_shift_id)
);

CREATE INDEX idx_roster_shifts_vendor_branch ON roster_shifts(vendor_id, branch_id);
CREATE INDEX idx_roster_templates_vendor_branch ON roster_templates(vendor_id, branch_id);
CREATE INDEX idx_roster_assignments_vendor_date ON roster_assignments(vendor_id, assignment_date);
CREATE INDEX idx_roster_assignments_branch_date ON roster_assignments(branch_id, assignment_date);
