"use client";

import Link from "next/link";

/**
 * App Router error screen: shown if server-side loading (SSR) fails.
 * Replaces Next's generic page with a clear message and a way to retry
 * without losing context.
 */
export default function Erro({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="status" role="alert">
      <h1>Couldn't load this page</h1>
      <p>The server didn't respond as expected. Your data was not changed.</p>
      <div className="form-acoes" style={{ justifyContent: "center" }}>
        <Link href="/" className="btn">
          Go to home
        </Link>
        <button type="button" className="btn btn-primario" onClick={reset}>
          Try again
        </button>
      </div>
    </div>
  );
}
