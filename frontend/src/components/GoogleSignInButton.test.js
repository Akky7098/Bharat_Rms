import { act, render, waitFor } from '@testing-library/react';
import GoogleSignInButton from './GoogleSignInButton';
import { loadGoogleIdentity } from '../services/googleIdentity';
jest.mock('../services/googleIdentity', () => ({ hasGoogleClientId: () => true, loadGoogleIdentity: jest.fn() }));

test('resize callbacks defer rendering and ignore iframe height changes', async () => {
  const originalObserver = global.ResizeObserver;
  let notify;
  let observed;
  let frame;
  let width = 340;
  const disconnect = jest.fn();
  global.ResizeObserver = class {
    constructor(callback) { notify = callback; }
    observe(element) { observed = element; }
    disconnect() { disconnect(); }
  };
  const request = jest.spyOn(window, 'requestAnimationFrame').mockImplementation(callback => { frame = callback; return 1; });
  const cancel = jest.spyOn(window, 'cancelAnimationFrame').mockImplementation(() => {});
  jest.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(() => ({ width }));
  const renderButton = jest.fn();
  loadGoogleIdentity.mockResolvedValue({ initialize() {}, renderButton });
  try {
    const { unmount } = render(<GoogleSignInButton clientId="test" onCredential={() => {}} />);
    await waitFor(() => expect(renderButton).toHaveBeenCalledTimes(1));
    expect(observed).toHaveClass('login-google-section');
    act(() => { notify([{ contentRect: { width: 354, height: 60 } }]); });
    expect(renderButton).toHaveBeenCalledTimes(1);
    act(() => { frame(); });
    expect(renderButton).toHaveBeenCalledTimes(1);
    const frames = request.mock.calls.length;
    act(() => { notify([{ contentRect: { width: 354, height: 90 } }]); });
    expect(request).toHaveBeenCalledTimes(frames);
    width = 300;
    act(() => { notify([{ contentRect: { width: 314, height: 90 } }]); });
    expect(renderButton).toHaveBeenCalledTimes(1);
    act(() => { frame(); });
    expect(renderButton).toHaveBeenCalledTimes(2);
    expect(renderButton.mock.calls[1][1].width).toBe(300);
    act(() => { notify([{ contentRect: { width: 280, height: 90 } }]); });
    unmount();
    expect(disconnect).toHaveBeenCalled();
    expect(cancel).toHaveBeenCalled();
  } finally {
    global.ResizeObserver = originalObserver;
    jest.restoreAllMocks();
  }
});
