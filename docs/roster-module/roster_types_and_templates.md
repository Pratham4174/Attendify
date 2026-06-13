# PART 1: Roster Types by Industry

## Universal Roster Types Used Across Industries

### 1. Fixed Shift Roster
- Roster type name: Fixed Day Shift
- Shift structure: 1 shift, usually `09:00-18:00`, 8 working hours + 1 hour break
- Rotation pattern: fixed
- Weekly off logic: 1 weekly off, usually Sunday
- Minimum staff per shift: defined by department
- Special rules:
  - no change in shift unless manually assigned
  - useful for reception, billing, office admin
- Overtime trigger:
  - after 9 hours in a day
  - after 48 hours in a week
- Holiday handling:
  - gazetted holiday usually off
  - if worked, marked as overtime or compensatory off

### 2. Rotating Shift Roster
- Roster type name: Weekly Rotating 3-Shift
- Shift structure:
  - Morning `06:00-14:00`
  - Evening `14:00-22:00`
  - Night `22:00-06:00`
- Rotation pattern: weekly or monthly rotating
- Weekly off logic: rotational off
- Minimum staff per shift: based on demand and site rules
- Special rules:
  - no more than 2 consecutive night shifts in SMB version
  - minimum 10 hours rest between shifts
- Overtime trigger:
  - after scheduled shift hours
  - or after 48 hours per week
- Holiday handling:
  - 24x7 units continue operations
  - work on holiday earns holiday pay multiplier or comp off

### 3. Split Shift Roster
- Roster type name: Split Service Shift
- Shift structure:
  - Morning block `07:00-11:00`
  - Evening block `17:00-22:00`
- Rotation pattern: fixed or weekly rotating
- Weekly off logic: 1 off or rotational off
- Minimum staff per shift: role-specific
- Special rules:
  - total paid hours should be explicit
  - long mid-day break is not treated as paid working time
- Overtime trigger:
  - after total daily scheduled hours
- Holiday handling:
  - if restaurant/pump is open, holiday shift counts as premium day

### 4. On-Call Roster
- Roster type name: On-Call Clinical Duty
- Shift structure:
  - Primary shift plus on-call window
  - example `08:00-16:00 + on-call 16:00-22:00`
- Rotation pattern: rotational
- Weekly off logic: rotational off
- Minimum staff per shift:
  - one active role holder
  - one backup on-call role holder if critical
- Special rules:
  - on-call is not equal to regular working shift
  - if called in, actual work duration must be logged
- Overtime trigger:
  - after actual worked hours beyond scheduled duty
- Holiday handling:
  - on-call allowance plus active work payout if called

### 5. Flexi Roster
- Roster type name: Flexible Start Window
- Shift structure:
  - employee chooses start between `08:00-11:00`
  - must complete 8 or 9 hours
- Rotation pattern: self-selected within policy
- Weekly off logic: fixed or flexible
- Minimum staff per shift:
  - core overlap coverage required, e.g. `11:00-16:00`
- Special rules:
  - late logic is relative to chosen shift
  - not suitable for front-desk or pumps
- Overtime trigger:
  - after approved daily hours
- Holiday handling:
  - usually off in offices/IT

### 6. Seasonal Roster
- Roster type name: Peak Season Extended Coverage
- Shift structure:
  - off-season standard shifts
  - peak season extra late shift or denser staffing
- Rotation pattern: season-based
- Weekly off logic: rotational off during peak periods
- Minimum staff per shift:
  - raised during season
- Special rules:
  - peak calendars configurable per site
  - hotels near Dalhousie or Jammu routes need this
- Overtime trigger:
  - after scheduled seasonal hours
- Holiday handling:
  - often work-heavy, premium pay recommended

### 7. Part-Time Roster
- Roster type name: Part-Time Block Shift
- Shift structure:
  - `4 to 6` hour blocks
- Rotation pattern: fixed or rotating
- Weekly off logic: contract-based
- Minimum staff per shift: role-specific
- Special rules:
  - must not exceed contractual limit without approval
- Overtime trigger:
  - beyond contracted daily or weekly hours
- Holiday handling:
  - depends on contract policy

### 8. 24x7 Roster
- Roster type name: Full Coverage Continuous Duty
- Shift structure:
  - typically 3 shifts of 8 hours
  - or 2 shifts of 12 hours for select security/industrial settings
- Rotation pattern: rotating
- Weekly off logic: rotational off
- Minimum staff per shift: must never be zero
- Special rules:
  - no coverage gap
  - fallback employee or float pool required
- Overtime trigger:
  - beyond scheduled shift
- Holiday handling:
  - operational coverage mandatory; holiday pay or comp off

