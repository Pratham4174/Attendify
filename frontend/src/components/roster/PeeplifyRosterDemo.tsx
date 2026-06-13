import { useMemo, useState } from "react";

type ShiftCode = "M" | "E" | "N" | "OFF" | "OC";

type EmployeeRosterRow = {
  id: string;
  name: string;
  role: string;
  department: string;
  shifts: Array<{
    date: string;
    code: ShiftCode;
    label: string;
    color: string;
  }>;
};

type CoverageSlot = {
  label: string;
  assigned: number;
  required: number;
};

const dummyEmployees: EmployeeRosterRow[] = [
  {
    id: "emp-1",
    name: "Aman Sharma",
    role: "Nurse",
    department: "Ward",
    shifts: [
      { date: "2026-07-01", code: "M", label: "06:00-14:00", color: "bg-blue-100 text-blue-700" },
      { date: "2026-07-02", code: "E", label: "14:00-22:00", color: "bg-amber-100 text-amber-700" },
      { date: "2026-07-03", code: "N", label: "22:00-06:00", color: "bg-slate-200 text-slate-700" },
    ],
  },
  {
    id: "emp-2",
    name: "Neha Verma",
    role: "Receptionist",
    department: "Front Desk",
    shifts: [
      { date: "2026-07-01", code: "E", label: "14:00-22:00", color: "bg-amber-100 text-amber-700" },
      { date: "2026-07-02", code: "M", label: "06:00-14:00", color: "bg-blue-100 text-blue-700" },
      { date: "2026-07-03", code: "OFF", label: "Weekly off", color: "bg-emerald-100 text-emerald-700" },
    ],
  },
  {
    id: "emp-3",
    name: "Harpreet Singh",
    role: "Security Guard",
    department: "Security",
    shifts: [
      { date: "2026-07-01", code: "N", label: "22:00-06:00", color: "bg-slate-200 text-slate-700" },
      { date: "2026-07-02", code: "N", label: "22:00-06:00", color: "bg-slate-200 text-slate-700" },
      { date: "2026-07-03", code: "OFF", label: "Off", color: "bg-emerald-100 text-emerald-700" },
    ],
  },
];

const dummyCoverage: CoverageSlot[] = [
  { label: "Morning Care", assigned: 3, required: 3 },
  { label: "Evening Care", assigned: 2, required: 3 },
  { label: "Night Care", assigned: 1, required: 2 },
];

const dummyEmployeeCard = {
  employeeName: "Aman Sharma",
  branchName: "Civil Hospital Pathankot",
  month: "July 2026",
  days: [
    { date: "01 Jul", shift: "Morning Care", timing: "06:00-14:00" },
    { date: "02 Jul", shift: "Evening Care", timing: "14:00-22:00" },
    { date: "03 Jul", shift: "Night Care", timing: "22:00-06:00" },
    { date: "04 Jul", shift: "Weekly Off", timing: "-" },
  ],
};

const dummyConflicts = [
  "Night shift on 15 July has only 1 nurse, minimum required is 2.",
  "Aman Sharma is double-booked for 18 July between Evening Care and On-Call Duty.",
];

const dates = ["01", "02", "03", "04", "05", "06", "07"];

function shiftBadge(code: ShiftCode) {
  switch (code) {
    case "M":
      return "bg-blue-100 text-blue-700";
    case "E":
      return "bg-amber-100 text-amber-700";
    case "N":
      return "bg-slate-200 text-slate-700";
    case "OFF":
      return "bg-emerald-100 text-emerald-700";
    case "OC":
      return "bg-violet-100 text-violet-700";
  }
}

export function ConflictAlertBanner({ items }: { items: string[] }) {
  return (
    <div className="rounded-3xl border border-rose-200 bg-rose-50 p-4 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-rose-500">Conflict alerts</p>
          <h3 className="mt-1 text-lg font-semibold text-slate-900">Roster needs review before publish</h3>
        </div>
        <span className="rounded-full bg-rose-100 px-3 py-1 text-sm font-semibold text-rose-600">
          {items.length} warnings
        </span>
      </div>
      <div className="mt-4 space-y-2">
        {items.map((item) => (
          <div key={item} className="rounded-2xl bg-white px-4 py-3 text-sm text-slate-700">
            {item}
          </div>
        ))}
      </div>
    </div>
  );
}

