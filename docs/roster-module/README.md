# Peeplify Roster Management Module

This package defines a production-ready roster module for Peeplify's Indian SMB market, covering:

- hospitals, clinics, diagnostic centres
- hotels, guest houses, restaurants, banquet halls
- manufacturing units and factories
- schools, colleges, coaching institutes
- retail shops and supermarkets
- security and housekeeping agencies
- petrol pumps and auto workshops
- IT companies and offices
- pharmacies and medical stores
- salons, gyms, and fitness centres

## Deliverables

- [PART 1 + PART 5: industry roster types and templates](./roster_types_and_templates.md)
- [PART 2: PostgreSQL schema](./roster_schema_postgresql.sql)
- [PART 3: API design](./roster_api_spec.md)
- [PART 4: auto-generation algorithm](./roster_auto_generator.py)
- [PART 6: React UI components](../../frontend/src/components/roster/PeeplifyRosterDemo.tsx)
- [PART 7: WhatsApp templates](./whatsapp_templates.md)
- [PART 8: edge cases and business rules](./edge_cases_and_rules.md)
- [PART 9: attendance integration](./attendance_integration.md)

## Implementation Notes For Peeplify

- Current Peeplify backend is Spring Boot with JPA entities around `vendors`, `branches`, `employees`, `attendance_records`, and `leave_requests`.
- Current production app is MariaDB-oriented, while this module uses PostgreSQL schema because the roster engine benefits from JSONB, generated indexes, and richer date/time querying.
- The roster module should be introduced as a new bounded context:
  - `roster_templates`
  - `shift_definitions`
  - `roster_assignments`
  - `shift_swap_requests`
  - `roster_publications`
  - `roster_conflicts`
- Frontend code is provided as reusable React components using Tailwind-style classes and realistic Indian dummy data.

## Suggested Rollout Order

1. Create roster schema and repositories.
2. Build shift definitions and roster template CRUD.
3. Implement roster auto-generation and conflict detection.
4. Add admin monthly grid and coverage dashboard.
5. Add publish flow and WhatsApp notifications.
6. Wire roster rules into attendance exceptions and overtime.
