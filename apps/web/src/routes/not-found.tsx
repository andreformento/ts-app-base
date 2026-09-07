import { Link } from '@tanstack/react-router';

export function NotFound() {
  return (
    <main className="mx-auto flex max-w-2xl flex-col items-start gap-4 p-6">
      <h1 className="text-xl font-bold">This page does not exist</h1>
      <p className="text-neutral-600">
        The address you followed does not lead anywhere in appname.
      </p>
      <Link to="/" className="rounded bg-neutral-900 px-4 py-2 text-white">
        Go to your spaces
      </Link>
    </main>
  );
}
