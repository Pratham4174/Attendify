"""
PART 4: Auto-Generation Algorithm

This is a working reference implementation for Peeplify's monthly roster generation.
It is designed for clarity and correctness rather than extreme optimization.

Input:
- employees with roles, preferences, branch/site eligibility, gender, probation metadata
- shift definitions and daily staffing requirements
- weekly off rules
- holidays
- roster constraints

Output:
- assignment list
- conflict list
- coverage summary
"""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import date, datetime, time, timedelta
from collections import defaultdict
from typing import Dict, List, Optional, Set, Tuple


@dataclass
class Employee:
    id: str
    name: str
    role_code: str
    branch_id: str
    site_codes: Set[str]
    preferred_shift_codes: Set[str]
    blocked_shift_codes: Set[str]
    weekly_off_days: Set[int]
    approved_leave_dates: Set[date]
    holiday_work_allowed: bool
    max_consecutive_nights: int = 2
    min_rest_hours: int = 10
    probation_until: Optional[date] = None
    female_employee: bool = False
    female_night_consent: bool = False
    fairness_weight: float = 1.0


@dataclass
class ShiftRequirement:
    shift_code: str
    role_code: str
    required_count: int
    ideal_count: int


@dataclass
class Shift:
    code: str
    name: str
    start: time
    end: time
    crosses_midnight: bool
    work_minutes: int
    break_minutes: int
    is_night: bool = False
    site_code: Optional[str] = None
    holiday_policy: str = "SITE_POLICY"


@dataclass
class DailyDemand:
    roster_date: date
    shift_requirements: List[ShiftRequirement]


@dataclass
class Assignment:
    employee_id: str
    roster_date: date
    shift_code: str
    role_code: str
    source: str = "AUTO"


@dataclass
class Conflict:
    roster_date: date
    shift_code: str
    severity: str
    message: str
    employee_id: Optional[str] = None


@dataclass
class GenerationResult:
    assignments: List[Assignment] = field(default_factory=list)
    conflicts: List[Conflict] = field(default_factory=list)
    coverage: Dict[Tuple[date, str, str], int] = field(default_factory=dict)


class MonthlyRosterGenerator:
    def __init__(
        self,
        employees: List[Employee],
        shifts: Dict[str, Shift],
        daily_demands: List[DailyDemand],
        holidays: Set[date],
    ) -> None:
        self.employees = employees
        self.shifts = shifts
        self.daily_demands = daily_demands
        self.holidays = holidays
        self.assignments_by_employee: Dict[str, List[Assignment]] = defaultdict(list)
        self.result = GenerationResult()
        self.night_shift_counts: Dict[str, int] = defaultdict(int)
        self.total_assigned_minutes: Dict[str, int] = defaultdict(int)
        self.total_assigned_shifts: Dict[str, int] = defaultdict(int)

    def generate(self) -> GenerationResult:
        for demand in sorted(self.daily_demands, key=lambda item: item.roster_date):
            grouped = defaultdict(list)
            for req in demand.shift_requirements:
                grouped[(req.shift_code, req.role_code)].append(req)

            for (shift_code, role_code), reqs in grouped.items():
                target_required = sum(item.required_count for item in reqs)
                self._assign_for_slot(demand.roster_date, shift_code, role_code, target_required)

        return self.result

    def _assign_for_slot(self, roster_date: date, shift_code: str, role_code: str, required_count: int) -> None:
        shift = self.shifts[shift_code]
        candidates = [employee for employee in self.employees if employee.role_code == role_code]
        ranked = sorted(
            candidates,
            key=lambda employee: self._score_employee_for_shift(employee, roster_date, shift),
        )

        assigned = 0
        for employee in ranked:
            if assigned >= required_count:
                break
            if not self._can_assign(employee, roster_date, shift):
                continue

            assignment = Assignment(
                employee_id=employee.id,
                roster_date=roster_date,
                shift_code=shift.code,
                role_code=role_code,
            )
            self.result.assignments.append(assignment)
            self.assignments_by_employee[employee.id].append(assignment)
            self.result.coverage[(roster_date, shift.code, role_code)] = (
                self.result.coverage.get((roster_date, shift.code, role_code), 0) + 1
            )
            self.total_assigned_minutes[employee.id] += shift.work_minutes
            self.total_assigned_shifts[employee.id] += 1
            if shift.is_night:
                self.night_shift_counts[employee.id] += 1
            assigned += 1

        if assigned < required_count:
            self.result.conflicts.append(
                Conflict(
                    roster_date=roster_date,
                    shift_code=shift.code,
                    severity="HIGH",
                    message=f"Understaffed shift: need {required_count}, assigned {assigned} for role {role_code}.",
                )
            )

    def _score_employee_for_shift(self, employee: Employee, roster_date: date, shift: Shift) -> float:
        score = 0.0

        if shift.code in employee.preferred_shift_codes:
            score -= 20
        if shift.code in employee.blocked_shift_codes:
            score += 1000
        if roster_date in employee.approved_leave_dates:
            score += 1000
        if roster_date.weekday() in employee.weekly_off_days:
            score += 200
        if shift.is_night:
            score += self.night_shift_counts[employee.id] * 15
        score += self.total_assigned_shifts[employee.id] * 2
        score += int(self.total_assigned_minutes[employee.id] / 60)
        score /= max(employee.fairness_weight, 0.5)

        return score

    def _can_assign(self, employee: Employee, roster_date: date, shift: Shift) -> bool:
        if shift.code in employee.blocked_shift_codes:
            return False
        if roster_date in employee.approved_leave_dates:
            return False
        if roster_date.weekday() in employee.weekly_off_days:
            return False

        if roster_date in self.holidays and not employee.holiday_work_allowed:
            return False

        if employee.probation_until and roster_date <= employee.probation_until and shift.is_night:
            return False

        if employee.female_employee and shift.is_night and not employee.female_night_consent:
            return False

        existing = self.assignments_by_employee[employee.id]
        if any(assignment.roster_date == roster_date for assignment in existing):
            return False

        if shift.is_night and self._consecutive_nights(employee.id, roster_date) >= employee.max_consecutive_nights:
            return False

        if not self._has_required_rest(employee.id, roster_date, shift, employee.min_rest_hours):
            return False

        return True

    def _consecutive_nights(self, employee_id: str, roster_date: date) -> int:
        count = 0
        previous_day = roster_date - timedelta(days=1)
        assignments = {(assignment.roster_date, assignment.shift_code) for assignment in self.assignments_by_employee[employee_id]}
        while True:
            matched = False
            for assignment_date, shift_code in assignments:
                if assignment_date == previous_day and self.shifts[shift_code].is_night:
                    count += 1
                    previous_day -= timedelta(days=1)
                    matched = True
                    break
            if not matched:
                break
        return count

    def _has_required_rest(self, employee_id: str, roster_date: date, new_shift: Shift, min_rest_hours: int) -> bool:
        prior_assignments = self.assignments_by_employee[employee_id]
        if not prior_assignments:
            return True

        latest = max(prior_assignments, key=lambda assignment: assignment.roster_date)
        latest_shift = self.shifts[latest.shift_code]

        previous_end = datetime.combine(latest.roster_date, latest_shift.end)
        if latest_shift.crosses_midnight:
            previous_end += timedelta(days=1)

        next_start = datetime.combine(roster_date, new_shift.start)
        if new_shift.crosses_midnight and new_shift.start > new_shift.end:
            pass

        rest_hours = (next_start - previous_end).total_seconds() / 3600
        return rest_hours >= min_rest_hours


