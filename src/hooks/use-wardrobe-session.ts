"use client";

import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";

import { getSupabaseBrowserClient } from "@/lib/supabase/client";

const supabase = getSupabaseBrowserClient();

export function useWardrobeSession() {
  const [session, setSession] = useState<Session | null>(null);
  const [isSessionLoading, setIsSessionLoading] = useState(true);

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
      setIsSessionLoading(false);
    });

    return () => {
      isActive = false;
      subscription.unsubscribe();
    };
  }, []);

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

  return {
    supabase,
    session,
    isSessionLoading,
    handleLogin,
    handleLogout,
  };
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
