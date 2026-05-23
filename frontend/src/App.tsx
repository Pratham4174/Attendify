import { useEffect, useRef, useState } from "react";

const API_BASE = "/api";

type Role = "SUPER_ADMIN" | "VENDOR_ADMIN" | "EMPLOYEE";

type SessionUser = {
  userId: string;
  vendorId: string;
  vendorName: string;
  employeeId: string | null;
  name: string;
  email: string;
  role: Role;
};

type Session = {
  token: string;
  user: SessionUser;
};

type LoginResponse = Session;

type EmployeeOverview = {
  employee: {
    id: string;
    branchId: string;
    employeeCode: string;
    name: string;
    email: string;
    phone: string;
    status: string;
    designation: string;
  };
  branch: {
    id: string;
    name: string;
    address: string;
    latitude: number;
    longitude: number;
    radiusMeters: number;
  };
  todayAttendance: AttendanceRow | null;
  recentAttendance: AttendanceRow[];
};

type AttendanceRow = {
  recordId: string;
  employeeId: string;
  employeeName: string;
  branchId: string;
  branchName: string;
  date: string;
  checkInTime: string | null;
  checkOutTime: string | null;
  status: string;
  checkInDistanceMeters: number;
  checkOutDistanceMeters: number | null;
  checkInPhotoRef: string | null;
  checkOutPhotoRef: string | null;
};

type Dashboard = {
  cards: {
    totalEmployees: number;
    presentToday: number;
    checkedOutToday: number;
    absentToday: number;
  };
  branchSnapshots: Array<{
    branchId: string;
    branchName: string;
    headcount: number;
    present: number;
  }>;
  recentAttendance: AttendanceRow[];
};

type Employee = {
  id: string;
  employeeCode: string;
  name: string;
  designation: string;
  email: string;
  phone: string;
  status: string;
  branchId: string;
};

type Branch = {
  id: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  radiusMeters: number;
};

type ApiError = {
  error?: string;
};

const demoAccounts = [
  { label: "Hotel One Admin", email: "admin@hotelone.test", password: "password" },
  { label: "Hotel One Employee", email: "ravi@hotelone.test", password: "password" },
  { label: "Hotel Two Admin", email: "admin@hoteltwo.test", password: "password" },
  { label: "Hotel Two Employee", email: "neha@hoteltwo.test", password: "password" }
];

function App() {
  const [session, setSession] = useState<Session | null>(() => {
    const cached = localStorage.getItem("attendance-session");
    return cached ? (JSON.parse(cached) as Session) : null;
  });

  useEffect(() => {
    if (session) {
      localStorage.setItem("attendance-session", JSON.stringify(session));
    } else {
      localStorage.removeItem("attendance-session");
    }
  }, [session]);

  return (
    <div className="app-shell">
      <div className="background-orb background-orb-one" />
      <div className="background-orb background-orb-two" />
      {!session ? (
        <LoginScreen onLogin={setSession} />
      ) : session.user.role === "EMPLOYEE" ? (
        <EmployeeScreen session={session} onLogout={() => setSession(null)} />
      ) : (
        <AdminScreen session={session} onLogout={() => setSession(null)} />
      )}
    </div>
  );
}

