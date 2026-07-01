import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { loginUser } from "../services/authService";
import { disablePushNotifications } from "../services/pushNotificationService";
import "./Login.css";

function Login() {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // Auto restore session when PWA opens
  useEffect(() => {
    try {
      const token = localStorage.getItem("token");
      const isLoggedIn = localStorage.getItem("isLoggedIn");

      if (token && isLoggedIn === "true") {
        navigate("/dashboard", { replace: true });
      }
    } catch (error) {
      console.error("Session restore failed:", error);
    }
  }, [navigate]);

 const clearOldSessionBeforeLogin = () => {
  const oldToken = localStorage.getItem("token");

  localStorage.removeItem("token");
  localStorage.removeItem("user");
  localStorage.removeItem("activeModule");
  localStorage.removeItem("sidebarCollapsed");
  localStorage.removeItem("notificationFocus");
  localStorage.removeItem("isLoggedIn");
  localStorage.removeItem("lastLoginTime");

  sessionStorage.clear();

  if (oldToken) {
    disablePushNotifications().catch((error) => {
      console.log("Old push cleanup failed:", error?.message || error);
    });
  }
};

  const saveLoginSession = (response) => {
    const token = response?.data?.data?.token;
    const loggedUser = response?.data?.data?.user;

    if (!token || !loggedUser) {
      throw new Error("Invalid login response from server");
    }

    const normalizedUser = {
      ...loggedUser,
      id: loggedUser.id || loggedUser._id,
      _id: loggedUser._id || loggedUser.id,
    };

    localStorage.setItem("token", String(token));
    localStorage.setItem("user", JSON.stringify(normalizedUser));
    localStorage.setItem("isLoggedIn", "true");
    localStorage.setItem("lastLoginTime", Date.now().toString());
  };

  const handleLogin = async (e) => {
    e.preventDefault();

    if (isLoggingIn) return;

    if (!email.trim() || !password.trim()) {
      alert("Please enter email and password");
      return;
    }

    setIsLoggingIn(true);

    try {
       clearOldSessionBeforeLogin();

      const response = await loginUser({
        email: email.trim(),
        password,
      });

      saveLoginSession(response);

      // small delay ensures storage write completion
      setTimeout(() => {
        navigate("/dashboard", { replace: true });
      }, 100);
    } catch (error) {
      alert(
        error?.response?.data?.message ||
          error?.message ||
          "Login failed"
      );
    } finally {
      setIsLoggingIn(false);
    }
  };

  return (
    <div
      className="login-page"
      style={{
        backgroundImage: `url(/steel-bg.jpg)`,
      }}
    >
      <div className="login-overlay">
        <form className="login-card" onSubmit={handleLogin}>
          <div className="login-badge">Bharat RMS</div>

          <div className="login-logo-box">
            <img
              src="/logo.png"
              alt="Bharat Special Steel"
              className="login-logo"
            />
          </div>

          <h1 className="login-title">Welcome Back</h1>

          <p className="login-subtitle">
            Login to manage sales, dispatch, attendance and approvals.
          </p>

          <div className="login-field">
            <label>Email Address</label>
            <input
              type="email"
              placeholder="Enter your email"
              value={email}
              autoComplete="email"
              onChange={(e) => setEmail(e.target.value)}
              disabled={isLoggingIn}
              required
            />
          </div>

          <div className="login-field">
            <label>Password</label>

            <div className="login-password-row">
              <input
                type={showPassword ? "text" : "password"}
                placeholder="Enter your password"
                value={password}
                autoComplete="current-password"
                onChange={(e) => setPassword(e.target.value)}
                disabled={isLoggingIn}
                required
              />

              <button
                type="button"
                className="login-show-btn"
                onClick={() => setShowPassword((prev) => !prev)}
                disabled={isLoggingIn}
              >
                {showPassword ? "Hide" : "Show"}
              </button>
            </div>
          </div>

          <button className="login-btn" type="submit" disabled={isLoggingIn}>
            {isLoggingIn ? "Logging in..." : "Login Securely"}
          </button>

          <p className="login-footer">Bharat Special Steels Pvt. Ltd.</p>
        </form>
      </div>
    </div>
  );
}

export default Login;