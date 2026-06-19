"use client";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="vi">
      <body>
        <div className="flex min-h-screen flex-col items-center justify-center gap-4 text-center">
          <h2 className="text-2xl font-semibold">Application error</h2>
          <p>{error.message}</p>
          <button onClick={reset}>Reload</button>
        </div>
      </body>
    </html>
  );
}
