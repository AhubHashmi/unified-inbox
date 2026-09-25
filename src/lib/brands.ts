export type BrandId =
  | "appnality"
  | "taxnality"
  | "explainedit"
  | "buildbee"
  | "blitzlabs"
  | "booknality"
  | "ranknality";

export interface BrandConfig {
  id: BrandId;
  name: string;
  tagline: string;
  color: string;
}

// "connected" is NOT tracked here — it's derived live from
// getAdapter(brand.id).isConnected(), so a brand shows as connected the
// moment its env var is set, with no code change needed.
export const BRANDS: BrandConfig[] = [
  {
    id: "appnality",
    name: "Appnality",
    tagline: "AI website builder — WhatsApp leads",
    color: "#6366f1",
  },
  {
    id: "booknality",
    name: "Booknality",
    tagline: "Book writing & publishing — WhatsApp leads",
    color: "#0ea5e9",
  },
  {
    id: "taxnality",
    name: "Taxnality",
    tagline: "Not connected yet",
    color: "#10b981",
  },
  {
    id: "explainedit",
    name: "Explainedit",
    tagline: "Not connected yet",
    color: "#f59e0b",
  },
  {
    id: "buildbee",
    name: "Buildbee",
    tagline: "Not connected yet",
    color: "#ef4444",
  },
  {
    id: "blitzlabs",
    name: "Blitzlabs",
    tagline: "Not connected yet",
    color: "#8b5cf6",
  },
  {
    id: "ranknality",
    name: "Ranknality",
    tagline: "Not connected yet",
    color: "#ec4899",
  },
];

export function getBrand(id: string): BrandConfig | undefined {
  return BRANDS.find((b) => b.id === id);
}
