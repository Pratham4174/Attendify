# PART 9: Attendance Integration

## Late vs On Time
- Attendance compares actual check-in against rostered shift start.
- Formula:
  - `late_minutes = actual_check_in - scheduled_shift_start - grace_minutes`
- If employee has flexi shift:
  - compare against chosen or approved shift start.

## Overtime
- Overtime begins when actual worked minutes exceed:
  - scheduled shift work minutes
  - or company overtime threshold
  - or weekly threshold like 48 hours
- Split shifts sum both active work blocks.
- On-call time is separate from active work unless called in.

## Early departure
- Formula:
  - `early_departure_minutes = scheduled_shift_end - actual_check_out`
- If employee leaves before minimum full-day threshold, payroll impact can be half-day or absent based on branch policy.

## Different shift than rostered
- Compare actual attendance window to assigned shift.
- Outcomes:
  - exact match
  - worked adjacent shift
  - unscheduled attendance
  - missing assigned shift
- Manager can regularize and relabel.

## Biometric / QR / GPS mapping
- Biometric maps by employee ID + timestamp to nearest valid shift window.
- QR attendance maps by branch/site and timestamp.
- GPS attendance validates:
  - branch location
  - rostered branch/site
  - active shift slot

## Daily exception report
- For each employee and shift:
  - absent
  - late
  - early departure
  - overtime
  - wrong shift worked
  - no checkout
  - worked on weekly off
  - worked on holiday

## Suggested Peeplify exception flow
1. Build daily roster summary at midnight.
2. Map attendance events to roster slots in real time.
3. Generate exception cards for managers by 30-minute scheduler.
4. Push unresolved exceptions into payroll summary.
