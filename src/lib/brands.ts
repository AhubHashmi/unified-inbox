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
  connected: boolean;
}

export const BRANDS: BrandConfig[] = [
  {
    id: "appnality",
    name: "Appnality",
    tagline: "AI website builder — WhatsApp leads",
    color: "#6366f1",
    connected: true,
  },
  {
    id: "booknality",
    name: "Booknality",
    tagline: "Booking assistant — WhatsApp leads",
    color: "#0ea5e9",
    connected: true,
  },
  {
    id: "taxnality",
    name: "Taxnality",
    tagline: "Not connected yet",
    color: "#10b981",
    connected: false,
  },
  {
    id: "explainedit",
    name: "Explainedit",
    tagline: "Not connected yet",
    color: "#f59e0b",
    connected: false,
  },
  {
    id: "buildbee",
    name: "Buildbee",
    tagline: "Not connected yet",
    color: "#ef4444",
    connected: false,
  },
  {
    id: "blitzlabs",
    name: "Blitzlabs",
    tagline: "Not connected yet",
    color: "#8b5cf6",
    connected: false,
  },
  {
    id: "ranknality",
    name: "Ranknality",
    tagline: "Not connected yet",
    color: "#ec4899",
    connected: false,
  },
];

export function getBrand(id: string): BrandConfig | undefined {
  return BRANDS.find((b) => b.id === id);
}
