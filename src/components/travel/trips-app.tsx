"use client";

import { useEffect, useMemo, useState } from "react";

import { LoginForm } from "@/components/auth/login-form";
import { CollectionNav } from "@/components/navigation/collection-nav";
import { TravelShellNav } from "@/components/travel/travel-shell-nav";
import { TripCard } from "@/components/travel/trip-card";
import { TripFormPanel } from "@/components/travel/trip-form-panel";
import { BrandedLoadingScreen } from "@/components/ui/branded-loading-screen";
import { EmptyState } from "@/components/ui/empty-state";
import { createTrip, getTripOutfitLinks, getTrips, updateTrip } from "@/lib/data/travel";
import { useWardrobeSession } from "@/hooks/use-wardrobe-session";
import type { Trip, TripInput } from "@/types/travel";

export function TripsApp() {
  const { supabase, session, isSessionLoading, handleLogin } = useWardrobeSession();
  const [trips, setTrips] = useState<Trip[]>([]);
  const [tripLinks, setTripLinks] = useState<Record<string, number>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [notice, setNotice] = useState("");
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingTrip, setEditingTrip] = useState<Trip | null>(null);

  useEffect(() => {
    let isActive = true;

    async function loadTrips() {
      if (!session) {
        return;
      }

      setIsLoading(true);
      setErrorMessage("");

      try {
        const [nextTrips, nextLinks] = await Promise.all([
          getTrips(supabase),
          getTripOutfitLinks(supabase),
        ]);

        if (!isActive) {
          return;
        }

        setTrips(nextTrips);
        setTripLinks(
          nextLinks.reduce<Record<string, number>>((accumulator, link) => {
            accumulator[link.trip_id] = (accumulator[link.trip_id] ?? 0) + 1;
            return accumulator;
          }, {}),
        );
      } catch (error) {
        if (isActive) {
          setErrorMessage(error instanceof Error ? error.message : "Unable to load trips.");
        }
      } finally {
        if (isActive) {
          setIsLoading(false);
        }
      }
    }

    void loadTrips();

    return () => {
      isActive = false;
    };
  }, [session, supabase]);

  const orderedTrips = useMemo(
    () =>
      [...trips].sort((left, right) => {
        const leftDate = left.start_date ?? "9999-12-31";
        const rightDate = right.start_date ?? "9999-12-31";
        return leftDate.localeCompare(rightDate);
      }),
    [trips],
  );

  async function handleSaveTrip(input: TripInput, tripId?: string) {
    if (!session) {
      return;
    }

    if (tripId) {
      const updated = await updateTrip(supabase, tripId, input);
      setTrips((current) => current.map((trip) => (trip.id === tripId ? updated : trip)));
      setNotice(`${updated.title} updated.`);
      return;
    }

    const created = await createTrip(supabase, session.user.id, input);
    setTrips((current) => [created, ...current]);
    setNotice(`${created.title} added to Travel.`);
  }

  async function handleCloseTrip(trip: Trip) {
    const confirmed = window.confirm(
      `Close "${trip.title}"? This will mark the trip as completed even if packing was not fully finished.`,
    );

    if (!confirmed) {
      return;
    }

    const updated = await updateTrip(supabase, trip.id, {
      title: trip.title,
      destination: trip.destination ?? "",
      notes: trip.notes ?? "",
      start_date: trip.start_date ?? "",
      end_date: trip.end_date ?? "",
      baggage_limit: trip.baggage_limit ?? "",
      baggage_notes: trip.baggage_notes ?? "",
      luggage_type: trip.luggage_type ?? "",
      number_of_bags: trip.number_of_bags,
      weight_allowance: trip.weight_allowance ?? "",
      luggage_dimensions: trip.luggage_dimensions ?? "",
      luggage_assignment_notes: trip.luggage_assignment_notes ?? "",
      status: "completed",
    });

    setTrips((current) => current.map((entry) => (entry.id === trip.id ? updated : entry)));
    setNotice(`${updated.title} closed.`);
  }

  if (isSessionLoading) {
    return <BrandedLoadingScreen title="Preparing your travel suite" theme="travel" />;
  }

  if (!session) {
    return <LoginForm onSubmit={handleLogin} />;
  }

  return (
    <main className="page-shell">
      <CollectionNav />

      <header className="page-header page-header-stack">
        <div>
          <h1 className="page-title">Travel</h1>
        </div>
        <TravelShellNav />
      </header>

      {errorMessage ? (
        <section className="dashboard">
          <EmptyState title="Could not load trips" description={errorMessage} />
        </section>
      ) : isLoading ? (
        <BrandedLoadingScreen title="Preparing your travel suite" theme="travel" />
      ) : (
        <section className="dashboard dashboard-tight">
          <div className="results-bar inventory-overview">
            <div className="results-copy">
              <p className="results-heading">Trip planning</p>
              <p>{orderedTrips.length} saved trip{orderedTrips.length === 1 ? "" : "s"} ready for packing.</p>
            </div>
            <button
              type="button"
              className="primary-button"
              onClick={() => {
                setEditingTrip(null);
                setEditorOpen(true);
              }}
            >
              New trip
            </button>
          </div>

          {notice ? <p className="inline-notice">{notice}</p> : null}

          <div className="travel-shell-grid">
            <article className="detail-card travel-intro-card">
              <p className="eyebrow">Travel suite</p>
              <p className="travel-intro-copy">
                Build the trip first, then let wardrobe packing, essentials, and an optional capsule link layer in around it.
              </p>
            </article>

            <article className="detail-card travel-intro-card">
              <p className="eyebrow">What is ready now</p>
              <div className="travel-meta-list">
                <span className="trip-meta-pill">Trips</span>
                <span className="trip-meta-pill trip-meta-pill-muted">Essentials next</span>
                <span className="trip-meta-pill trip-meta-pill-muted">Packing next</span>
              </div>
            </article>
          </div>

          {orderedTrips.length === 0 ? (
            <EmptyState
              compact
              title="No trips yet"
              description="Create a trip first, then layer outfits, wardrobe packing, and essentials onto it."
            />
          ) : (
            <div className="trips-grid">
              {orderedTrips.map((trip) => (
                <TripCard
                  key={trip.id}
                  trip={trip}
                  outfitCount={tripLinks[trip.id] ?? 0}
                  onEdit={() => {
                    setEditingTrip(trip);
                    setEditorOpen(true);
                  }}
                  onClose={() => void handleCloseTrip(trip)}
                />
              ))}
            </div>
          )}
        </section>
      )}

      <TripFormPanel
        open={editorOpen}
        trip={editingTrip}
        onClose={() => {
          setEditorOpen(false);
          setEditingTrip(null);
        }}
        onSubmit={handleSaveTrip}
      />
    </main>
  );
}
