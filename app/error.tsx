"use client";
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <main className="auth-shell">
      <div className="card">
        <h1>A little interruption</h1>
        <p>
          We couldn’t load this page. Your saved memories are still in your
          account.
        </p>
        <button className="primary" onClick={reset}>
          Try again
        </button>
      </div>
    </main>
  );
}