export function ShiftCoverageDashboard({ slots }: { slots: CoverageSlot[] }) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-blue-500">Coverage dashboard</p>
          <h3 className="mt-1 text-lg font-semibold text-slate-900">Assigned vs required staff</h3>
        </div>
      </div>
      <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {slots.map((slot) => {
          const healthy = slot.assigned >= slot.required;
          return (
            <div
              key={slot.label}
              className={`rounded-2xl border p-4 ${
                healthy ? "border-emerald-200 bg-emerald-50" : "border-rose-200 bg-rose-50"
              }`}
            >
              <p className="text-sm font-medium text-slate-700">{slot.label}</p>
              <div className="mt-3 flex items-end justify-between">
                <p className="text-3xl font-semibold text-slate-900">
                  {slot.assigned}/{slot.required}
                </p>
                <span
                  className={`rounded-full px-3 py-1 text-xs font-semibold ${
                    healthy ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"
                  }`}
                >
                  {healthy ? "Covered" : "Understaffed"}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function MonthlyRosterGridView({ rows }: { rows: EmployeeRosterRow[] }) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-blue-500">Monthly roster</p>
          <h3 className="mt-1 text-lg font-semibold text-slate-900">Employee vs date calendar grid</h3>
        </div>
        <div className="rounded-full bg-slate-100 px-3 py-1 text-sm text-slate-600">Tap any cell to edit</div>
      </div>
      <div className="mt-5 overflow-x-auto">
        <div className="min-w-[920px]">
          <div className="grid grid-cols-[220px_repeat(7,minmax(80px,1fr))] gap-2 text-sm">
            <div className="rounded-2xl bg-slate-100 px-4 py-3 font-semibold text-slate-700">Employee</div>
            {dates.map((day) => (
              <div key={day} className="rounded-2xl bg-slate-100 px-4 py-3 text-center font-semibold text-slate-700">
                {day}
              </div>
            ))}
            {rows.map((row) => (
              <>
                <div key={`${row.id}-meta`} className="rounded-2xl border border-slate-200 px-4 py-3">
                  <p className="font-semibold text-slate-900">{row.name}</p>
                  <p className="text-xs text-slate-500">
                    {row.role} • {row.department}
                  </p>
                </div>
                {dates.map((day, index) => {
                  const assignment = row.shifts[index];
                  return (
                    <button
                      key={`${row.id}-${day}`}
                      className={`rounded-2xl px-3 py-3 text-left text-sm font-medium ${assignment ? shiftBadge(assignment.code) : "border border-dashed border-slate-200 text-slate-400"}`}
                    >
                      {assignment ? (
                        <>
                          <div>{assignment.code}</div>
                          <div className="mt-1 text-xs opacity-80">{assignment.label}</div>
                        </>
                      ) : (
                        <div>Assign</div>
                      )}
                    </button>
                  );
                })}
              </>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export function WeeklyRosterView() {
  const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const hours = ["06:00", "10:00", "14:00", "18:00", "22:00"];
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-sm font-semibold uppercase tracking-[0.18em] text-blue-500">Weekly view</p>
      <h3 className="mt-1 text-lg font-semibold text-slate-900">Time slots vs employees</h3>
      <div className="mt-5 overflow-x-auto">
        <div className="grid min-w-[900px] grid-cols-[100px_repeat(7,minmax(110px,1fr))] gap-px overflow-hidden rounded-3xl border border-slate-200 bg-slate-200">
          <div className="bg-slate-50 px-3 py-3 font-semibold text-slate-700">Time</div>
          {days.map((day) => (
            <div key={day} className="bg-slate-50 px-3 py-3 text-center font-semibold text-slate-700">
              {day}
            </div>
          ))}
          {hours.map((hour) => (
            <>
              <div key={hour} className="bg-white px-3 py-4 font-medium text-slate-600">
                {hour}
              </div>
              {days.map((day, index) => (
                <div key={`${hour}-${day}`} className="bg-white px-2 py-4">
                  {hour === "06:00" && index < 3 ? (
                    <div className="rounded-2xl bg-blue-100 px-3 py-2 text-xs font-semibold text-blue-700">Morning</div>
                  ) : hour === "14:00" && index % 2 === 0 ? (
                    <div className="rounded-2xl bg-amber-100 px-3 py-2 text-xs font-semibold text-amber-700">Evening</div>
                  ) : hour === "22:00" && index === 5 ? (
                    <div className="rounded-2xl bg-slate-200 px-3 py-2 text-xs font-semibold text-slate-700">Night</div>
                  ) : null}
                </div>
              ))}
            </>
          ))}
        </div>
      </div>
    </div>
  );
}

export function EmployeeRosterCard() {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-blue-500">Shareable card</p>
          <h3 className="mt-1 text-lg font-semibold text-slate-900">{dummyEmployeeCard.employeeName}</h3>
          <p className="text-sm text-slate-500">
            {dummyEmployeeCard.branchName} • {dummyEmployeeCard.month}
          </p>
        </div>
        <button className="rounded-full bg-emerald-100 px-4 py-2 text-sm font-semibold text-emerald-700">
          Share on WhatsApp
        </button>
      </div>
      <div className="mt-5 space-y-3">
        {dummyEmployeeCard.days.map((day) => (
          <div key={day.date} className="flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3">
            <div>
              <p className="font-semibold text-slate-900">{day.date}</p>
              <p className="text-sm text-slate-500">{day.shift}</p>
            </div>
            <div className="text-sm font-medium text-slate-600">{day.timing}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function PublishRosterModal() {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-sm font-semibold uppercase tracking-[0.18em] text-blue-500">Publish roster modal</p>
      <h3 className="mt-1 text-lg font-semibold text-slate-900">Ready to notify employees</h3>
      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        <div className="rounded-2xl bg-slate-50 p-4">
          <p className="text-sm text-slate-500">Total shifts</p>
          <p className="mt-2 text-2xl font-semibold text-slate-900">248</p>
        </div>
        <div className="rounded-2xl bg-slate-50 p-4">
          <p className="text-sm text-slate-500">Conflicts</p>
          <p className="mt-2 text-2xl font-semibold text-rose-600">2</p>
        </div>
        <div className="rounded-2xl bg-slate-50 p-4">
          <p className="text-sm text-slate-500">Employees to notify</p>
          <p className="mt-2 text-2xl font-semibold text-slate-900">31</p>
        </div>
      </div>
      <div className="mt-5 flex flex-wrap gap-3">
        <button className="rounded-full bg-slate-900 px-5 py-3 text-sm font-semibold text-white">Publish and notify</button>
        <button className="rounded-full border border-slate-300 px-5 py-3 text-sm font-semibold text-slate-700">Save as draft</button>
      </div>
    </div>
  );
}

export function DragAndDropShiftAssignment() {
  const [pool] = useState([
    { id: "emp-7", name: "Ravi Kumar", role: "Guard" },
    { id: "emp-8", name: "Simran Kaur", role: "Guard" },
  ]);
  const [dropZone, setDropZone] = useState<string[]>([]);

  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-sm font-semibold uppercase tracking-[0.18em] text-blue-500">Drag and drop</p>
      <h3 className="mt-1 text-lg font-semibold text-slate-900">Assign employees into a shift slot</h3>
      <div className="mt-5 grid gap-4 lg:grid-cols-[240px_1fr]">
        <div className="space-y-3">
          {pool.map((employee) => (
            <div
              key={employee.id}
              draggable
              onDragStart={(event) => event.dataTransfer.setData("text/plain", employee.name)}
              className="cursor-grab rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3"
            >
              <p className="font-semibold text-slate-900">{employee.name}</p>
              <p className="text-sm text-slate-500">{employee.role}</p>
            </div>
          ))}
        </div>
        <div
          onDragOver={(event) => event.preventDefault()}
          onDrop={(event) => {
            const employeeName = event.dataTransfer.getData("text/plain");
            if (employeeName) {
              setDropZone((current) => [...current, employeeName]);
            }
          }}
          className="rounded-3xl border-2 border-dashed border-blue-200 bg-blue-50 p-5"
        >
          <p className="font-semibold text-slate-900">Morning Shift • 14 July • Security Gate A</p>
          <p className="mt-1 text-sm text-slate-500">Required: 2 guards • Drop staff cards here</p>
          <div className="mt-4 space-y-3">
            {dropZone.length === 0 ? (
              <div className="rounded-2xl bg-white px-4 py-6 text-sm text-slate-400">No employee assigned yet.</div>
            ) : (
              dropZone.map((employeeName) => (
                <div key={employeeName} className="rounded-2xl bg-white px-4 py-3 font-medium text-slate-700">
                  {employeeName}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function PeeplifyRosterDemo() {
  const [activeTab, setActiveTab] = useState<"month" | "week" | "cards">("month");
  const stats = useMemo(
    () => [
      { label: "Rostered staff", value: "31" },
      { label: "Open conflicts", value: "2" },
      { label: "Published branches", value: "4" },
    ],
    []
  );

  return (
    <div className="space-y-6 bg-slate-50 p-4 md:p-6">
      <div className="rounded-[28px] bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-blue-500">Peeplify roster module</p>
            <h2 className="mt-2 text-3xl font-semibold text-slate-950">Monthly scheduling for Indian SMB teams</h2>
            <p className="mt-2 max-w-3xl text-sm text-slate-600">
              Handles rotating shifts, split duty, on-call coverage, site staffing, weekly offs, and live coverage gaps.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            {stats.map((item) => (
              <div key={item.label} className="rounded-2xl bg-slate-100 px-4 py-3">
                <p className="text-sm text-slate-500">{item.label}</p>
                <p className="mt-2 text-2xl font-semibold text-slate-900">{item.value}</p>
              </div>
            ))}
          </div>
        </div>
        <div className="mt-5 flex flex-wrap gap-3">
          {[
            { key: "month", label: "Monthly grid" },
            { key: "week", label: "Weekly view" },
            { key: "cards", label: "Employee card" },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as "month" | "week" | "cards")}
              className={`rounded-full px-4 py-2 text-sm font-semibold ${
                activeTab === tab.key ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-700"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <ConflictAlertBanner items={dummyConflicts} />
      <ShiftCoverageDashboard slots={dummyCoverage} />

      {activeTab === "month" ? <MonthlyRosterGridView rows={dummyEmployees} /> : null}
      {activeTab === "week" ? <WeeklyRosterView /> : null}
      {activeTab === "cards" ? <EmployeeRosterCard /> : null}

      <DragAndDropShiftAssignment />
      <PublishRosterModal />
    </div>
  );
}
