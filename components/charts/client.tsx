"use client";

import dynamic from "next/dynamic";

/**
 * Charts render client-side only (ssr: false) — Recharts needs real layout
 * dimensions, which don't exist during SSR. A sized skeleton holds the space so
 * there's no layout shift when the chart mounts.
 */
const fallback = () => <div className="bg-muted/40 h-72 w-full animate-pulse rounded-lg" />;

export const PriceTrend = dynamic(
  () => import("./price-trend").then((m) => m.PriceTrend),
  { ssr: false, loading: fallback },
);

export const CompsBar = dynamic(
  () => import("./comps-bar").then((m) => m.CompsBar),
  { ssr: false, loading: fallback },
);
