import { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import { prisma } from '@/lib/prisma/client';
import bcrypt from 'bcryptjs';

export const authOptions: NextAuthOptions = {
    secret: process.env.NEXTAUTH_SECRET,
    providers: [
        CredentialsProvider({
            name: 'Credentials',
            credentials: {
                email: { label: 'Email', type: 'email' },
                password: { label: 'Password', type: 'password' },
            },
            async authorize(credentials) {
                if (!credentials?.email || !credentials?.password) {
                    throw new Error('Email and password are required');
                }

                const user = await prisma.user.findUnique({
                    where: {
                        email: credentials.email,
                    },
                });

                if (!user || !user.password) {
                    throw new Error('No user found with this email');
                }

                const isPasswordValid = await bcrypt.compare(
                    credentials.password,
                    user.password
                );

                if (!isPasswordValid) {
                    throw new Error('Invalid password');
                }

                return {
                    id: user.id,
                    email: user.email,
                    name: user.name,
                    image: user.image,
                };
            },
        }),
    ],
    session: {
        strategy: 'jwt',
    },
    pages: {
        signIn: '/login',
    },
    callbacks: {
        async jwt({ token, user, trigger, session }) {
            if (user) {
                token.id = user.id;
                token.name = user.name;
                token.email = user.email;
                token.picture = user.image ?? null;
            }

            if (trigger === 'update' && session) {
                const nextName =
                    typeof session.user?.name === 'string'
                        ? session.user.name
                        : typeof session.name === 'string'
                            ? session.name
                            : undefined;
                const nextEmail =
                    typeof session.user?.email === 'string'
                        ? session.user.email
                        : typeof session.email === 'string'
                            ? session.email
                            : undefined;
                const nextImage =
                    session.user?.image === null || typeof session.user?.image === 'string'
                        ? session.user.image
                        : session.image === null || typeof session.image === 'string'
                            ? session.image
                            : undefined;

                if (typeof nextName === 'string') {
                    token.name = nextName;
                }
                if (typeof nextEmail === 'string') {
                    token.email = nextEmail;
                }
                if (nextImage !== undefined) {
                    token.picture = nextImage;
                }
            }

            return token;
        },
        async session({ session, token }) {
            if (session.user) {
                session.user.id = token.id as string;
                session.user.name = (token.name as string | null | undefined) ?? session.user.name;
                session.user.email = (token.email as string | null | undefined) ?? session.user.email;
                session.user.image = (token.picture as string | null | undefined) ?? null;
            }
            return session;
        },
    },
};
