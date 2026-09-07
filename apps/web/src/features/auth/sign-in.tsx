import { useEffect, useRef } from 'react';
import { useNavigate, useSearch } from '@tanstack/react-router';
import { useSignIn } from './use-session';

export function SignIn() {
  const signIn = useSignIn();
  const navigate = useNavigate({ from: '/' });
  const { id_token: token } = useSearch({ from: '/' });
  const attempted = useRef(false);

  useEffect(() => {
    if (attempted.current || token === undefined) return;

    attempted.current = true;
    void navigate({ search: {}, replace: true });
    signIn.mutate(token);
  }, [navigate, signIn, token]);

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
