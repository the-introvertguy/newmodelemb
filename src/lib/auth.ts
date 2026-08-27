import { NextAuthOptions, getServerSession } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { Role, UserStatus } from "@prisma/client";

export const authOptions: NextAuthOptions = {
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  pages: {
    signIn: "/login",
    error: "/login",
  },
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        username: { label: "Username", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.username || !credentials?.password) {
          throw new Error("Please enter both username and password");
        }

        const user = await prisma.user.findUnique({
          where: { username: credentials.username.trim().toLowerCase() },
        });

        if (!user) {
          throw new Error("Invalid username or password");
        }

        if (user.status === UserStatus.DISABLED) {
          throw new Error("Account has been disabled. Please contact the administrator.");
        }

        const isPasswordValid = await bcrypt.compare(credentials.password, user.passwordHash);
        if (!isPasswordValid) {
          throw new Error("Invalid username or password");
        }

        // Update last login timestamp asynchronously
        prisma.user
          .update({
            where: { id: user.id },
            data: { lastLoginAt: new Date() },
          })
          .catch((err) => console.error("Error updating lastLoginAt:", err));

        return {
          id: user.id,
          name: user.fullName,
          username: user.username,
          role: user.role,
          permissions: user.permissions,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.username = (user as any).username;
        token.role = (user as any).role;
        token.permissions = (user as any).permissions;
      }
      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        (session.user as any).id = token.id;
        (session.user as any).username = token.username;
        (session.user as any).role = token.role as Role;
        (session.user as any).permissions = token.permissions as string[];
      }
      return session;
    },
  },
  secret: process.env.NEXTAUTH_SECRET || (process.env.NODE_ENV === "production" ? undefined : "dev_jwt_secret_local_only_change_in_env"),
};

export async function getCurrentUser() {
  const session = await getServerSession(authOptions);
  return session?.user as
    | {
        id: string;
        name: string;
        username: string;
        role: Role;
        permissions: string[];
      }
    | undefined;
}
