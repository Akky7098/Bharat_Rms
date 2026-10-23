import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import Login from './Login';
import { loginUser, loginWithGoogle, linkGoogleAccount } from '../services/authService';
import { loadGoogleIdentity } from '../services/googleIdentity';
const mockNavigate = jest.fn();
// CRA's Jest resolver predates React Router's package exports.
jest.mock('react-router-dom', () => ({ useNavigate: () => mockNavigate }), { virtual: true });
jest.mock('../services/authService', () => ({ loginUser: jest.fn(), loginWithGoogle: jest.fn(), linkGoogleAccount: jest.fn() }));
jest.mock('../services/googleIdentity', () => ({ hasGoogleClientId: () => true, loadGoogleIdentity: jest.fn() }));
let googleCallback;
const session = { data: { data: { token: 'rms-session', user: { id: 'user-1', name: 'Person', email: 'person@gmail.com', role: 'user' } } } };
beforeEach(() => {
  jest.clearAllMocks(); localStorage.clear(); sessionStorage.clear();
  jest.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue({ width: 340 });
  loadGoogleIdentity.mockResolvedValue({
    initialize: config => { googleCallback = config.callback; },
    renderButton: host => {
      const button = document.createElement('button');
      button.type = 'button'; button.textContent = 'Sign in with Google';
      button.onclick = () => googleCallback({ credential: 'google-id-token' });
      host.appendChild(button);
    },
  });
  loginUser.mockResolvedValue(session); loginWithGoogle.mockResolvedValue(session);
});
afterEach(() => jest.restoreAllMocks());

test('password login preserves RMS session format and dashboard navigation', async () => {
  render(<Login />);
  fireEvent.change(screen.getByLabelText('Email address'), { target: { value: 'person@gmail.com' } });
  fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'current-password' } });
  fireEvent.click(screen.getByRole('button', { name: /Login Securely/ }));
  await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith('/dashboard', { replace: true }));
  expect(loginUser).toHaveBeenCalledWith({ email: 'person@gmail.com', password: 'current-password' });
  expect(localStorage.getItem('token')).toBe('rms-session');
  expect(JSON.parse(localStorage.getItem('user'))._id).toBe('user-1');
  expect(loginWithGoogle).not.toHaveBeenCalled();
});
test('Google sends only its credential and shares password session handling', async () => {
  render(<Login />);
  fireEvent.click(await screen.findByRole('button', { name: 'Sign in with Google' }));
  await waitFor(() => expect(localStorage.getItem('isLoggedIn')).toBe('true'));
  expect(loginWithGoogle).toHaveBeenCalledWith('google-id-token');
  expect(loginUser).not.toHaveBeenCalled();
  expect(mockNavigate).toHaveBeenCalledWith('/dashboard', { replace: true });
  expect(screen.queryByRole('link', { name: /sign up/i })).not.toBeInTheDocument();
});
test('unknown Google account shows an inline error without a session', async () => {
  loginWithGoogle.mockRejectedValue({ response: { data: { code: 'GOOGLE_USER_NOT_REGISTERED' } } });
  render(<Login />);
  fireEvent.click(await screen.findByRole('button', { name: 'Sign in with Google' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('not registered');
  expect(localStorage.getItem('token')).toBeNull();
  expect(mockNavigate).not.toHaveBeenCalled();
});
test('Google loading failure leaves password login usable and offers retry', async () => {
  loadGoogleIdentity.mockRejectedValue(new Error('offline'));
  render(<Login />);
  expect(await screen.findByRole('button', { name: 'Try again' })).toBeEnabled();
  expect(screen.getByRole('button', { name: /Login Securely/ })).toBeEnabled();
  expect(screen.getByLabelText('Email address')).toBeEnabled();
});
test('concurrent Google callbacks cannot trigger duplicate logins', async () => {
  let complete;
  loginWithGoogle.mockReturnValue(new Promise(resolve => { complete = resolve; }));
  render(<Login />);
  await screen.findByRole('button', { name: 'Sign in with Google' });
  act(() => { googleCallback({ credential: 'first' }); googleCallback({ credential: 'second' }); });
  expect(loginWithGoogle).toHaveBeenCalledTimes(1);
  expect(screen.getByRole('button', { name: /Login Securely/ })).toBeDisabled();
  await act(async () => { complete(session); });
});
test('inactive account notice appears after a protected session is cleared', async () => {
  sessionStorage.setItem('authNotice', 'Your account is inactive. Please contact your RMS administrator.');
  render(<Login />);
  expect(await screen.findByRole('alert')).toHaveTextContent('inactive');
  expect(sessionStorage.getItem('authNotice')).toBeNull();
});

test('third-party Google email is linked only after a successful RMS password login', async () => {
  loginWithGoogle.mockRejectedValue({ response: { data: { code: 'GOOGLE_LINK_REQUIRED' } } });
  linkGoogleAccount.mockResolvedValue({ data: { success: true } });
  render(<Login />);
  fireEvent.click(await screen.findByRole('button', { name: 'Sign in with Google' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('Confirm your RMS email and password');
  expect(linkGoogleAccount).not.toHaveBeenCalled();
  fireEvent.change(screen.getByLabelText('Email address'), { target: { value: 'person@gmail.com' } });
  fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'current-password' } });
  fireEvent.click(screen.getByRole('button', { name: /Login Securely/ }));
  await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith('/dashboard', { replace: true }));
  expect(linkGoogleAccount).toHaveBeenCalledWith('google-id-token', 'rms-session');
});

test('missing backend Google route shows a helpful error without hiding password login', async () => {
  loginWithGoogle.mockRejectedValue({ response: { status: 404, data: { code: 'API_ROUTE_NOT_FOUND' } } });
  render(<Login />);
  fireEvent.click(await screen.findByRole('button', { name: 'Sign in with Google' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('Please use your email and password');
  expect(screen.getByRole('button', { name: /Login Securely/ })).toBeEnabled();
  expect(screen.queryByText(/Your team, orders and operations/)).not.toBeInTheDocument();
});
