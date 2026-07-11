import NextAuth from "next-auth";
import Google from "next-auth/providers/google";

// Google sign-in. Access is controlled by the Team page: any active team
// member's email can sign in. ALLOWED_EMAILS env acts as a bootstrap
// fallback so you can't lock yourself out.

export const authConfigured = Boolean(
  process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET
);

const envAllowlist = (process.env.ALLOWED_EMAILS ?? "")
  .split(",")
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean);

async function isAllowed(email: string): Promise<boolean> {
  if (envAllowlist.includes(email)) return true;
  try {
    const { store } = await import("./lib/store");
    const team = await store.listTeam();
    return team.some(
      (m) => m.active && m.email.trim().toLowerCase() === email
    );
  } catch {
    return envAllowlist.length === 0;
  }
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [Google],
  pages: { signIn: "/login" },
  callbacks: {
    async signIn({ user }) {
      const email = user.email?.toLowerCase() ?? "";
      if (!email) return false;
      return isAllowed(email);
    },
    authorized({ auth }) {
      return Boolean(auth?.user);
    },
  },
});

// Role helper for server components / actions. Members can hold multiple
// roles ("Admin, Agent, Ops") — this returns their highest permission tier.
export async function currentRole(): Promise<"Admin" | "Agent" | "Ops"> {
  if (!authConfigured) return "Admin"; // demo mode: full access
  const session = await auth();
  const email = session?.user?.email?.toLowerCase() ?? "";
  try {
    const { store } = await import("./lib/store");
    const team = await store.listTeam();
    const m = team.find((x) => x.email.trim().toLowerCase() === email);
    if (!m) return "Agent";
    const roles = m.role.toLowerCase();
    if (roles.includes("admin")) return "Admin";
    if (roles.includes("agent")) return "Agent";
    return "Ops";
  } catch {
    return "Agent";
  }
}
