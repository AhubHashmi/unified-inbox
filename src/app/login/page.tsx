type LoginPageProps = {
  searchParams: Promise<{ from?: string; error?: string }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;
  const from = params.from ?? "/";
  const hasError = params.error === "1";

  return (
    <main className="flex min-h-screen items-center justify-center bg-neutral-950 px-4">
      <form
        action="/api/login"
        method="POST"
        className="w-full max-w-sm rounded-xl border border-neutral-800 bg-neutral-900 p-8 shadow-xl"
      >
        <h1 className="mb-1 text-xl font-semibold text-white">
          Unified Inbox
        </h1>
        <p className="mb-6 text-sm text-neutral-400">
          Team login — enter the shared password.
        </p>

        <input type="hidden" name="from" value={from} />

        <label className="mb-1 block text-xs font-medium text-neutral-400">
          Password
        </label>
        <input
          type="password"
          name="password"
          autoFocus
          required
          className="mb-4 w-full rounded-md border border-neutral-700 bg-neutral-800 px-3 py-2 text-white outline-none focus:border-indigo-500"
        />

        {hasError && (
          <p className="mb-4 text-sm text-red-400">Incorrect password.</p>
        )}

        <button
          type="submit"
          className="w-full rounded-md bg-indigo-600 px-3 py-2 font-medium text-white transition hover:bg-indigo-500"
        >
          Sign in
        </button>
      </form>
    </main>
  );
}
