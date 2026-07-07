"use client";

import Image from "next/image";

import wardrobeIllustration from "../../../images/closet-drawing-vintage-furniture-illustration-vector-2K58JBJ.jpg";
import travelIllustration from "../../../images/plane loading.jpeg";

const loadingIllustrations = {
  wardrobe: {
    image: wardrobeIllustration,
    alt: "Wardrobe illustration",
  },
  travel: {
    image: travelIllustration,
    alt: "Travel illustration",
  },
} as const;

export function BrandedLoadingScreen({
  title,
  theme = "wardrobe",
}: {
  title: string;
  theme?: keyof typeof loadingIllustrations;
}) {
  const illustration = loadingIllustrations[theme];

  return (
    <main className="page-shell">
      <section className="landing-hero landing-hero-loading">
        <div className="landing-hero-inner">
          <div className="landing-illustration-wrap">
            <div className="landing-illustration-link" aria-hidden="true">
              <Image
                src={illustration.image}
                alt={illustration.alt}
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
