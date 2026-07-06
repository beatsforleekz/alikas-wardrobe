"use client";

import { useState, useTransition } from "react";

type LoginFormProps = {
  onSubmit: (email: string, password: string) => Promise<void>;
};

export function LoginForm({ onSubmit }: LoginFormProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [isPending, startTransition] = useTransition();

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage("");

    startTransition(async () => {
      try {
        await onSubmit(email, password);
      } catch (error) {
        setErrorMessage(error instanceof Error ? error.message : "Unable to sign in.");
      }
    });
  }

  return (
    <main className="login-shell">
      <section className="login-card">
        <p className="eyebrow">Private Access</p>
        <h1>Sign in to your wardrobe</h1>
        <p className="login-copy">
          Enter your wardrobe account to browse your collection, view item detail, and
          continue where you left off.
        </p>

        <form className="login-form" onSubmit={handleSubmit}>
          <label className="field">
            <span>Email</span>
            <input
              className="text-input"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@example.com"
              required
            />
          </label>

          <label className="field">
            <span>Password</span>
            <input
              className="text-input"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Password"
              required
            />
          </label>

          {errorMessage ? <p className="form-error">{errorMessage}</p> : null}

          <button className="primary-button" type="submit" disabled={isPending}>
            {isPending ? "Signing in..." : "Sign in"}
          </button>
        </form>
      </section>
    </main>
  );
}
