CREATE TABLE shift_swap_requests (
    id CHAR(36) PRIMARY KEY,
    vendor_id CHAR(36) NOT NULL REFERENCES vendors(id),
    branch_id CHAR(36) NOT NULL REFERENCES branches(id),
    requester_employee_id CHAR(36) NOT NULL REFERENCES employees(id),
    target_employee_id CHAR(36) NOT NULL REFERENCES employees(id),
    requester_assignment_id CHAR(36) NOT NULL REFERENCES roster_assignments(id),
    target_assignment_id CHAR(36) NOT NULL REFERENCES roster_assignments(id),
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    reason VARCHAR(1000) NOT NULL,
    review_note VARCHAR(1000) NULL,
    reviewed_by_user_id CHAR(36) NULL REFERENCES app_users(id),
    requested_at TIMESTAMP NOT NULL,
    reviewed_at TIMESTAMP NULL
);

CREATE TABLE roster_edit_audit_logs (
    id CHAR(36) PRIMARY KEY,
    vendor_id CHAR(36) NOT NULL REFERENCES vendors(id),
    branch_id CHAR(36) NULL REFERENCES branches(id),
    actor_user_id CHAR(36) NULL REFERENCES app_users(id),
    actor_role VARCHAR(30) NOT NULL,
    action_type VARCHAR(40) NOT NULL,
    target_type VARCHAR(40) NOT NULL,
    target_id CHAR(36) NOT NULL,
    action_note VARCHAR(1000) NULL,
    before_snapshot LONGTEXT NULL,
    after_snapshot LONGTEXT NULL,
    created_at TIMESTAMP NOT NULL
);

CREATE INDEX idx_shift_swap_requests_vendor_status ON shift_swap_requests(vendor_id, status, requested_at);
CREATE INDEX idx_roster_edit_audit_vendor_created ON roster_edit_audit_logs(vendor_id, created_at);
