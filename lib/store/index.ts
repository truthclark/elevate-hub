import type { Repo } from "./repo";
import { memoryRepo } from "./memory";
import { pgRepo } from "./pg";

// Picks the storage backend: Postgres when DATABASE_URL is set, otherwise
// an in-memory demo store (changes reset on restart).

export const isDemoMode = !process.env.DATABASE_URL;
export const store: Repo = isDemoMode ? memoryRepo : pgRepo;
