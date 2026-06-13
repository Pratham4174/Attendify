-- PART 2: Database Schema (PostgreSQL)
-- Peeplify roster management module

create extension if not exists "pgcrypto";

create type roster_rotation_type as enum (
  'FIXED',
  'WEEKLY_ROTATING',
  'MONTHLY_ROTATING',
  'ON_CALL',
  'FLEXI',
  'SEASONAL',
  'PART_TIME',
  'FULL_24X7'
);

create type roster_assignment_type as enum (
  'WORKING',
  'WEEKLY_OFF',
  'HOLIDAY_OFF',
  'LEAVE',
  'ON_CALL',
  'TRAINING',
  'UNAVAILABLE'
);

create type roster_publication_status as enum (
  'DRAFT',
  'PUBLISHED',
  'ARCHIVED'
);

create type swap_request_status as enum (
  'PENDING',
  'APPROVED',
  'REJECTED',
  'CANCELLED'
);

create type holiday_policy_type as enum (
  'OFF',
  'WORKING_PREMIUM_PAY',
  'COMP_OFF',
  'SITE_POLICY'
);

create table shifts (
  id uuid primary key default gen_random_uuid(),
  vendor_id uuid not null,
  branch_id uuid not null,
  code varchar(40) not null,
  name varchar(120) not null,
  description text,
  start_time time not null,
  end_time time not null,
  crosses_midnight boolean not null default false,
  work_minutes integer not null,
  break_minutes integer not null default 0,
  unpaid_break_minutes integer not null default 0,
  buffer_before_minutes integer not null default 0,
  buffer_after_minutes integer not null default 0,
  flexi_start_time time,
  flexi_end_time time,
  core_start_time time,
  core_end_time time,
  overtime_trigger_minutes integer,
  weekly_overtime_trigger_minutes integer,
  holiday_policy holiday_policy_type not null default 'SITE_POLICY',
  is_on_call boolean not null default false,
  is_split_shift boolean not null default false,
  split_segments jsonb not null default '[]'::jsonb,
  color_hex varchar(7) not null default '#2563eb',
  role_requirements jsonb not null default '[]'::jsonb,
  active boolean not null default true,
  created_by uuid,
  updated_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (vendor_id, branch_id, code)
);

create index idx_shifts_vendor_branch on shifts(vendor_id, branch_id);
create index idx_shifts_active on shifts(vendor_id, active);

create table roster_templates (
  id uuid primary key default gen_random_uuid(),
  vendor_id uuid not null,
  branch_id uuid,
  name varchar(160) not null,
  industry_type varchar(60) not null,
  template_code varchar(50) not null,
  rotation_type roster_rotation_type not null,
  weekly_off_pattern varchar(80) not null,
  season_type varchar(40) not null default 'ALL_YEAR',
  effective_from date,
  effective_to date,
  is_default boolean not null default false,
  description text,
  template_rules jsonb not null default '{}'::jsonb,
  shift_blueprints jsonb not null default '[]'::jsonb,
  staff_requirements jsonb not null default '[]'::jsonb,
  holiday_overrides jsonb not null default '[]'::jsonb,
  active boolean not null default true,
  created_by uuid,
  updated_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (vendor_id, template_code)
);

create index idx_roster_templates_vendor on roster_templates(vendor_id);
create index idx_roster_templates_branch on roster_templates(branch_id);
create index idx_roster_templates_industry on roster_templates(vendor_id, industry_type);

create table roster_constraints (
  id uuid primary key default gen_random_uuid(),
  vendor_id uuid not null,
  branch_id uuid,
  template_id uuid references roster_templates(id) on delete cascade,
  name varchar(140) not null,
  constraint_code varchar(60) not null,
  applies_to_role_code varchar(60),
  applies_to_gender varchar(20),
  applies_to_employment_type varchar(30),
  priority integer not null default 50,
  hard_constraint boolean not null default true,
  config jsonb not null,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (vendor_id, constraint_code, coalesce(branch_id, '00000000-0000-0000-0000-000000000000'::uuid))
);

create index idx_roster_constraints_vendor_branch on roster_constraints(vendor_id, branch_id);
create index idx_roster_constraints_template on roster_constraints(template_id);

create table holidays (
  id uuid primary key default gen_random_uuid(),
  vendor_id uuid not null,
  branch_id uuid,
  holiday_date date not null,
  name varchar(160) not null,
  holiday_type varchar(40) not null,
  state_code varchar(20),
  applies_to_all_branches boolean not null default true,
  holiday_policy holiday_policy_type not null default 'OFF',
  premium_multiplier numeric(5,2),
  compensatory_off_enabled boolean not null default false,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (vendor_id, coalesce(branch_id, '00000000-0000-0000-0000-000000000000'::uuid), holiday_date, name)
);

create index idx_holidays_vendor_date on holidays(vendor_id, holiday_date);
create index idx_holidays_branch_date on holidays(branch_id, holiday_date);

