// A recording stand-in for `next-auth/react`.
//
// The production logout helper is JWT-only: it must never import NextAuth or
// call signOut, because no OAuth sign-in path is reachable. Mapping the module
// to this stub means such a regression is caught as a recorded call instead of
// a resolution failure. The test installs `globalThis.__nextAuthStub`.
export const signOut = async (options) => {
  const state = (globalThis.__nextAuthStub ??= { signOutCalls: [] });
  state.signOutCalls.push(options);
  return { url: "stubbed" };
};

export const signIn = async () => {
  throw new Error("logout must never call NextAuth signIn");
};

export const useSession = () => {
  throw new Error("logout must never mount a NextAuth session hook");
};
