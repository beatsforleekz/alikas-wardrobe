"use client";

import { useEffect, useState } from "react";
import Image from "next/image";

import { LoginForm } from "@/components/auth/login-form";
import { InventoryDashboard } from "@/components/inventory/inventory-dashboard";
import { CollectionNav } from "@/components/navigation/collection-nav";
import { BrandedLoadingScreen } from "@/components/ui/branded-loading-screen";
import { EmptyState } from "@/components/ui/empty-state";
import { getInventoryItems } from "@/lib/data/inventory";
import { useWardrobeSession } from "@/hooks/use-wardrobe-session";
import type { InventoryItem } from "@/types/inventory";

export function InventoryApp() {
  const { supabase, session, isSessionLoading, handleLogin } = useWardrobeSession();
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [isInventoryLoading, setIsInventoryLoading] = useState(false);
  const [inventoryError, setInventoryError] = useState("");

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
  }, [session, supabase]);

  if (isSessionLoading) {
    return <BrandedLoadingScreen title="Preparing your wardrobe" />;
  }

  if (!session) {
    return <LoginForm onSubmit={handleLogin} />;
  }

  return (
    <main className="page-shell">
      <CollectionNav />

      <header className="page-header">
        <h1 className="page-title">Wardrobe</h1>
      </header>

      {inventoryError ? (
        <section className="dashboard">
          <EmptyState title="Could not load inventory" description={inventoryError} />
        </section>
      ) : isInventoryLoading ? (
        <BrandedLoadingScreen title="Preparing your wardrobe" />
      ) : items.length === 0 ? (
        <section className="dashboard">
          <EmptyState
            title="No inventory items found"
            description="You are signed in successfully, but no inventory rows were returned for this user under the current RLS policies."
          />
        </section>
      ) : (
        <InventoryDashboard
          items={items}
          supabase={supabase}
          userId={session.user.id}
          onItemsChange={setItems}
        />
      )}
    </main>
  );
}