create table weekly_off_config (
  id uuid primary key default gen_random_uuid(),
  vendor_id uuid not null,
  employee_id uuid not null,
  branch_id uuid not null,
  off_pattern_type varchar(50) not null,
  fixed_days jsonb not null default '[]'::jsonb,
  rotational_cycle_days integer,
  alternate_week_pattern jsonb not null default '{}'::jsonb,
  effective_from date not null,
  effective_to date,
  compensatory_off_enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_weekly_off_employee on weekly_off_config(employee_id, effective_from);
create index idx_weekly_off_vendor_branch on weekly_off_config(vendor_id, branch_id);

create table roster_publications (
  id uuid primary key default gen_random_uuid(),
  vendor_id uuid not null,
  branch_id uuid not null,
  month_key varchar(7) not null,
  status roster_publication_status not null default 'DRAFT',
  template_id uuid references roster_templates(id),
  generated_at timestamptz,
  generated_by uuid,
  published_at timestamptz,
  published_by uuid,
  notify_channels jsonb not null default '[]'::jsonb,
  publication_notes text,
  conflict_summary jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (vendor_id, branch_id, month_key, status)
);

create index idx_roster_publications_branch_month on roster_publications(branch_id, month_key);

create table roster_assignments (
  id uuid primary key default gen_random_uuid(),
  vendor_id uuid not null,
  branch_id uuid not null,
  publication_id uuid references roster_publications(id) on delete set null,
  template_id uuid references roster_templates(id) on delete set null,
  employee_id uuid not null,
  shift_id uuid references shifts(id) on delete restrict,
  assignment_date date not null,
  assignment_type roster_assignment_type not null default 'WORKING',
  role_code varchar(60),
  department_code varchar(60),
  site_code varchar(60),
  start_time time,
  end_time time,
  crosses_midnight boolean not null default false,
  required_staff_count integer,
  skill_tags jsonb not null default '[]'::jsonb,
  status varchar(30) not null default 'ASSIGNED',
  is_manual_override boolean not null default false,
  override_reason text,
  source varchar(30) not null default 'MANUAL',
  notes text,
  created_by uuid,
  updated_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (employee_id, assignment_date, start_time, end_time)
);

create index idx_roster_assignments_vendor_date on roster_assignments(vendor_id, assignment_date);
create index idx_roster_assignments_employee_date on roster_assignments(employee_id, assignment_date);
create index idx_roster_assignments_branch_date on roster_assignments(branch_id, assignment_date);
create index idx_roster_assignments_publication on roster_assignments(publication_id);

create table on_call_assignments (
  id uuid primary key default gen_random_uuid(),
  vendor_id uuid not null,
  branch_id uuid not null,
  employee_id uuid not null,
  assignment_date date not null,
  on_call_start timestamptz not null,
  on_call_end timestamptz not null,
  specialty_code varchar(60),
  standby_allowance numeric(12,2) default 0,
  was_called_in boolean not null default false,
  actual_work_minutes integer not null default 0,
  linked_assignment_id uuid references roster_assignments(id) on delete set null,
  notes text,
  created_at timestamptz not null default now()
);

create index idx_on_call_assignments_employee on on_call_assignments(employee_id, assignment_date);
create index idx_on_call_assignments_branch on on_call_assignments(branch_id, assignment_date);

create table shift_swap_requests (
  id uuid primary key default gen_random_uuid(),
  vendor_id uuid not null,
  branch_id uuid not null,
  requester_employee_id uuid not null,
  target_employee_id uuid not null,
  requester_assignment_id uuid not null references roster_assignments(id) on delete cascade,
  target_assignment_id uuid not null references roster_assignments(id) on delete cascade,
  requested_at timestamptz not null default now(),
  status swap_request_status not null default 'PENDING',
  reason text not null,
  manager_note text,
  reviewed_by uuid,
  reviewed_at timestamptz,
  conflict_snapshot jsonb not null default '[]'::jsonb
);

create index idx_shift_swap_requests_status on shift_swap_requests(vendor_id, status, requested_at desc);
create index idx_shift_swap_requests_requester on shift_swap_requests(requester_employee_id, requested_at desc);

create table roster_conflicts (
  id uuid primary key default gen_random_uuid(),
  vendor_id uuid not null,
  branch_id uuid not null,
  publication_id uuid references roster_publications(id) on delete cascade,
  assignment_id uuid references roster_assignments(id) on delete cascade,
  conflict_type varchar(60) not null,
  severity varchar(20) not null,
  conflict_date date not null,
  employee_id uuid,
  shift_id uuid,
  message text not null,
  details jsonb not null default '{}'::jsonb,
  resolved boolean not null default false,
  resolved_by uuid,
  resolved_at timestamptz,
  created_at timestamptz not null default now()
);

create index idx_roster_conflicts_publication on roster_conflicts(publication_id, resolved);
create index idx_roster_conflicts_branch_date on roster_conflicts(branch_id, conflict_date);
