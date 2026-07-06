"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
  { href: "/", label: "Home", subtle: true },
  { href: "/wardrobe", label: "Wardrobe" },
  { href: "/outfits", label: "Lookbooks" },
];

export function CollectionNav() {
  const pathname = usePathname();

  return (
    <div className="collection-nav-shell">
      <nav className="collection-nav" aria-label="Primary">
        {navItems.map((item) => {
          const isActive =
            item.href === "/"
              ? pathname === "/"
              : item.href === "/wardrobe"
              ? pathname.startsWith("/wardrobe") || pathname.startsWith("/items/")
              : pathname.startsWith(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`collection-nav-link ${item.subtle ? "is-subtle" : ""} ${isActive ? "is-active" : ""}`}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>

      <button
        className="settings-button"
        type="button"
        aria-label="Settings coming soon"
        title="Settings coming soon"
      >
        <svg viewBox="0 0 24 24" aria-hidden="true" className="settings-icon">
          <path
            d="M12 8.9A3.1 3.1 0 1 0 12 15.1A3.1 3.1 0 1 0 12 8.9Z"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.6"
          />
          <path
            d="M19.4 13.1c.04-.36.06-.73.06-1.1s-.02-.74-.06-1.1l1.66-1.29a.54.54 0 0 0 .13-.69l-1.57-2.72a.55.55 0 0 0-.66-.24l-1.96.79a7.9 7.9 0 0 0-1.9-1.1l-.3-2.08a.54.54 0 0 0-.54-.46h-3.14a.54.54 0 0 0-.54.46l-.3 2.08a7.9 7.9 0 0 0-1.9 1.1l-1.96-.79a.55.55 0 0 0-.66.24L2.8 8.93a.54.54 0 0 0 .13.69l1.66 1.29c-.04.36-.06.73-.06 1.1s.02.74.06 1.1L2.93 14.4a.54.54 0 0 0-.13.69l1.57 2.72c.14.24.43.34.66.24l1.96-.79c.58.46 1.22.83 1.9 1.1l.3 2.08c.05.27.28.46.54.46h3.14c.26 0 .49-.19.54-.46l.3-2.08c.68-.27 1.32-.64 1.9-1.1l1.96.79c.23.1.52 0 .66-.24l1.57-2.72a.54.54 0 0 0-.13-.69l-1.66-1.29Z"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.2"
            strokeLinejoin="round"
          />
        </svg>
      </button>
    </div>
  );
}
