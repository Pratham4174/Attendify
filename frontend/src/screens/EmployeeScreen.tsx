import { useEffect, useRef, useState } from "react";
import { apiFetch, ApiRequestError } from "../lib/api";
import {
  formatDateTime,
  formatTimeOnly,
  formatWorkedHours,
  getDistanceMeters
} from "../lib/format";
import { AttendanceTable } from "../components/AttendanceTable";
import { LoadingWorkspace, MetricCard } from "../components/shared";
import type { EmployeeOverview, Session } from "../types";

export function EmployeeScreen({
  session,
  onLogout
}: {
  session: Session;
  onLogout: () => void;
}) {
  const [overview, setOverview] = useState<EmployeeOverview | null>(null);
  const [loadError, setLoadError] = useState("");
  const [coords, setCoords] = useState<{ latitude: number; longitude: number } | null>(null);
  const [selfie, setSelfie] = useState<string>("");
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);
  const [showTutorial, setShowTutorial] = useState(false);
  const [activeTutorialStep, setActiveTutorialStep] = useState(0);
  const [trackingMessage, setTrackingMessage] = useState("");
  const [attendanceSummary, setAttendanceSummary] = useState<{
    mode: "check-in" | "check-out";
    branchName: string;
    time: string;
    distanceMeters: number;
    image: string;
  } | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  async function loadOverview() {
    try {
      setLoadError("");
      const data = await apiFetch<EmployeeOverview>(session, "/employee/overview");
      setOverview(data);
    } catch (error) {
      if (error instanceof ApiRequestError && (error.status === 401 || error.status === 403)) {
        onLogout();
        return;
      }

      setLoadError(error instanceof Error ? error.message : "Unable to load your workspace.");
    }
  }

  useEffect(() => {
    void loadOverview();
  }, []);

  useEffect(() => {
    return () => {
      streamRef.current?.getTracks().forEach((track) => track.stop());
    };
  }, []);

  useEffect(() => {
    const tutorialKey = `attendify-tutorial-seen-${session.user.userId}`;
    const hasSeenTutorial = localStorage.getItem(tutorialKey);

    if (!hasSeenTutorial) {
      setShowTutorial(true);
      localStorage.setItem(tutorialKey, "true");
    }
  }, [session.user.userId]);

  useEffect(() => {
    if (!showTutorial) {
      return;
    }

    const interval = window.setInterval(() => {
      setActiveTutorialStep((current) => (current + 1) % 4);
    }, 1800);

    return () => window.clearInterval(interval);
  }, [showTutorial]);

  useEffect(() => {
    if (
      !overview?.tracking.available ||
      !overview.tracking.active ||
      overview.todayAttendance?.status !== "CHECKED_IN"
    ) {
      return;
    }

    let cancelled = false;

    async function sendTrackingPing() {
      try {
        const position = await new Promise<GeolocationPosition>((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, {
            enableHighAccuracy: true,
            timeout: 10000
          });
        });

        if (cancelled) {
          return;
        }

        const nextCoords = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude
        };
        setCoords(nextCoords);

        const response = await apiFetch<{ message: string; capturedAt: string }>(
          session,
          "/attendance/location-ping",
          {
            method: "POST",
            body: JSON.stringify({
              latitude: nextCoords.latitude,
              longitude: nextCoords.longitude,
              accuracyMeters: position.coords.accuracy
            })
          }
        );

        if (cancelled) {
          return;
        }

        setTrackingMessage(`${response.message} Last sync ${formatDateTime(response.capturedAt)}.`);
        await loadOverview();
      } catch (trackingError) {
        if (!cancelled) {
          setTrackingMessage(
            trackingError instanceof Error
              ? trackingError.message
              : "Tracking could not update your current location."
          );
        }
      }
    }

    void sendTrackingPing();
    const interval = window.setInterval(() => {
      void sendTrackingPing();
    }, 10 * 60 * 1000);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [overview?.tracking.available, overview?.tracking.active, overview?.todayAttendance?.status, session]);

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
          setStatus("Location locked. You are ready for the next step.");
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
    setCameraReady(true);
    setStatus("Camera is ready. Capture a fresh selfie to continue.");
  }

  function captureSelfie() {
    if (!videoRef.current) {
      return;
    }

    const canvas = document.createElement("canvas");
    const sourceWidth = videoRef.current.videoWidth || 640;
    const sourceHeight = videoRef.current.videoHeight || 480;
    const targetWidth = Math.min(sourceWidth, 480);
    const scaleRatio = targetWidth / sourceWidth;
    const targetHeight = Math.max(Math.round(sourceHeight * scaleRatio), 360);
    canvas.width = targetWidth;
    canvas.height = targetHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      return;
    }

    ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
    setSelfie(canvas.toDataURL("image/jpeg", 0.72));
    setStatus("Selfie captured. You can submit attendance now.");
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
      setAttendanceSummary({
        mode,
        branchName: overview.branch.name,
        time: new Date().toISOString(),
        distanceMeters: data.distanceMeters,
        image: selfie
      });
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
    if (loadError) {
      return (
        <main className="workspace">
          <section className="panel">
            <span className="eyebrow">ATTENDIFY</span>
            <h2>Unable to open your workspace</h2>
            <p className="error-text">{loadError}</p>
            <div className="action-row">
              <button className="primary-button" onClick={() => void loadOverview()}>
                Try again
              </button>
              <button className="ghost-button" onClick={onLogout}>
                Back to sign in
              </button>
            </div>
          </section>
        </main>
      );
    }

    return <LoadingWorkspace title="Preparing your workspace" lines={4} />;
  }

  const canCheckOut = overview.todayAttendance?.status === "CHECKED_IN";
  const hasCheckedIn = !!overview.todayAttendance;
  const geofenceDistance =
    coords
      ? getDistanceMeters(
          coords.latitude,
          coords.longitude,
          overview.branch.latitude,
          overview.branch.longitude
        )
      : null;
  const insideGeofence =
    geofenceDistance !== null ? geofenceDistance <= overview.branch.radiusMeters : null;
  const completedThisMonth = overview.recentAttendance.filter((record) => {
    if (!record.checkOutTime) {
      return false;
    }

    const date = new Date(record.checkOutTime);
    const now = new Date();
    return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
  }).length;
  const lastActionTime =
    overview.todayAttendance?.checkOutTime ?? overview.todayAttendance?.checkInTime ?? null;
  const employeeSteps = [
    {
      title: "Allow location",
      detail: coords ? `Locked at ${coords.latitude.toFixed(5)}, ${coords.longitude.toFixed(5)}` : "We use your live location to confirm you are at the branch.",
      complete: !!coords
    },
    {
      title: "Start camera",
      detail: cameraReady ? "Camera is ready for a fresh selfie." : "Turn on the front camera before capturing attendance proof.",
      complete: cameraReady
    },
    {
      title: "Capture selfie",
      detail: selfie ? "Selfie captured and ready to attach." : "Take a clear selfie before you check in or check out.",
      complete: !!selfie
    },
    {
      title: canCheckOut ? "Check out" : "Check in",
      detail: canCheckOut ? "Finish your day once your work is complete." : "Submit your attendance once location and selfie are ready.",
      complete: canCheckOut ? overview.todayAttendance?.status === "COMPLETED" : hasCheckedIn
    }
  ];
  const tutorialSteps = [
    {
      title: "Allow location",
      detail: "Tap the location button so ATTENDIFY can check that you are near your branch."
    },
    {
      title: "Start camera",
      detail: "Open the front camera and get ready for a quick selfie."
    },
    {
      title: "Capture selfie",
      detail: "Take a clear selfie so the check-in includes attendance proof."
    },
    {
      title: "Check in",
      detail: "Submit once everything is ready. You will see a confirmation right away."
    }
  ];

  return (
    <main className="workspace">
      <header className="topbar">
        <div>
          <span className="eyebrow">ATTENDIFY employee view</span>
          <h2>{overview.employee.name}</h2>
          <p className="muted">
            {overview.employee.designation} at {overview.branch.name} for {session.user.vendorName}
          </p>
        </div>
        <button className="ghost-button" onClick={onLogout}>
          Log out
        </button>
      </header>

      <div className="action-row tutorial-toolbar">
        <button className="ghost-button tutorial-button" onClick={() => setShowTutorial(true)}>
          How to mark attendance
        </button>
      </div>

      <section className="metric-grid">
        <MetricCard label="Today's status" value={overview.todayAttendance?.status ?? "Not marked"} />
        <MetricCard label="Last activity" value={lastActionTime ? formatTimeOnly(lastActionTime) : "Pending"} />
        <MetricCard label="Completed this month" value={completedThisMonth} />
        <MetricCard label="Assigned branch" value={overview.branch.name} />
      </section>

      <section className="grid two-column">
        <article className="panel">
          <h3>Today's status</h3>
          <p className="muted section-intro">A quick view of your shift so far.</p>
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
          <div className="stat-row">
            {overview.tracking.available ? (
              <>
                <div>
                  <span className="label">Tracking status</span>
                  <strong>{overview.tracking.active ? "Tracking live" : "Tracking off"}</strong>
                </div>
                <div>
                  <span className="label">Location updates today</span>
                  <strong>{overview.tracking.pointsCapturedToday}</strong>
                </div>
              </>
            ) : (
              <div>
                <span className="label">Tracking add-on</span>
                <strong>Not enabled</strong>
              </div>
            )}
          </div>
          <p className="muted">
            Branch target coordinate: {overview.branch.latitude.toFixed(5)},{" "}
            {overview.branch.longitude.toFixed(5)}
          </p>
          {overview.tracking.available && overview.tracking.lastTrackedAt ? (
            <p className="muted">Last tracked location: {formatDateTime(overview.tracking.lastTrackedAt)}</p>
          ) : null}
          {overview.tracking.available ? (
            trackingMessage ? <p className="muted">{trackingMessage}</p> : null
          ) : (
            <p className="muted">
              Live movement tracking is a separate add-on and is currently turned off for this workspace.
            </p>
          )}
          {attendanceSummary ? (
            <div className="info-card success-card">
              <strong>{attendanceSummary.mode === "check-in" ? "Check-in saved" : "Check-out saved"}</strong>
              <span>{attendanceSummary.branchName}</span>
              <span>{formatDateTime(attendanceSummary.time)}</span>
              <span>Distance from branch: {attendanceSummary.distanceMeters.toFixed(1)}m</span>
              <img alt="Latest attendance selfie" className="summary-image" src={attendanceSummary.image} />
            </div>
          ) : null}
        </article>

        <article className="panel">
          <h3>Mark attendance with confidence</h3>
          <p className="muted section-intro">Just follow the steps below. We will guide you through it.</p>
          <div className="step-list">
            {employeeSteps.map((step, index) => (
              <div className={`step-card${step.complete ? " complete" : ""}`} key={step.title}>
                <span className="step-index">{index + 1}</span>
                <div>
                  <strong>{step.title}</strong>
                  <span>{step.detail}</span>
                </div>
              </div>
            ))}
          </div>
          <div className="action-row attendance-action-row">
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
            {selfie ? <img alt="Captured selfie" src={selfie} /> : <div className="empty-media">Selfie preview will appear here.</div>}
          </div>
          <div className="status-card-row">
            <div className={`status-chip${insideGeofence === false ? " warning" : insideGeofence ? " success" : ""}`}>
              {insideGeofence === null
                ? "Lock your location to check branch distance."
                : insideGeofence
                  ? `Inside branch area by ${geofenceDistance?.toFixed(1)}m`
                  : `Outside branch area by ${geofenceDistance?.toFixed(1)}m`}
            </div>
            <div className="status-chip">
              Current GPS:{" "}
              {coords
                ? `${coords.latitude.toFixed(5)}, ${coords.longitude.toFixed(5)}`
                : "Not locked yet"}
            </div>
          </div>
          {status ? <p className="status-text">{status}</p> : null}
          <div className="action-row attendance-action-row">
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
        <p className="muted section-intro">Your latest attendance activity appears here.</p>
        <AttendanceTable
          records={overview.recentAttendance}
          emptyMessage="No attendance has been marked yet. Your latest check-ins will appear here."
        />
      </section>
      {showTutorial ? (
        <div className="tutorial-backdrop" onClick={() => setShowTutorial(false)}>
          <div className="tutorial-modal" onClick={(event) => event.stopPropagation()}>
            <span className="eyebrow">How it works</span>
            <h3>Mark attendance in 4 simple steps</h3>
            <p className="muted">
              This short guide shows the usual flow your team should follow every day.
            </p>
            <div className="tutorial-steps">
              {tutorialSteps.map((step, index) => (
                <div
                  className={`tutorial-step${activeTutorialStep === index ? " active" : ""}`}
                  key={step.title}
                >
                  <span className="tutorial-step-number">{index + 1}</span>
                  <div>
                    <strong>{step.title}</strong>
                    <span>{step.detail}</span>
                  </div>
                </div>
              ))}
            </div>
            <div className="tutorial-actions">
              <button className="ghost-button" onClick={() => setShowTutorial(false)}>
                Skip
              </button>
              <button
                className="primary-button"
                onClick={() =>
                  setActiveTutorialStep((current) => (current + 1) % tutorialSteps.length)
                }
              >
                Next step
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </main>
  );
}
