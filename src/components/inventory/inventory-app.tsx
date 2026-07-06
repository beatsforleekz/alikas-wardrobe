"use client";

import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";

import { LoginForm } from "@/components/auth/login-form";
import { SessionStatus } from "@/components/auth/session-status";
import { InventoryDashboard } from "@/components/inventory/inventory-dashboard";
import { EmptyState } from "@/components/ui/empty-state";
import { getInventoryItems } from "@/lib/data/inventory";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import type { InventoryItem } from "@/types/inventory";

const supabase = getSupabaseBrowserClient();

export function InventoryApp() {
  const [session, setSession] = useState<Session | null>(null);
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [isSessionLoading, setIsSessionLoading] = useState(true);
  const [isInventoryLoading, setIsInventoryLoading] = useState(false);
  const [inventoryError, setInventoryError] = useState("");

  useEffect(() => {
    let isActive = true;

    async function bootstrapSession() {
      const {
        data: { session: currentSession },
      } = await supabase.auth.getSession();

      if (isActive) {
        setSession(currentSession);
        setIsSessionLoading(false);
      }
    }

    void bootstrapSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (!isActive) {
        return;
      }

      setSession(nextSession);
      setInventoryError("");

      if (!nextSession) {
        setItems([]);
      }
    });

    return () => {
      isActive = false;
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    let isActive = true;

    async function loadInventory() {
      if (!session) {
        return;
      }

      setIsInventoryLoading(true);
      setInventoryError("");

      try {
        const nextItems = await getInventoryItems(supabase);

        if (isActive) {
          setItems(nextItems);
        }
      } catch (error) {
        if (isActive) {
          setInventoryError(
            error instanceof Error ? error.message : "Unable to load wardrobe inventory.",
          );
        }
      } finally {
        if (isActive) {
          setIsInventoryLoading(false);
        }
      }
    }

    void loadInventory();

    return () => {
      isActive = false;
    };
  }, [session]);

  async function handleLogin(email: string, password: string) {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      throw new Error(getLoginErrorMessage(error.message));
    }
  }

  async function handleLogout() {
    const { error } = await supabase.auth.signOut();

    if (error) {
      throw new Error(error.message);
    }
  }

  if (isSessionLoading) {
    return <InventoryLoadingScreen message="Checking your wardrobe session..." />;
  }

  if (!session) {
    return <LoginForm onSubmit={handleLogin} />;
  }

  return (
    <main className="page-shell">
      <section className="hero">
        <p className="eyebrow">Personal Collection</p>
        <div className="hero-copy">
          <div className="hero-intro">
            <h1>Alika&apos;s Wardrobe</h1>
            <p>
              A visual archive of your wardrobe, organised for styling, packing and travel.
            </p>
          </div>
          <div className="hero-stack">
            <div className="hero-panel" aria-label="Wardrobe summary">
              <span className="hero-stat">
                <strong>{isInventoryLoading ? "..." : items.length}</strong>
                <small>pieces</small>
              </span>
              <span className="hero-stat">
                <strong>{new Set(items.map((item) => item.category?.trim()).filter(Boolean)).size}</strong>
                <small>categories</small>
              </span>
            </div>
            <SessionStatus email={session.user.email ?? "Signed-in user"} onLogout={handleLogout} />
          </div>
        </div>
      </section>

      {inventoryError ? (
        <section className="dashboard">
          <EmptyState title="Could not load inventory" description={inventoryError} />
        </section>
      ) : isInventoryLoading ? (
        <InventoryLoadingScreen message="Fetching inventory with your Supabase session..." />
      ) : items.length === 0 ? (
        <section className="dashboard">
          <EmptyState
            title="No inventory items found"
            description="You are signed in successfully, but no inventory rows were returned for this user under the current RLS policies."
          />
        </section>
      ) : (
        <InventoryDashboard items={items} />
      )}
    </main>
  );
}

function InventoryLoadingScreen({ message }: { message: string }) {
  return (
    <main className="page-shell">
      <section className="setup-notice">
        <p className="eyebrow">Loading</p>
        <h1>Preparing your wardrobe</h1>
        <p>{message}</p>
      </section>
    </main>
  );
}

function getLoginErrorMessage(message: string) {
  const normalized = message.toLowerCase();

  if (normalized.includes("invalid login credentials")) {
    return "Incorrect email or password. Check your login details and try again.";
  }

  if (normalized.includes("email not confirmed")) {
    return "This account email has not been confirmed yet.";
  }

  return message;
}
