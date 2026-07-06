"use client";

import Image from "next/image";

import wardrobeIllustration from "../../../images/closet-drawing-vintage-furniture-illustration-vector-2K58JBJ.jpg";

export function BrandedLoadingScreen({ title }: { title: string }) {
  return (
    <main className="page-shell">
      <section className="landing-hero landing-hero-loading">
        <div className="landing-hero-inner">
          <div className="landing-illustration-wrap">
            <div className="landing-illustration-link" aria-hidden="true">
              <Image
                src={wardrobeIllustration}
                alt="Wardrobe illustration"
                className="landing-illustration"
                priority
              />
            </div>
          </div>

          <div className="landing-copy">
            <h1>{title}</h1>
          </div>
        </div>
      </section>
    </main>
  );
}