## Industry-Specific Roster Design

### Hospitals, Nursing Homes, Clinics, Diagnostic Centres

#### Roster Type: Clinical 24x7 Coverage
- Shift structure:
  - Morning `06:00-14:00`
  - Evening `14:00-22:00`
  - Night `22:00-06:00`
- Rotation pattern: weekly rotating for nurses, fixed for reception in smaller clinics
- Weekly off logic: rotational off
- Minimum staff per shift:
  - at least 2 nurses on morning
  - 1 nurse on evening
  - 1 nurse + 1 ward support on night in small facility
- Special rules:
  - no nurse more than 2 consecutive night shifts
  - doctors can be fixed day shift + on-call
  - female employee night shift requires consent and pickup/security arrangement
- Overtime trigger:
  - after 8 scheduled hours
- Holiday handling:
  - hospital remains operational
  - holiday work is either double-pay policy or comp off + allowance

#### Roster Type: On-Call Specialist Roster
- Shift structure: fixed daytime + on-call window
- Rotation pattern: rotating among doctors/lab technicians
- Weekly off logic: no fixed off for on-call, but compensatory rest required
- Minimum staff per shift: 1 specialist available on-call
- Special rules:
  - response time SLA should be tracked
  - actual call-in minutes payable

### Hotels, Guest Houses, Restaurants, Banquet Halls

#### Roster Type: Hospitality Split + Rotating
- Shift structure:
  - Front desk day `07:00-15:00`
  - Front desk evening `15:00-23:00`
  - Security night `23:00-07:00`
  - Restaurant split `07:00-11:00` and `18:00-23:00`
- Rotation pattern: weekly rotating for service staff
- Weekly off logic: rotational off
- Minimum staff per shift:
  - hotel reception at least 1
  - housekeeping at least 2 in morning
  - banquet special event staffing variable
- Special rules:
  - banquet events can create ad-hoc event rosters
  - peak season adds extra late coverage
- Overtime trigger:
  - after scheduled block total
- Holiday handling:
  - holidays are high-demand workdays
  - premium payout or weekly comp off recommended

### Manufacturing Units, Factories, Industrial Plants

#### Roster Type: Rotating 3-Shift Plant
- Shift structure:
  - A `06:00-14:00`
  - B `14:00-22:00`
  - C `22:00-06:00`
- Rotation pattern: weekly rotating
- Weekly off logic: rotational off
- Minimum staff per shift:
  - depends on line
  - example production 6, QC 1, supervisor 1, security 1
- Special rules:
  - max 2 consecutive nights for SMB-safe baseline
  - min 12 hours rest after night before day shift
  - probation staff can be restricted from nights
- Overtime trigger:
  - after 8 hours or 48 hours/week
- Holiday handling:
  - plant may operate on reduced crew
  - holiday shifts tagged for higher payout

### Schools, Colleges, Coaching Institutes, Training Centres

#### Roster Type: Academic Fixed + Period-Based
- Shift structure:
  - Teachers `07:45-14:30`
  - Admin `09:00-17:00`
  - Security `24x7` or day/evening split
- Rotation pattern: mostly fixed
- Weekly off logic: Sunday off, alternate Saturday if school policy
- Minimum staff per shift:
  - class coverage based on subject timetable
  - admin at least 1
- Special rules:
  - teachers may be rostered period-wise
  - exam season extends duty
- Overtime trigger:
  - after official schedule or events/exam duty
- Holiday handling:
  - usually off, except events/exams

### Retail Shops, Supermarkets, Showrooms

#### Roster Type: Retail Opening-to-Closing
- Shift structure:
  - Opening `09:30-18:00`
  - Closing `13:00-21:30`
- Rotation pattern: weekly rotating
- Weekly off logic: rotational weekday off
- Minimum staff per shift:
  - 1 billing
  - 2 floor staff during peak evening
- Special rules:
  - weekends and sale days need stronger evening coverage
- Overtime trigger:
  - beyond 9 hours/day or 48/week
- Holiday handling:
  - many holidays are sale days, premium staffing

### Security Agencies, Housekeeping Services

#### Roster Type: Multi-Site 24x7 Guard Rotation
- Shift structure:
  - Day `06:00-14:00`
  - Evening `14:00-22:00`
  - Night `22:00-06:00`
- Rotation pattern: weekly rotating + site posting rotation
- Weekly off logic: rotational off
- Minimum staff per shift:
  - per site contractual headcount
- Special rules:
  - avoid same site post too long if client rotates staff
  - reserve reliever pool required
- Overtime trigger:
  - beyond contracted duty hours
- Holiday handling:
  - site coverage mandatory, premium or replacement off

