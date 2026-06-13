# PART 3: API Endpoints

Base path suggestion: `/api/roster`

All endpoints are scoped to the authenticated vendor. Branch-level authorization can be layered later for branch managers.

## 1. Create Shift Definition

- Method and URL: `POST /api/roster/shifts`

### Request body
```json
{
  "branchId": "uuid",
  "name": "Morning Care",
  "code": "MORN",
  "startTime": "06:00",
  "endTime": "14:00",
  "crossesMidnight": false,
  "workMinutes": 480,
  "breakMinutes": 30,
  "bufferBeforeMinutes": 15,
  "bufferAfterMinutes": 15,
  "colorHex": "#2563eb",
  "isOnCall": false,
  "isSplitShift": false,
  "splitSegments": [],
  "roleRequirements": [
    {
      "roleCode": "NURSE",
      "minCount": 2,
      "idealCount": 3
    }
  ]
}
```

### Response
```json
{
  "id": "uuid",
  "message": "Shift created successfully."
}
```

### Business logic
- Validates timing shape.
- Ensures split segments are present only for split shifts.
- Prevents duplicate `code` in same vendor/branch context.

## 2. Edit Shift Definition

- Method and URL: `PUT /api/roster/shifts/{shiftId}`

### Request body
Same as create.

### Response
```json
{
  "id": "uuid",
  "message": "Shift updated successfully."
}
```

### Business logic
- Rejects edits if published rosters would become invalid without explicit `force=true`.

## 3. Delete Shift Definition

- Method and URL: `DELETE /api/roster/shifts/{shiftId}?force=false`

### Response
```json
{
  "message": "Shift deleted successfully."
}
```

### Business logic
- Soft deletes by default.
- Hard delete blocked if active assignments exist.

## 4. Create Roster Template

- Method and URL: `POST /api/roster/templates`

### Request body
```json
{
  "name": "Small Hospital Weekly Rotation",
  "industryType": "HOSPITAL",
  "branchId": "uuid",
  "rotationType": "WEEKLY_ROTATING",
  "seasonType": "ALL_YEAR",
  "weeklyOffPattern": "ROTATIONAL",
  "description": "Weekly 3-shift roster for nurses and support staff.",
  "templateRules": {
    "maxConsecutiveNightShifts": 2,
    "minRestHoursBetweenShifts": 10,
    "holidayPolicy": "PREMIUM_PAY",
    "femaleNightShiftRequiresConsent": true
  },
  "shiftBlueprints": [
    {
      "shiftCode": "MORN",
      "daysOfWeek": ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY", "SUNDAY"],
      "roleRequirements": [
        { "roleCode": "NURSE", "requiredCount": 3 },
        { "roleCode": "WARD_BOY", "requiredCount": 2 }
      ]
    }
  ]
}
```

### Response
```json
{
  "id": "uuid",
  "message": "Roster template created successfully."
}
```

### Business logic
- Stores reusable generation rules.
- Can be linked to one branch or global vendor default.

## 5. Auto-Generate Monthly Roster

- Method and URL: `POST /api/roster/generation/monthly`

### Request body
```json
{
  "branchId": "uuid",
  "templateId": "uuid",
  "month": "2026-07",
  "employeeIds": ["uuid-1", "uuid-2"],
  "respectPreferences": true,
  "respectApprovedLeaves": true,
  "allowDraftConflicts": true
}
```

### Response
```json
{
  "generationId": "uuid",
  "status": "DRAFT",
  "summary": {
    "assignmentsCreated": 248,
    "conflictsFound": 3,
    "understaffedSlots": 1
  },
  "conflicts": [
    {
      "date": "2026-07-14",
      "shiftCode": "NIGHT",
      "severity": "HIGH",
      "message": "Only 1 nurse assigned; minimum required is 2."
    }
  ]
}
```

### Business logic
- Builds draft assignments.
- Uses leave, weekly off, holidays, and constraints.
- Persists conflicts separately for manual override.

## 6. Assign Employee to Shift on Specific Date

- Method and URL: `POST /api/roster/assignments`

### Request body
```json
{
  "employeeId": "uuid",
  "shiftId": "uuid",
  "assignmentDate": "2026-07-14",
  "branchId": "uuid",
  "assignmentType": "WORKING",
  "notes": "Manual assignment by branch manager"
}
```

### Response
```json
{
  "id": "uuid",
  "message": "Employee assigned successfully.",
  "warnings": []
}
```

### Business logic
- Checks for double booking, weekly off, leave overlap, and rest-hour violations.
- Allows override if actor has permission; stores override reason.

## 7. Bulk Assign Team

- Method and URL: `POST /api/roster/assignments/bulk`

### Request body
```json
{
  "branchId": "uuid",
  "shiftId": "uuid",
  "dates": ["2026-07-15", "2026-07-16"],
  "employeeIds": ["uuid-1", "uuid-2", "uuid-3"],
  "overrideConflicts": false
}
```

### Response
```json
{
  "createdCount": 6,
  "failedCount": 1,
  "results": [
    {
      "employeeId": "uuid-1",
      "date": "2026-07-15",
      "success": true,
      "message": "Assigned."
    }
  ]
}
```

