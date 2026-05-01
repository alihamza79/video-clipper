import { useEffect, useRef } from 'react';
import { getApiUrl } from '../config';

const GOOGLE_SCRIPT_ID = 'google-identity-services';

const loadGoogleScript = () => new Promise((resolve, reject) => {
  if (window.google?.accounts?.id) {
    resolve();
    return;
  }

  const existingScript = document.getElementById(GOOGLE_SCRIPT_ID);
  if (existingScript) {
    existingScript.addEventListener('load', () => resolve(), { once: true });
    existingScript.addEventListener('error', () => reject(new Error('Failed to load Google script')), { once: true });
    return;
  }

  const script = document.createElement('script');
  script.id = GOOGLE_SCRIPT_ID;
  script.src = 'https://accounts.google.com/gsi/client';
  script.async = true;
  script.defer = true;
  script.onload = () => resolve();
  script.onerror = () => reject(new Error('Failed to load Google script'));
  document.head.appendChild(script);
});

function GoogleSignInButton({ onLoginSuccess, onError }) {
  const containerRef = useRef(null);
  const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;

  useEffect(() => {
    let mounted = true;

    const initializeGoogleLogin = async () => {
      if (!googleClientId) {
        onError?.('Missing VITE_GOOGLE_CLIENT_ID');
        return;
      }

      try {
        await loadGoogleScript();
        if (!mounted || !containerRef.current) return;

        window.google.accounts.id.initialize({
          client_id: googleClientId,
          callback: async ({ credential }) => {
            try {
              const res = await fetch(getApiUrl('/api/auth/google'), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id_token: credential }),
              });
              const data = await res.json();
              if (!res.ok) throw new Error(data.detail || 'Google auth failed');
              onLoginSuccess?.(data);
            } catch (error) {
              onError?.(error.message);
            }
          },
        });

        containerRef.current.innerHTML = '';
        window.google.accounts.id.renderButton(containerRef.current, {
          theme: 'outline',
          size: 'large',
          text: 'continue_with',
          shape: 'pill',
          width: 260,
        });
      } catch (error) {
        onError?.(error.message);
      }
    };

    initializeGoogleLogin();

    return () => {
      mounted = false;
    };
  }, [googleClientId, onLoginSuccess, onError]);

  return <div ref={containerRef} />;
}

export default GoogleSignInButton;
