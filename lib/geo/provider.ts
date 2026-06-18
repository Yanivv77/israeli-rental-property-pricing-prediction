import "server-only";
import type { Address, GeoResult } from "@/types/property";

/**
 * One thin seam per external provider so the source can be swapped later.
 * govmap is the default geocoder; the interface is the only thing the rest of
 * the app depends on.
 */
export interface GeocodeProvider {
  // address (Hebrew) -> ITM point + gush/helka
  geocode(address: Address): Promise<GeoResult>;
}

export const govmapGeocoder: GeocodeProvider = {
  async geocode() {
    throw new Error("not implemented — govmap geocode is wired in prompt 03");
  },
};