### Business logic
- Optimized for assigning whole teams or same site guards.

## 8. Get Roster View

- Method and URL:
  - `GET /api/roster/views/monthly?branchId=...&month=2026-07`
  - `GET /api/roster/views/weekly?branchId=...&weekStart=2026-07-13`
  - `GET /api/roster/views/employee/{employeeId}?month=2026-07`
  - `GET /api/roster/views/department?branchId=...&department=FrontDesk&month=2026-07`

### Response
```json
{
  "scope": "MONTHLY",
  "period": "2026-07",
  "employees": [
    {
      "employeeId": "uuid",
      "employeeName": "Aman Sharma",
      "designation": "Nurse",
      "assignments": [
        {
          "date": "2026-07-01",
          "shiftCode": "MORN",
          "shiftName": "Morning Care",
          "startTime": "06:00",
          "endTime": "14:00",
          "status": "ASSIGNED",
          "published": true
        }
      ]
    }
  ]
}
```

### Business logic
- Supports grid, card, and dashboard UI.

## 9. Publish Roster

- Method and URL: `POST /api/roster/publications`

### Request body
```json
{
  "branchId": "uuid",
  "month": "2026-07",
  "notifyChannels": ["WHATSAPP", "SMS"],
  "includeDraftConflicts": false,
  "messageNote": "Please check your July roster."
}
```

### Response
```json
{
  "publicationId": "uuid",
  "publishedAt": "2026-06-25T18:15:00+05:30",
  "employeeCountNotified": 26,
  "message": "Roster published successfully."
}
```

### Business logic
- Locks selected assignment version as published.
- Sends notifications only after conflict threshold is acceptable.

## 10. Employee Requests Shift Swap

- Method and URL: `POST /api/roster/swaps`

### Request body
```json
{
  "requesterEmployeeId": "uuid-1",
  "requestedEmployeeId": "uuid-2",
  "requesterAssignmentId": "uuid-a",
  "requestedAssignmentId": "uuid-b",
  "reason": "Family function on 18 July."
}
```

### Response
```json
{
  "id": "uuid",
  "status": "PENDING",
  "message": "Shift swap request submitted."
}
```

### Business logic
- Ensures same skill/role equivalence or manager override.
- Pre-validates swap conflicts before request submission.

## 11. Manager Approves or Rejects Shift Swap

- Method and URL: `POST /api/roster/swaps/{swapId}/decision`

### Request body
```json
{
  "decision": "APPROVED",
  "reviewNote": "Approved after coverage review."
}
```

### Response
```json
{
  "id": "uuid",
  "status": "APPROVED",
  "message": "Shift swap approved."
}
```

### Business logic
- On approval, both assignments are atomically swapped.
- Re-runs constraints before commit.

## 12. Get Employees on Shift Right Now

- Method and URL: `GET /api/roster/live/on-shift?branchId=uuid&at=2026-07-14T15:30:00+05:30`

### Response
```json
{
  "timestamp": "2026-07-14T15:30:00+05:30",
  "activeShifts": [
    {
      "shiftId": "uuid",
      "shiftName": "Evening Care",
      "requiredCount": 4,
      "assignedCount": 3,
      "employees": [
        {
          "employeeId": "uuid",
          "employeeName": "Neha Verma",
          "designation": "Nurse"
        }
      ]
    }
  ]
}
```

### Business logic
- Used by live duty dashboard and emergency replacement.

## 13. Detect Roster Conflicts

- Method and URL: `POST /api/roster/conflicts/check`

### Request body
```json
{
  "branchId": "uuid",
  "month": "2026-07",
  "assignmentIds": ["uuid-1", "uuid-2"]
}
```

### Response
```json
{
  "conflicts": [
    {
      "type": "DOUBLE_BOOKED",
      "severity": "HIGH",
      "employeeId": "uuid",
      "date": "2026-07-10",
      "message": "Employee assigned to two overlapping shifts."
    }
  ]
}
```

### Business logic
- Can run on full month or subset after manual edits.

## 14. Copy Last Month's Roster

- Method and URL: `POST /api/roster/copy-month`

### Request body
```json
{
  "branchId": "uuid",
  "sourceMonth": "2026-06",
  "targetMonth": "2026-07",
  "copyAsDraft": true,
  "adjustForWeeklyOffs": true,
  "skipApprovedLeaves": true
}
```

### Response
```json
{
  "copiedAssignments": 226,
  "conflictsFound": 5,
  "message": "Roster copied as draft."
}
```

### Business logic
- Fast-start option for stable businesses.

## 15. Export Roster as PDF or Excel

- Method and URL: `POST /api/roster/exports`

### Request body
```json
{
  "branchId": "uuid",
  "month": "2026-07",
  "format": "PDF",
  "view": "MONTHLY_GRID"
}
```

### Response
```json
{
  "downloadUrl": "https://cdn.peeplify.com/exports/roster-july-2026.pdf",
  "expiresAt": "2026-07-01T23:59:00+05:30"
}
```

### Business logic
- Supports printable manager copy and employee share cards.
