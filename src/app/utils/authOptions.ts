import NextAuth, { NextAuthOptions } from "next-auth"
import GithubProvider from "next-auth/providers/github"
import GoogleProvider from "next-auth/providers/google"

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      // Client ID is public by design (safe as NEXT_PUBLIC_).
      clientId: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID as string,
      // Client secret is server-only. Never read a NEXT_PUBLIC_ variant here:
      // Next inlines every NEXT_PUBLIC_ value into the browser bundle, which
      // would leak the OAuth secret to every visitor. Set GOOGLE_CLIENT_SECRET
      // in the host environment (see .env.example).
      clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
    }),
  ],
  pages: {
    signIn: "/login",
  },
  secret: process.env.NEXTAUTH_SECRET,
  
};


