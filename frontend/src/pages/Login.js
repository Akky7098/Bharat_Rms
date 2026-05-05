import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { loginUser } from "../services/authService";
import "./Login.css";

function Login() {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();

    if (isLoggingIn) return;

    if (!email.trim() || !password.trim()) {
      alert("Please enter email and password");
      return;
    }

    setIsLoggingIn(true);

    try {
      const response = await loginUser({
        email: email.trim(),
        password,
      });

      localStorage.setItem("token", response.data.data.token);
      localStorage.setItem("user", JSON.stringify(response.data.data.user));

      navigate("/dashboard");
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
        backgroundImage: `url(${process.env.PUBLIC_URL}/steel-bg.jpg)`,
      }}
    >
      <div className="overlay">
        <form className="login-card" onSubmit={handleLogin}>
          <div className="logo-section">
            <img src="/logo.png" alt="Company Logo" className="logo" />
            <h2>Bharat Special Steels</h2>
            <p>Resource Management System</p>
          </div>

          <div className="input-group">
            <input
              type="email"
              placeholder="Enter Email"
              value={email}
              autoComplete="email"
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="input-group password-box">
            <input
              type={showPassword ? "text" : "password"}
              placeholder="Enter Password"
              value={password}
              autoComplete="current-password"
              onChange={(e) => setPassword(e.target.value)}
              required
            />

            <span
              className="eye-icon"
              onClick={() => setShowPassword(!showPassword)}
            >
              {showPassword ? "🙈" : "👁"}
            </span>
          </div>

          <button className="login-btn" type="submit" disabled={isLoggingIn}>
            {isLoggingIn ? "Logging in..." : "Login"}
          </button>
        </form>
      </div>
    </div>
  );
}

export default Login;