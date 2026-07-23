"use client";

import { useState } from "react";

type RemoteImageProps = {
  src: string;
  alt: string;
  className: string;
  fallbackClassName?: string;
  fallbackLabel?: string;
  loading?: "eager" | "lazy";
  fetchPriority?: "high" | "low" | "auto";
};

export function RemoteImage({
  src,
  alt,
  className,
  fallbackClassName = "card-image-fallback",
  fallbackLabel = "No image available",
  loading = "lazy",
  fetchPriority = "auto",
}: RemoteImageProps) {
  const [didFail, setDidFail] = useState(false);

  if (didFail) {
    return <div className={fallbackClassName}>{fallbackLabel}</div>;
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt}
      className={className}
      loading={loading}
      decoding="async"
      fetchPriority={fetchPriority}
      referrerPolicy="no-referrer"
      onError={() => setDidFail(true)}
    />
  );
}
