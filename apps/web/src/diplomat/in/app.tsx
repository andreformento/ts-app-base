import { useMe, useSignOut } from '../../application/auth.js';
import { SignIn } from './sign-in.js';
import { SpaceList } from './space-list.js';

export function App() {
  const me = useMe();
  const signOut = useSignOut();

  return (
    <main className="mx-auto flex max-w-2xl flex-col gap-8 p-6">
      <header className="flex items-center justify-between">
        <h1 className="text-xl font-bold">appname</h1>
        {me.isSuccess && (
          <div className="flex items-center gap-3">
            <span className="text-sm text-neutral-600">{me.data.name}</span>
            <button
              type="button"
              onClick={() => {
                signOut.mutate();
              }}
              className="rounded border px-3 py-1"
            >
              Sign out
            </button>
          </div>
        )}
      </header>

      {me.isPending ? (
        <p>Loading…</p>
      ) : me.isSuccess ? (
        <SpaceList />
      ) : (
        <SignIn />
      )}
    </main>
  );
}
