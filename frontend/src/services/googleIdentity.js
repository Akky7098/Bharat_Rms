let googleScriptPromise;
const SCRIPT_ID = 'bharat-google-identity';

export const hasGoogleClientId = value => Boolean(value && value.endsWith('.apps.googleusercontent.com') && !/REPLACE|YOUR_|PLACEHOLDER/i.test(value));

export const loadGoogleIdentity = () => {
  if (window.google?.accounts?.id) return Promise.resolve(window.google.accounts.id);
  if (googleScriptPromise) return googleScriptPromise;
  googleScriptPromise = new Promise((resolve, reject) => {
    const existing = document.getElementById(SCRIPT_ID);
    const script = existing || document.createElement('script');
    let timeout;
    const cleanup = () => {
      clearTimeout(timeout);
      script.removeEventListener('load', loaded);
      script.removeEventListener('error', failed);
    };
    const failed = () => {
      cleanup();
      script.remove();
      reject(new Error('Google sign-in could not load. Please use your email and password or try again.'));
    };
    const loaded = () => {
      if (!window.google?.accounts?.id) return failed();
      cleanup();
      resolve(window.google.accounts.id);
    };
    script.addEventListener('load', loaded);
    script.addEventListener('error', failed);
    timeout = setTimeout(failed, 12000);
    if (!existing) {
      script.id = SCRIPT_ID;
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.defer = true;
      document.head.appendChild(script);
    }
  }).catch(error => {
    googleScriptPromise = undefined;
    throw error;
  });
  return googleScriptPromise;
};
