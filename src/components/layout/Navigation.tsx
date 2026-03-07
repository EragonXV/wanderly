'use client';

import Link from 'next/link';
import { Plane, User, Menu, LogOut } from 'lucide-react';
import { useSession, signOut } from 'next-auth/react';

export function Navigation() {
  const { data: session, status } = useSession();
  const isLoading = status === 'loading';
  const user = session?.user;
  return (
    <nav className="fixed top-0 w-full z-50 bg-white/80 backdrop-blur-md border-b border-gray-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <Link href="/" className="flex items-center gap-2 group">
              <div className="bg-blue-600 p-2 rounded-xl group-hover:bg-blue-700 transition-colors">
                <Plane className="h-5 w-5 text-white transform -rotate-45" />
              </div>
              <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-cyan-500">
                Wanderly
              </span>
            </Link>
          </div>

          <div className="hidden md:flex items-center space-x-8">
            <Link href="/dashboard" className="text-gray-600 hover:text-blue-600 transition-colors text-sm font-medium">
              My Trips
            </Link>
            <Link href="/explore" className="text-gray-600 hover:text-blue-600 transition-colors text-sm font-medium">
              Explore
            </Link>
            <div className="flex items-center gap-4 pl-4 border-l border-gray-200">
              {!isLoading && user ? (
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium text-slate-700">Hi, {user.name}</span>
                  <button
                    onClick={() => signOut({ callbackUrl: '/' })}
                    className="flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-800 transition-colors"
                  >
                    <LogOut className="h-4 w-4" />
                    Logout
                  </button>
                </div>
              ) : !isLoading ? (
                <div className="flex items-center gap-3">
                  <Link href="/login" className="text-sm font-medium text-slate-600 hover:text-blue-600 transition-colors">
                    Log in
                  </Link>
                  <Link href="/register" className="text-sm font-medium bg-blue-600 text-white px-4 py-2 rounded-xl hover:bg-blue-700 transition-colors">
                    Sign up
                  </Link>
                </div>
              ) : null}
            </div>
          </div>

          <div className="flex items-center md:hidden">
            <button className="text-gray-600 hover:text-blue-600 transition-colors">
              <Menu className="h-6 w-6" />
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
}
