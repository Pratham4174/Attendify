import { useEffect, useState } from "react";
import { SplashScreen } from "./components/SplashScreen";
import { AdminScreen } from "./screens/AdminScreen";
import { EmployeeScreen } from "./screens/EmployeeScreen";
import { LoginScreen } from "./screens/LoginScreen";
import type { Session } from "./types";

function App() {
  const [session, setSession] = useState<Session | null>(() => {
    const cached = localStorage.getItem("attendance-session");
    return cached ? (JSON.parse(cached) as Session) : null;
  });
  const [showSplash, setShowSplash] = useState(() => !localStorage.getItem("attendance-session"));
  const [splashMinimumElapsed, setSplashMinimumElapsed] = useState(false);
  const [splashReady, setSplashReady] = useState(false);

  useEffect(() => {
    if (session) {
      setShowSplash(false);
      return undefined;
    }

    const timer = window.setTimeout(() => {
      setSplashMinimumElapsed(true);
    }, 3000);

    return () => {
      window.clearTimeout(timer);
    };
  }, []);

  useEffect(() => {
    if (session) {
      return undefined;
    }

    if (splashMinimumElapsed && splashReady) {
      const timer = window.setTimeout(() => {
        setShowSplash(false);
      }, 140);

      return () => {
        window.clearTimeout(timer);
      };
    }

    return undefined;
  }, [session, splashMinimumElapsed, splashReady]);

  useEffect(() => {
    if (session) {
      localStorage.setItem("attendance-session", JSON.stringify(session));
    } else {
      localStorage.removeItem("attendance-session");
    }
  }, [session]);

  return (
    <div className="app-shell">
      <SplashScreen onReady={() => setSplashReady(true)} visible={!session && showSplash} />
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

export default App;
