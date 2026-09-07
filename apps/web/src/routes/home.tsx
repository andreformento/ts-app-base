import { SignIn } from '../features/auth/sign-in';
import { useSession, useSignOut } from '../features/auth/use-session';
import { SpaceList } from '../features/spaces/space-list';

export function Home() {
  const session = useSession();
  const signOut = useSignOut();

  return (
    <main className="mx-auto flex max-w-2xl flex-col gap-8 p-6">
      <header className="flex items-center justify-between">
        <h1 className="text-xl font-bold">appname</h1>
        {session.isSuccess && (
          <div className="flex items-center gap-3">
            <span className="text-sm text-neutral-600">
              {session.data.name}
            </span>
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

      {session.isPending ? (
        <p>Loading…</p>
      ) : session.isSuccess ? (
        <SpaceList />
      ) : (
        <SignIn />
      )}
    </main>
  );
}
