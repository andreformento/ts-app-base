import { useEffect, useRef } from 'react';
import { useSignIn } from '../../application/auth.js';

export function SignIn() {
  const signIn = useSignIn();
  const attempted = useRef(false);

  useEffect(() => {
    if (attempted.current) return;
    const token = new URLSearchParams(window.location.search).get('id_token');
    if (token === null) return;

    attempted.current = true;
    window.history.replaceState({}, '', window.location.pathname);
    signIn.mutate(token);
  }, [signIn]);

  const env = import.meta.env as Record<string, string | undefined>;
  const authorizeUrl = env['VITE_OIDC_AUTHORIZE_URL'] ?? '';

  return (
    <div className="flex flex-col items-start gap-4">
      <h2 className="text-lg font-semibold">Sign in</h2>
      <p className="text-neutral-600">
        A private space for the people you choose.
      </p>
      <a
        href={`${authorizeUrl}?redirect_uri=${encodeURIComponent(window.location.origin)}`}
        className="rounded bg-neutral-900 px-4 py-2 text-white"
      >
        Continue with Google
      </a>
      {signIn.isError && <p role="alert">Sign in failed. Please try again.</p>}
    </div>
  );
}
