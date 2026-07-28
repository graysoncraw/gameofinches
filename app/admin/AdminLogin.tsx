"use client";

import { ArrowLeft, KeyRound, LoaderCircle, LockKeyhole } from "lucide-react";
import Link from "next/link";
import { FormEvent, useState } from "react";

export default function AdminLogin() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError("");
    try {
      const response = await fetch("/api/admin/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const payload = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(payload.error ?? "Unable to sign in.");
      window.location.reload();
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Unable to sign in.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="admin-login-page">
      <Link href="/" className="admin-back">
        <ArrowLeft size={16} aria-hidden="true" /> League site
      </Link>
      <section className="admin-login-card">
        <div className="admin-login-icon">
          <LockKeyhole size={28} aria-hidden="true" />
        </div>
        <span>GAME OF INCHES · COMMISSIONER DESK</span>
        <h1>Enter the war room.</h1>
        <p>
          Use the shared commissioner password to manage the official keeper
          ledger. Approved devices stay signed in for 30 days.
        </p>
        <form onSubmit={submit}>
          <label>
            <span>Commissioner password</span>
            <div className="admin-password-field">
              <KeyRound size={17} aria-hidden="true" />
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                autoComplete="current-password"
                autoFocus
                required
              />
            </div>
          </label>
          {error && <div className="admin-login-error">{error}</div>}
          <button type="submit" disabled={submitting || !password}>
            {submitting ? (
              <LoaderCircle className="spin" size={17} aria-hidden="true" />
            ) : (
              <LockKeyhole size={17} aria-hidden="true" />
            )}
            Unlock commissioner desk
          </button>
        </form>
      </section>
    </main>
  );
}
