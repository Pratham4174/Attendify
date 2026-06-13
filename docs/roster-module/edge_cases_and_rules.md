# PART 8: Edge Cases & Business Rules

## Employee joins mid-month
- Employee gets effective joining date.
- Auto-generation ignores days before joining.
- Existing published roster remains historical.
- Manager can run:
  - `suggest-fill-slots` for remaining month
  - `assign-from-date`

## Employee resigns mid-month
- Set relieving date.
- Future roster assignments after relieving date are cancelled automatically.
- Historical assignments remain untouched for audit and payroll.

## Sudden leave
- Mark emergency leave.
- System runs replacement suggestion:
  - same role
  - same site or branch eligible
  - not on weekly off
  - enough rest gap
  - lowest recent overtime first

## Festival season
- Introduce `skeleton staff template`.
- During Diwali, Dussehra, Lohri, Baisakhi:
  - mark high-footfall businesses as premium demand
  - reduce offices/schools
  - increase hotel, retail, restaurant, pump coverage

## Government strike / bandh
- Allow branch-level bulk holiday creation.
- Mass-convert a date to:
  - holiday off
  - emergency skeleton staff

## Employee works on weekly off
- Business rule configurable:
  - comp off earned
  - overtime payout
  - premium day multiplier

## Power cut / system down
- Manager should have last published roster cached offline on device.
- Frontend can cache:
  - current month
  - next 7 days
  - PDF snapshot

## Multi-location business
- Each assignment carries `site_code` or `branch_id`.
- Cross-site shift allowed only if:
  - employee site-eligible
  - travel buffer valid
  - same-day overlap absent

## Probation employees
- Rule examples:
  - no night shift for first 90 days
  - no solo site posting
  - no on-call critical duty

## Female employees
- Indian SMB-safe baseline:
  - no night shift after `20:00` without explicit consent
  - security and safe commute arrangement must be confirmed
- Rule should be configurable by state/company policy.
