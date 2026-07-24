export default function CheckoutSuccess() {
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6 py-16 text-center">
      <h1 className="text-3xl font-semibold tracking-tight">You&apos;re all set 🎉</h1>
      <p className="mt-4 text-muted">
        Your subscription is active. Open the Perfext extension, sign in with this
        account, and switch the AI source to Perfext AI.
      </p>
      <a
        href="/"
        className="mx-auto mt-8 inline-flex items-center justify-center rounded-lg bg-white px-6 py-3 font-medium text-black transition hover:bg-neutral-200"
      >
        Back to home
      </a>
    </main>
  );
}
