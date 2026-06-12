ALTER TABLE vendors
    ADD COLUMN subscription_plan_code VARCHAR(40) NULL,
    ADD COLUMN subscription_billing_cycle VARCHAR(20) NULL,
    ADD COLUMN subscription_status VARCHAR(20) NULL,
    ADD COLUMN max_employees INT NULL,
    ADD COLUMN max_branches INT NULL,
    ADD COLUMN trial_ends_at TIMESTAMP NULL,
    ADD COLUMN access_expires_at TIMESTAMP NULL;

CREATE TABLE public_checkout_sessions (
    id CHAR(36) PRIMARY KEY,
    plan_code VARCHAR(40) NOT NULL,
    billing_cycle VARCHAR(20) NOT NULL,
    access_mode VARCHAR(20) NOT NULL,
    status VARCHAR(20) NOT NULL,
    customer_name VARCHAR(140) NOT NULL,
    customer_email VARCHAR(160) NOT NULL,
    customer_phone VARCHAR(30) NOT NULL,
    company_name VARCHAR(140) NOT NULL,
    employee_count INT NOT NULL,
    amount DECIMAL(12,2) NOT NULL,
    currency VARCHAR(8) NOT NULL,
    cashfree_order_id VARCHAR(80) NULL UNIQUE,
    payment_session_id VARCHAR(160) NULL,
    payment_status VARCHAR(20) NULL,
    trial_ends_at TIMESTAMP NULL,
    access_expires_at TIMESTAMP NULL,
    created_at TIMESTAMP NOT NULL,
    verified_at TIMESTAMP NULL,
    vendor_id CHAR(36) NULL,
    CONSTRAINT fk_public_checkout_vendor FOREIGN KEY (vendor_id) REFERENCES vendors(id)
);

CREATE TABLE sales_inquiries (
    id CHAR(36) PRIMARY KEY,
    contact_name VARCHAR(140) NOT NULL,
    contact_email VARCHAR(160) NOT NULL,
    contact_phone VARCHAR(30) NOT NULL,
    company_name VARCHAR(140) NOT NULL,
    employee_count INT NOT NULL,
    message VARCHAR(1000) NULL,
    created_at TIMESTAMP NOT NULL
);
