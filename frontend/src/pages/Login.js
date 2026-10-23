import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { loginUser, loginWithGoogle, linkGoogleAccount } from '../services/authService';
import GoogleSignInButton from '../components/GoogleSignInButton';
import './Login.css';

const GOOGLE_CLIENT_ID = (process.env.REACT_APP_GOOGLE_CLIENT_ID || '').trim();
const loginError = (error, method) => {
  const code = error?.response?.data?.code;
  if (code === 'API_ROUTE_NOT_FOUND' || error?.response?.status === 404) return method === 'google' ? 'Google sign-in is unavailable on this server. Please use your email and password.' : 'Sign-in is unavailable on this server. Please try again later.';
  if (code === 'ACCOUNT_INACTIVE') return 'Your account is inactive. Please contact your RMS administrator.';
  if (code === 'GOOGLE_USER_NOT_REGISTERED') return 'This Google email is not registered with Bharat RMS. Use your registered account or contact your administrator.';
  if (code === 'GOOGLE_LINK_REQUIRED') return 'Confirm your RMS email and password below to link this Google account and sign in.';
  if (code === 'GOOGLE_LOGIN_DISABLED') return 'Google sign-in is not available yet. Please use your email and password.';
  return error?.response?.data?.message || error?.message || 'Unable to sign in. Please try again.';
};

function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loginMethod, setLoginMethod] = useState(null);
  const [error, setError] = useState('');
  const busy = useRef(false);
  const pendingGoogleCredential = useRef(null);
  const mounted = useRef(true);
  const isLoggingIn = Boolean(loginMethod);

  useEffect(() => {
    mounted.current = true;
    try {
      const notice = sessionStorage.getItem('authNotice');
      if (notice) { setError(notice); sessionStorage.removeItem('authNotice'); }
      if (localStorage.getItem('token') && localStorage.getItem('isLoggedIn') === 'true') {
        navigate('/dashboard', { replace: true });
      }
    } catch { setError('Browser storage is unavailable. Please allow site storage and try again.'); }
    return () => { mounted.current = false; };
  }, [navigate]);

  const saveLoginSession = response => {
    const token = response?.data?.data?.token;
    const user = response?.data?.data?.user;
    if (!token || !user || !(user.id || user._id)) throw new Error('Invalid login response from server. Please try again.');
    const normalizedUser = { ...user, id: user.id || user._id, _id: user._id || user.id };
    // Reset workspace context only after the server confirms a successful login.
    ['activeModule', 'sidebarCollapsed', 'notificationFocus'].forEach(key => localStorage.removeItem(key));
    sessionStorage.clear();
    localStorage.setItem('token', String(token));
    localStorage.setItem('user', JSON.stringify(normalizedUser));
    localStorage.setItem('lastLoginTime', Date.now().toString());
    localStorage.setItem('isLoggedIn', 'true');
  };

  const submitLogin = async (method, request) => {
    if (busy.current) return;
    busy.current = true;
    setLoginMethod(method);
    setError('');
    try {
      const response = await request();
      if (!mounted.current) return;
      saveLoginSession(response);
      navigate('/dashboard', { replace: true });
    } catch (failure) {
      if (failure?.response?.data?.code !== 'GOOGLE_LINK_REQUIRED') pendingGoogleCredential.current = null;
      if (mounted.current) setError(loginError(failure, method));
    } finally {
      busy.current = false;
      if (mounted.current) setLoginMethod(null);
    }
  };

  const handleLogin = event => {
    event.preventDefault();
    if (!email.trim() || !password) {
      setError('Please enter your email address and password.');
      return;
    }
    submitLogin('password', async () => {
      const response = await loginUser({ email: email.trim(), password });
      if (pendingGoogleCredential.current) {
        const credential = pendingGoogleCredential.current;
        pendingGoogleCredential.current = null;
        try {
          await linkGoogleAccount(credential, response?.data?.data?.token);
        } catch {
          throw new Error('Google could not be linked. You can sign in with your password again to continue, or retry Google sign-in.');
        }
      }
      return response;
    });
  };

  const handleGoogleLogin = credential => {
    if (busy.current) return;
    if (typeof credential !== 'string' || !credential) {
      setError('Google did not return a sign-in credential. Please try again.');
      return;
    }
    pendingGoogleCredential.current = credential;
    submitLogin('google', () => loginWithGoogle(credential));
  };

  return (
    <main className="login-page" style={{ backgroundImage: 'url(/steel-bg.jpg)' }}>
      <div className="login-overlay">
        <section className="login-card" aria-labelledby="login-title" aria-busy={isLoggingIn}>
          <div className="login-badge">Bharat RMS</div>
          <div className="login-logo-box"><img src="/logo.png" alt="Bharat Special Steels" className="login-logo" /></div>
          <h1 className="login-title" id="login-title">Welcome Back</h1>

          {error && <div className="login-error" role="alert" id="login-error">{error}</div>}
          {loginMethod === 'google' && <div className="login-progress" role="status">Verifying your Google account…</div>}

          <form onSubmit={handleLogin} aria-label="Sign in with email and password">
            <div className="login-field">
              <label htmlFor="login-email">Email address</label>
              <input id="login-email" name="email" type="email" placeholder="Enter your email" value={email}
                autoComplete="username" inputMode="email" autoCapitalize="none" spellCheck={false}
                onChange={event => setEmail(event.target.value)} disabled={isLoggingIn} required
                aria-describedby={error ? 'login-error' : undefined} />
            </div>
            <div className="login-field">
              <label htmlFor="login-password">Password</label>
              <div className="login-password-row">
                <input id="login-password" name="password" type={showPassword ? 'text' : 'password'} placeholder="Enter your password"
                  value={password} autoComplete="current-password" onChange={event => setPassword(event.target.value)}
                  disabled={isLoggingIn} required aria-describedby={error ? 'login-error' : undefined} />
                <button type="button" className="login-show-btn" onClick={() => setShowPassword(value => !value)}
                  disabled={isLoggingIn} aria-label={showPassword ? 'Hide password' : 'Show password'} aria-pressed={showPassword}>
                  {showPassword ? 'Hide' : 'Show'}
                </button>
              </div>
            </div>
            <button className="login-btn" type="submit" disabled={isLoggingIn}>
              {loginMethod === 'password' ? 'Signing in…' : 'Login Securely'}
            </button>
          </form>

          <GoogleSignInButton clientId={GOOGLE_CLIENT_ID} disabled={isLoggingIn} onCredential={handleGoogleLogin} />
          <p className="login-footer">Bharat Special Steels Pvt. Ltd.</p>
        </section>
      </div>
    </main>
  );
}
export default Login;