### Petrol Pumps, Auto Workshops

#### Roster Type: Pump Split Shift
- Shift structure:
  - Morning `06:00-14:00`
  - Evening `14:00-22:00`
  - Split `06:00-10:00` and `17:00-21:00`
- Rotation pattern: fixed or weekly rotating
- Weekly off logic: rotational
- Minimum staff per shift:
  - 2 attendants in busy daytime
  - 1 cashier
- Special rules:
  - stock dip/closing handover must be overlap-protected
- Overtime trigger:
  - beyond scheduled hours
- Holiday handling:
  - usually operational on holidays

### IT Companies, Consultancies, Offices

#### Roster Type: Flexi Core Hours
- Shift structure:
  - flexible start between `08:00-11:00`
  - core hours `11:00-16:00`
- Rotation pattern: flexi/fixed hybrid
- Weekly off logic: weekend off
- Minimum staff per shift:
  - client support desk may need fixed coverage
- Special rules:
  - WFH/hybrid roster possible later
- Overtime trigger:
  - only approved over scheduled hours
- Holiday handling:
  - office holidays off

### Pharmacies, Medical Stores

#### Roster Type: Extended Counter Coverage
- Shift structure:
  - Day `08:00-16:00`
  - Evening `16:00-00:00`
  - or single long-day with overlap in smaller stores
- Rotation pattern: fixed or weekly rotating
- Weekly off logic: rotational
- Minimum staff per shift:
  - at least 1 licensed pharmacist when legally required
- Special rules:
  - pharmacist presence rule
  - late-night security consideration
- Overtime trigger:
  - after scheduled hours
- Holiday handling:
  - may remain open on holidays

### Salons, Gyms, Fitness Centres

#### Roster Type: Peak-Hour Split Coverage
- Shift structure:
  - Morning peak `06:00-11:00`
  - Mid `11:00-16:00`
  - Evening peak `16:00-22:00`
- Rotation pattern: fixed or rotating
- Weekly off logic: weekday off
- Minimum staff per shift:
  - gym trainer minimum 1 in each peak block
  - salon stylist ratio based on appointments
- Special rules:
  - high demand morning and evening
  - split shift common
- Overtime trigger:
  - beyond total daily assigned hours
- Holiday handling:
  - many holidays remain business days

# PART 5: Industry Templates (Detailed)

## 1. Small Hospital (20-40 staff)

### Roles
- Doctors
- Nurses
- Ward boys
- Receptionist
- Lab technician

### Shift names and timings
- Morning Care: `06:00-14:00`
- Evening Care: `14:00-22:00`
- Night Care: `22:00-06:00`
- OPD Day: `09:00-17:00`
- On-Call Doctor: `17:00-22:00`

### Employees per shift
- Morning:
  - 1 doctor
  - 3 nurses
  - 2 ward boys
  - 1 receptionist
  - 1 lab technician
- Evening:
  - 1 doctor
  - 2 nurses
  - 1 ward boy
  - 1 receptionist
  - 1 lab technician
- Night:
  - 1 duty doctor on call or active
  - 2 nurses
  - 1 ward boy

### Rotation cycle
- Nurses: weekly rotating `M -> E -> N -> Off`
- Reception: fixed day/evening
- Lab: day/evening alternating

### Weekly off pattern
- 1 rotational off every 6 days

### Special rules
- no more than 2 consecutive night shifts
- minimum 10 hours rest between shifts
- female night duty only with consent/security

## 2. 3-Star Hotel (15-30 staff)

### Roles
- Front desk
- Housekeeping
- F&B
- Security
- Maintenance

### Shift names and timings
- Front Office Day: `07:00-15:00`
- Front Office Eve: `15:00-23:00`
- Housekeeping Core: `08:00-16:00`
- Restaurant Split: `07:00-11:00` and `18:00-23:00`
- Security Night: `23:00-07:00`

### Employees per shift
- Front desk: 1 each shift
- Housekeeping: 3 in morning, 1 support in evening
- F&B: 2 breakfast, 3 dinner
- Security: 1 each shift
- Maintenance: 1 day, 1 on-call

### Rotation cycle
- weekly rotating for front desk and F&B

### Weekly off pattern
- rotational weekday off

### Special rules
- banquet event shift can be added ad hoc
- peak tourist season adds one extra late support block

## 3. Factory / Manufacturing Unit (20-40 workers)

### Roles
- Production floor
- Quality control
- Supervisors
- Security

### Shift names and timings
- Shift A: `06:00-14:00`
- Shift B: `14:00-22:00`
- Shift C: `22:00-06:00`

### Employees per shift
- Production: 6
- QC: 1
- Supervisor: 1
- Security: 1

