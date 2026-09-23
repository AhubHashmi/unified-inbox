import type { BrandId } from "@/lib/brands";
import type { InboxAdapter } from "@/lib/adapters/types";
import { appnalityAdapter } from "@/lib/adapters/appnality";
import { booknalityAdapter } from "@/lib/adapters/booknality";
import { makePlaceholderAdapter } from "@/lib/adapters/placeholder";

const registry: Record<BrandId, InboxAdapter> = {
  appnality: appnalityAdapter,
  booknality: booknalityAdapter,
  taxnality: makePlaceholderAdapter("taxnality"),
  explainedit: makePlaceholderAdapter("explainedit"),
  buildbee: makePlaceholderAdapter("buildbee"),
  blitzlabs: makePlaceholderAdapter("blitzlabs"),
  ranknality: makePlaceholderAdapter("ranknality"),
};

export function getAdapter(brand: BrandId): InboxAdapter {
  return registry[brand];
}