if __name__ == "__main__":
    sample_employees = [
        Employee(
            id="emp-1",
            name="Aman Sharma",
            role_code="NURSE",
            branch_id="branch-1",
            site_codes={"site-a"},
            preferred_shift_codes={"MORN"},
            blocked_shift_codes=set(),
            weekly_off_days={6},
            approved_leave_dates=set(),
            holiday_work_allowed=True,
            female_employee=False,
        ),
        Employee(
            id="emp-2",
            name="Neha Verma",
            role_code="NURSE",
            branch_id="branch-1",
            site_codes={"site-a"},
            preferred_shift_codes={"EVE"},
            blocked_shift_codes=set(),
            weekly_off_days={2},
            approved_leave_dates=set(),
            holiday_work_allowed=True,
            female_employee=True,
            female_night_consent=True,
        ),
        Employee(
            id="emp-3",
            name="Priya Gupta",
            role_code="NURSE",
            branch_id="branch-1",
            site_codes={"site-a"},
            preferred_shift_codes={"MORN"},
            blocked_shift_codes={"NIGHT"},
            weekly_off_days={4},
            approved_leave_dates=set(),
            holiday_work_allowed=False,
            female_employee=True,
        ),
    ]

    sample_shifts = {
        "MORN": Shift("MORN", "Morning Care", time(6, 0), time(14, 0), False, 480, 30),
        "EVE": Shift("EVE", "Evening Care", time(14, 0), time(22, 0), False, 480, 30),
        "NIGHT": Shift("NIGHT", "Night Care", time(22, 0), time(6, 0), True, 480, 30, is_night=True),
    }

    month_start = date(2026, 7, 1)
    demands = []
    for day_offset in range(7):
        roster_day = month_start + timedelta(days=day_offset)
        demands.append(
            DailyDemand(
                roster_date=roster_day,
                shift_requirements=[
                    ShiftRequirement("MORN", "NURSE", 2, 3),
                    ShiftRequirement("EVE", "NURSE", 1, 2),
                ],
            )
        )

    generator = MonthlyRosterGenerator(
        employees=sample_employees,
        shifts=sample_shifts,
        daily_demands=demands,
        holidays={date(2026, 7, 5)},
    )
    result = generator.generate()

    print("Assignments:")
    for assignment in result.assignments:
        print(assignment)

    print("\nConflicts:")
    for conflict in result.conflicts:
        print(conflict)
