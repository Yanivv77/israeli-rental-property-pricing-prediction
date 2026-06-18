import "server-only";
import type { Deal } from "@/types/property";

/**
 * One thin seam per external provider so the source can be swapped later.
 * nadlan is the default deals source; only this interface leaks outward.
 */
export interface DealsProvider {
  // recent transactions for a block (gush), straight from the gov source
  fetchByGush(gush: number): Promise<Deal[]>;
}

export const nadlanDeals: DealsProvider = {
  async fetchByGush() {
    throw new Error("not implemented — nadlan deals are wired in prompt 03");
  },
};