### Rotation cycle
- weekly `A -> B -> C -> A`

### Weekly off pattern
- rotational

### Special rules
- max 2 consecutive nights
- minimum 12 hours rest after night-to-day transition

## 4. Private School (15-40 staff)

### Roles
- Teachers
- Admin
- Peon
- Security
- Bus driver

### Shift names and timings
- Academic Day: `07:45-14:30`
- Admin Day: `08:30-16:30`
- Security Day: `07:00-15:00`
- Security Eve: `15:00-23:00`
- Transport Run AM: `06:30-09:00`
- Transport Run PM: `13:00-16:00`

### Employees per shift
- Teachers: subject timetable driven
- Admin: 2
- Peon: 2
- Security: 1 day, 1 evening
- Bus driver: per route

### Rotation cycle
- mostly fixed

### Weekly off pattern
- Sunday off
- alternate Saturday if policy

### Special rules
- exam duty and parent meeting can extend duty

## 5. Restaurant / Dhaba (10-20 staff)

### Roles
- Chef
- Kitchen helper
- Waiter
- Cashier
- Cleaner

### Shift names and timings
- Breakfast Prep: `06:00-11:00`
- Lunch Core: `11:00-16:00`
- Dinner Peak: `17:00-23:00`
- Split Service: `07:00-11:00` and `18:00-23:00`

### Employees per shift
- Chef: 1
- Helper: 1-2
- Waiters: 2-3 during dinner
- Cashier: 1
- Cleaner: 1

### Rotation cycle
- weekly rotating split shifts

### Weekly off pattern
- one rotational weekday off

### Special rules
- dinner peak cannot go understaffed
- festival evenings need extra temporary slots

## 6. Security Agency (20-50 guards)

### Roles
- Guards
- Shift in-charge
- Reliever guards

### Shift names and timings
- Day Guard: `06:00-14:00`
- Evening Guard: `14:00-22:00`
- Night Guard: `22:00-06:00`

### Employees per shift
- per site contract
- example Site A: 1 per shift
- Site B: 2 day, 2 night

### Rotation cycle
- weekly site + shift rotation

### Weekly off pattern
- rotational, using reliever pool

### Special rules
- avoid same employee doing only night for long blocks
- one reliever kept unassigned or low-loaded

## 7. Retail Store / Supermarket (10-25 staff)

### Roles
- Floor staff
- Billing
- Warehouse
- Manager

### Shift names and timings
- Opening: `09:30-18:00`
- Closing: `13:00-21:30`
- Store Support: `11:00-20:00`

### Employees per shift
- Floor staff: 2 opening, 3 closing
- Billing: 1 each
- Warehouse: 1 day
- Manager: 1 day

### Rotation cycle
- weekly rotating

### Weekly off pattern
- rotational weekday off

### Special rules
- weekends and sale days must increase closing shift strength

## 8. Petrol Pump (10-15 staff)

### Roles
- Attendants
- Cashier
- Manager

### Shift names and timings
- Pump Morning: `06:00-14:00`
- Pump Evening: `14:00-22:00`
- Split Peak: `06:00-10:00` and `17:00-21:00`

### Employees per shift
- Attendants: 2 morning, 2 evening
- Cashier: 1 day/evening
- Manager: 1 day

### Rotation cycle
- weekly rotating for attendants

### Weekly off pattern
- rotational

### Special rules
- overlap needed at cash handover
- stock closing requires same-site buffer

## 9. Coaching Institute (10-20 staff)

### Roles
- Faculty
- Admin
- Counsellor

### Shift names and timings
- School Batch: `08:00-13:00`
- Afternoon Batch: `14:00-18:00`
- Evening Batch: `18:00-21:00`
- Admin Day: `10:00-18:00`

### Employees per shift
- Faculty: by batch demand
- Admin: 1
- Counsellor: 1 in peak admission hours

### Rotation cycle
- faculty batch-wise rotation

### Weekly off pattern
- 1 weekly off, often Sunday or Monday

### Special rules
- exam season and admissions need temporary extended shifts

## 10. Gym / Fitness Centre (10-15 staff)

### Roles
- Trainers
- Receptionist
- Cleaning

### Shift names and timings
- Morning Peak: `05:30-11:00`
- Mid Support: `11:00-16:00`
- Evening Peak: `16:00-22:00`

### Employees per shift
- Trainers: 2 morning, 2 evening
- Reception: 1 opening, 1 evening
- Cleaning: 1 between blocks

### Rotation cycle
- trainers alternate morning/evening weekly

### Weekly off pattern
- one weekday off

### Special rules
- split trainer schedules are common
- Sundays may have reduced hours template
