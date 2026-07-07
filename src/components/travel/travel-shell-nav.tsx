"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const items = [
  { href: "/travel", label: "Trips" },
  { href: "/travel/packing", label: "Packing" },
  { href: "/travel/essentials", label: "Essentials" },
];

export function TravelShellNav() {
  const pathname = usePathname();

  return (
    <nav className="travel-shell-nav" aria-label="Travel">
      {items.map((item) => {
        const isActive =
          item.href === "/travel" ? pathname === "/travel" || /^\/travel\/[^/]+$/.test(pathname) : pathname.startsWith(item.href);

        return (
          <Link
            key={item.href}
            href={item.href}
            className={`travel-shell-link ${isActive ? "is-active" : ""}`}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
