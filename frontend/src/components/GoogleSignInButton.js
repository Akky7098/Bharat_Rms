import { useEffect, useRef, useState } from 'react';
import { hasGoogleClientId, loadGoogleIdentity } from '../services/googleIdentity';

export default function GoogleSignInButton({ clientId, disabled, onCredential }) {
  const host = useRef(null);
  const section = useRef(null);
  const latest = useRef({ disabled, onCredential });
  latest.current = { disabled, onCredential };
  const [state, setState] = useState('loading');
  const [attempt, setAttempt] = useState(0);
  const configured = hasGoogleClientId(clientId);

  useEffect(() => {
    if (!configured) return;
    let cancelled = false;
    let observer;
    let frame;
    setState('loading');
    loadGoogleIdentity().then(google => {
      if (cancelled || !host.current) return;
      google.initialize({
        client_id: clientId,
        auto_select: false,
        ux_mode: 'popup',
        context: 'signin',
        callback: response => {
          if (!cancelled && !latest.current.disabled) latest.current.onCredential(response.credential);
        },
      });
      let lastWidth;
      const render = () => {
        if (cancelled || !host.current) return;
        const width = Math.min(400, Math.floor(host.current.getBoundingClientRect().width));
        if (width < 100 || width === lastWidth) return;
        lastWidth = width;
        host.current.replaceChildren();
        google.renderButton(host.current, {
          type: 'standard', theme: 'outline', size: 'large', text: 'signin_with',
          shape: 'rectangular', logo_alignment: 'left', width,
        });
      };
      render();
      if (typeof ResizeObserver !== 'undefined') {
        let observedWidth;
        observer = new ResizeObserver(entries => {
          const width = Math.floor(entries[0]?.contentRect.width || 0);
          // Google changes iframe height during personalization. Ignore those
          // notifications, and never rebuild its DOM inside an observer callback.
          if (width <= 0 || width === observedWidth) return;
          observedWidth = width;
          if (frame !== undefined) cancelAnimationFrame(frame);
          frame = requestAnimationFrame(() => {
            frame = undefined;
            render();
          });
        });
        observer.observe(section.current);
      }
      setState('ready');
    }).catch(() => { if (!cancelled) setState('error'); });
    return () => {
      cancelled = true;
      observer?.disconnect();
      if (frame !== undefined) cancelAnimationFrame(frame);
    };
  }, [clientId, configured, attempt]);

  return (
    <div ref={section} className="login-google-section">
      <div className="login-divider"><span>or</span></div>
      <div className="login-google-slot" data-state={configured ? state : 'unconfigured'} aria-busy={state === 'loading' && configured}>
        <div ref={host} className="login-google-button" inert={disabled ? true : undefined} aria-hidden={disabled ? true : undefined} />
        {(!configured || state !== 'ready') && (
          <div className="login-google-fallback" role="status">
            {!configured ? 'Google sign-in will be available soon.' : state === 'loading' ? 'Loading Google sign-in…' : 'Google sign-in is unavailable right now.'}
            {configured && state === 'error' && <button type="button" onClick={() => setAttempt(value => value + 1)} disabled={disabled}>Try again</button>}
          </div>
        )}
      </div>
    </div>
  );
}
