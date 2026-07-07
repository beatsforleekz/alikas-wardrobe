"use client";

import Link from "next/link";

type InternalBackButtonProps = {
  href: string;
  label: string;
};

export function InternalBackButton({ href, label }: InternalBackButtonProps) {
  return (
    <div className="internal-back-row">
      <Link className="internal-back-button" href={href}>
        <span aria-hidden="true">←</span>
        <span>{label}</span>
      </Link>
    </div>
  );
}