function LoginScreen({ onLogin }: { onLogin: (session: Session) => void }) {
  const [selectedEmail, setSelectedEmail] = useState(demoAccounts[0].email);
  const [password, setPassword] = useState(demoAccounts[0].password);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const selected = demoAccounts.find((account) => account.email === selectedEmail);
    if (selected) {
      setPassword(selected.password);
    }
  }, [selectedEmail]);

  async function handleLogin(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError("");

    try {
      const response = await fetch(`${API_BASE}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: selectedEmail, password })
      });

      if (!response.ok) {
        throw new Error(await extractError(response));
      }

      onLogin((await response.json()) as LoginResponse);
    } catch (loginError) {
      setError(loginError instanceof Error ? loginError.message : "Unable to sign in.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="login-layout">
      <section className="hero-panel">
        <span className="eyebrow">Industry-grade attendance SaaS</span>
        <h1>Tenant-safe attendance for hotels, stores, and field teams.</h1>
        <p>
          This version is designed around PostgreSQL persistence, backend-enforced tenant
          isolation, JWT sessions, geofence checks, and evidence-backed attendance.
        </p>
        <div className="feature-list">
          <div>
            <strong>Vendor isolation</strong>
            <span>Every query is scoped to the authenticated tenant on the backend.</span>
          </div>
          <div>
            <strong>Persistent records</strong>
            <span>Attendance, employees, branches, and users are modeled for PostgreSQL.</span>
          </div>
          <div>
            <strong>Production auth</strong>
            <span>JWT-backed sessions replace the old client-supplied vendor context.</span>
          </div>
        </div>
      </section>

      <section className="login-card">
        <h2>Sign in</h2>
        <p className="muted">Use one of the seeded tenant accounts to explore the system.</p>
        <form onSubmit={handleLogin}>
          <label>
            Seeded account
            <select value={selectedEmail} onChange={(event) => setSelectedEmail(event.target.value)}>
              {demoAccounts.map((account) => (
                <option key={account.email} value={account.email}>
                  {account.label}
                </option>
              ))}
            </select>
          </label>
          <label>
            Password
            <input
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              type="password"
              placeholder="password"
            />
          </label>
          {error ? <p className="error-text">{error}</p> : null}
          <button className="primary-button" disabled={loading} type="submit">
            {loading ? "Signing in..." : "Access workspace"}
          </button>
        </form>
      </section>
    </main>
  );
}

function EmployeeScreen({
  session,
  onLogout
}: {
  session: Session;
  onLogout: () => void;
}) {
  const [overview, setOverview] = useState<EmployeeOverview | null>(null);
  const [coords, setCoords] = useState<{ latitude: number; longitude: number } | null>(null);
  const [selfie, setSelfie] = useState<string>("");
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  async function loadOverview() {
    const data = await apiFetch<EmployeeOverview>(session, "/employee/overview");
    setOverview(data);
  }

  useEffect(() => {
    void loadOverview();
  }, []);

  useEffect(() => {
    return () => {
      streamRef.current?.getTracks().forEach((track) => track.stop());
    };
  }, []);

  async function requestLocation() {
    setStatus("Fetching your current location...");
    return new Promise<{ latitude: number; longitude: number }>((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const next = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude
          };
          setCoords(next);
          setStatus("Location locked.");
          resolve(next);
        },
        () => reject(new Error("Location permission was denied.")),
        { enableHighAccuracy: true, timeout: 10000 }
      );
    });
  }

  async function startCamera() {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: "user" },
      audio: false
    });
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = stream;
    if (videoRef.current) {
      videoRef.current.srcObject = stream;
    }
  }

  function captureSelfie() {
    if (!videoRef.current) {
      return;
    }

    const canvas = document.createElement("canvas");
    canvas.width = videoRef.current.videoWidth || 640;
    canvas.height = videoRef.current.videoHeight || 480;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      return;
    }

    ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
    setSelfie(canvas.toDataURL("image/jpeg", 0.9));
    setStatus("Selfie captured.");
  }

  async function submitAttendance(mode: "check-in" | "check-out") {
    if (!overview) {
      return;
    }

    setLoading(true);
    setStatus("");

    try {
      const location = coords ?? (await requestLocation());
      if (!selfie) {
        throw new Error("Capture a live selfie before submitting attendance.");
      }

      const data = await apiFetch<{ message: string; distanceMeters: number }>(
        session,
        `/attendance/${mode}`,
        {
          method: "POST",
          body: JSON.stringify({
            branchId: overview.branch.id,
            latitude: location.latitude,
            longitude: location.longitude,
            imageDataUrl: selfie
          })
        }
      );

      setStatus(`${data.message} Distance from branch: ${data.distanceMeters.toFixed(1)}m.`);
      setSelfie("");
      await loadOverview();
    } catch (submitError) {
      setStatus(
        submitError instanceof Error ? submitError.message : "Unable to save attendance."
      );
    } finally {
      setLoading(false);
    }
  }

  if (!overview) {
    return <div className="center-message">Loading employee workspace...</div>;
  }

  const canCheckOut = overview.todayAttendance?.status === "CHECKED_IN";
  const hasCheckedIn = !!overview.todayAttendance;

  return (
    <main className="workspace">
      <header className="topbar">
        <div>
          <span className="eyebrow">Employee workspace</span>
          <h2>{overview.employee.name}</h2>
          <p className="muted">
            {overview.employee.designation} at {overview.branch.name} for {session.user.vendorName}
          </p>
        </div>
        <button className="ghost-button" onClick={onLogout}>
          Log out
        </button>
      </header>

      <section className="grid two-column">
        <article className="panel">
          <h3>Today's status</h3>
          <div className="stat-row">
            <div>
              <span className="label">Attendance state</span>
              <strong>{overview.todayAttendance?.status ?? "NOT MARKED"}</strong>
            </div>
            <div>
              <span className="label">Geofence</span>
              <strong>{overview.branch.radiusMeters}m radius</strong>
            </div>
          </div>
          <div className="stat-row">
            <div>
              <span className="label">Check-in</span>
              <strong>{formatDateTime(overview.todayAttendance?.checkInTime)}</strong>
            </div>
            <div>
              <span className="label">Check-out</span>
              <strong>{formatDateTime(overview.todayAttendance?.checkOutTime)}</strong>
            </div>
          </div>
          <p className="muted">
            Branch target coordinate: {overview.branch.latitude.toFixed(5)},{" "}
            {overview.branch.longitude.toFixed(5)}
          </p>
        </article>

        <article className="panel">
          <h3>Verify before marking</h3>
          <div className="action-row">
            <button className="secondary-button" onClick={() => void requestLocation()}>
              Lock GPS
            </button>
            <button className="secondary-button" onClick={() => void startCamera()}>
              Start camera
            </button>
            <button className="secondary-button" onClick={captureSelfie}>
              Capture selfie
            </button>
          </div>
          <div className="camera-panel">
            <video autoPlay muted playsInline ref={videoRef} />
            {selfie ? <img alt="Captured selfie" src={selfie} /> : null}
          </div>
          <p className="muted">
            Current GPS:{" "}
            {coords
              ? `${coords.latitude.toFixed(5)}, ${coords.longitude.toFixed(5)}`
              : "Not locked yet"}
          </p>
          {status ? <p className="status-text">{status}</p> : null}
          <div className="action-row">
            <button
              className="primary-button"
              disabled={loading || hasCheckedIn}
              onClick={() => void submitAttendance("check-in")}
            >
              {loading ? "Saving..." : "Check in"}
            </button>
            <button
              className="ghost-button"
              disabled={loading || !canCheckOut}
              onClick={() => void submitAttendance("check-out")}
            >
              {loading ? "Saving..." : "Check out"}
            </button>
          </div>
        </article>
      </section>

      <section className="panel">
        <h3>Recent attendance</h3>
        <AttendanceTable records={overview.recentAttendance} />
      </section>
    </main>
  );
}

function AdminScreen({
  session,
  onLogout
}: {
  session: Session;
  onLogout: () => void;
}) {
  const [dashboard, setDashboard] = useState<Dashboard | null>(null);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRow[]>([]);

  useEffect(() => {
    async function loadAdminData() {
      const [dashboardData, employeeData, branchData, attendanceData] = await Promise.all([
        apiFetch<Dashboard>(session, "/admin/dashboard"),
        apiFetch<Employee[]>(session, "/admin/employees"),
        apiFetch<Branch[]>(session, "/admin/branches"),
        apiFetch<AttendanceRow[]>(session, "/admin/attendance")
      ]);

      setDashboard(dashboardData);
      setEmployees(employeeData);
      setBranches(branchData);
      setAttendance(attendanceData);
    }

    void loadAdminData();
  }, []);

  if (!dashboard) {
    return <div className="center-message">Loading admin dashboard...</div>;
  }

  return (
    <main className="workspace">
      <header className="topbar">
        <div>
          <span className="eyebrow">Vendor admin dashboard</span>
          <h2>{session.user.name}</h2>
          <p className="muted">
            {session.user.vendorName} attendance operations with server-enforced tenant isolation
          </p>
        </div>
        <button className="ghost-button" onClick={onLogout}>
          Log out
        </button>
      </header>

      <section className="metric-grid">
        <MetricCard label="Total employees" value={dashboard.cards.totalEmployees} />
        <MetricCard label="Present today" value={dashboard.cards.presentToday} />
        <MetricCard label="Checked out" value={dashboard.cards.checkedOutToday} />
        <MetricCard label="Absent today" value={dashboard.cards.absentToday} />
      </section>

      <section className="grid two-column">
        <article className="panel">
          <h3>Branch coverage</h3>
          <div className="branch-list">
            {dashboard.branchSnapshots.map((branch) => (
              <div className="branch-item" key={branch.branchId}>
                <div>
                  <strong>{branch.branchName}</strong>
                  <span>
                    {branch.present} present / {branch.headcount} assigned
                  </span>
                </div>
                <span className="pill">
                  {Math.round((branch.present / Math.max(branch.headcount, 1)) * 100)}%
                </span>
              </div>
            ))}
          </div>
        </article>

        <article className="panel">
          <h3>Configured branches</h3>
          <div className="branch-list">
            {branches.map((branch) => (
              <div className="branch-item" key={branch.id}>
                <div>
                  <strong>{branch.name}</strong>
                  <span>{branch.address}</span>
                </div>
                <span className="pill">{branch.radiusMeters}m</span>
              </div>
            ))}
          </div>
        </article>
      </section>

      <section className="panel">
        <h3>Employees</h3>
        <table className="data-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Code</th>
              <th>Designation</th>
              <th>Email</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {employees.map((employee) => (
              <tr key={employee.id}>
                <td>{employee.name}</td>
                <td>{employee.employeeCode}</td>
                <td>{employee.designation}</td>
                <td>{employee.email}</td>
                <td>{employee.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="panel">
        <h3>Attendance evidence report</h3>
        <AttendanceTable records={attendance} />
      </section>
    </main>
  );
}

function MetricCard({ label, value }: { label: string; value: number }) {
  return (
    <article className="metric-card">
      <span>{label}</span>
      <strong>{value}</strong>
    </article>
  );
}

function AttendanceTable({ records }: { records: AttendanceRow[] }) {
  return (
    <table className="data-table">
      <thead>
        <tr>
          <th>Employee</th>
          <th>Date</th>
          <th>Check-in</th>
          <th>Check-out</th>
          <th>Status</th>
          <th>Branch</th>
          <th>Evidence</th>
        </tr>
      </thead>
      <tbody>
        {records.map((record) => (
          <tr key={record.recordId}>
            <td>{record.employeeName}</td>
            <td>{record.date}</td>
            <td>{formatDateTime(record.checkInTime)}</td>
            <td>{formatDateTime(record.checkOutTime)}</td>
            <td>{record.status}</td>
            <td>{record.branchName}</td>
            <td>
              <div className="evidence-stack">
                {record.checkInPhotoRef ? (
                  <img alt="Check-in evidence" src={record.checkInPhotoRef} />
                ) : (
                  <span className="muted">No check-in image</span>
                )}
                {record.checkOutPhotoRef ? (
                  <img alt="Check-out evidence" src={record.checkOutPhotoRef} />
                ) : null}
              </div>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

async function apiFetch<T>(session: Session, path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${session.token}`,
      ...(init?.headers ?? {})
    }
  });

  if (!response.ok) {
    throw new Error(await extractError(response));
  }

  return (await response.json()) as T;
}

async function extractError(response: Response) {
  try {
    const body = (await response.json()) as ApiError;
    return body.error ?? "Request failed.";
  } catch {
    return "Request failed.";
  }
}

function formatDateTime(value: string | null | undefined) {
  if (!value) {
    return "Pending";
  }

  return new Date(value).toLocaleString();
}

export default App;
