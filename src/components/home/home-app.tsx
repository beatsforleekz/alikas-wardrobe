"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { LoginForm } from "@/components/auth/login-form";
import { BrandedLoadingScreen } from "@/components/ui/branded-loading-screen";
import { useWardrobeSession } from "@/hooks/use-wardrobe-session";
import wardrobeIllustration from "../../../images/closet-drawing-vintage-furniture-illustration-vector-2K58JBJ.jpg";

export function HomeApp() {
  const { session, isSessionLoading, handleLogin } = useWardrobeSession();
  const router = useRouter();
  const [isEntering, setIsEntering] = useState(false);

  if (isSessionLoading) {
    return <BrandedLoadingScreen title="Preparing your wardrobe" />;
  }

  if (!session) {
    return <LoginForm onSubmit={handleLogin} />;
  }

  function enterCloset() {
    if (isEntering) {
      return;
    }

    setIsEntering(true);
    window.setTimeout(() => {
      router.push("/wardrobe");
    }, 260);
  }

  return (
    <main className="page-shell">
      <section className={`landing-hero ${isEntering ? "is-entering" : ""}`}>
        <div className="landing-hero-inner">
          <div className="landing-illustration-wrap">
            <button
              className="landing-illustration-link"
              type="button"
              aria-label="Enter Your Private Collection"
              onClick={enterCloset}
            >
              <Image
                src={wardrobeIllustration}
                alt="Wardrobe illustration"
                className="landing-illustration"
                priority
              />
            </button>
          </div>

          <div className="landing-copy">
            <h1>Alika&apos;s Wardrobe</h1>

            <div className="landing-actions">
              <button className="landing-button primary" type="button" onClick={enterCloset}>
                Enter Your Private Collection
              </button>
              <Link className="landing-button secondary" href="/outfits">
                Lookbooks
              </Link>
            </div>
          </div>
        </div>

        <div className={`landing-fade ${isEntering ? "is-visible" : ""}`} aria-hidden="true" />
      </section>
    </main>
  );
}
