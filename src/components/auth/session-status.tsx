"use client";

type SessionStatusProps = {
  email: string;
  onLogout: () => Promise<void>;
};

export function SessionStatus({ email, onLogout }: SessionStatusProps) {
  return (
    <div className="session-status">
      <div className="session-copy">
        <span className="session-label">Signed in as</span>
        <span className="session-email">{email}</span>
      </div>
      <button className="secondary-button" type="button" onClick={() => void onLogout()}>
        Sign out
      </button>
    </div>
  );
}
