import { useState } from "react";
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

  const clearOldSession = async () => {
    try {
      if (localStorage.getItem("token")) {
        await disablePushNotifications();
      }
    } catch (error) {
      console.log("Old push cleanup failed:", error.message);
    }

    localStorage.removeItem("token");
    localStorage.removeItem("user");
    localStorage.removeItem("activeModule");
    localStorage.removeItem("sidebarCollapsed");
    localStorage.removeItem("notificationFocus");
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
      await clearOldSession();

      const response = await loginUser({
        email: email.trim(),
        password,
      });

      const loggedUser = response.data.data.user;

      localStorage.setItem("token", response.data.data.token);
      localStorage.setItem(
        "user",
        JSON.stringify({
          ...loggedUser,
          id: loggedUser.id || loggedUser._id,
          _id: loggedUser._id || loggedUser.id,
        })
      );

      navigate("/dashboard", { replace: true });
    } catch (error) {
      alert(error.response?.data?.message || "Login failed");
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
                required
              />

              <button
                type="button"
                className="login-show-btn"
                onClick={() => setShowPassword(!showPassword)}
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