"use client";

import Link from "next/link";
import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, Menu, X, Ticket, LogOut, ShoppingCart } from "lucide-react";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { useSession, signOut } from "next-auth/react";
import Image from "next/image";
import { useCartStore } from "@/lib/store/cart";
import { SearchBar } from "@/components/search/search-bar";

const navLinks = [
  { label: "Events", href: "/events" },
  { label: "Categories", href: "/categories" },
  { label: "For Organisers", href: "/organizers" },
  { label: "About", href: "/about" },
];

export function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const { data: session, status } = useSession();
  const searchPanelRef = useRef<HTMLDivElement>(null);

  const storeCartCount = useCartStore((state) => state.getCartCount());
  const setIsOpen = useCartStore((state) => state.setIsOpen);

  const cartCount = mounted ? storeCartCount : 0;

  useEffect(() => {
    // Defer setMounted to a callback so it is not a synchronous setState in the
    // effect body (satisfies react-hooks/set-state-in-effect rule).
    const t = setTimeout(() => setMounted(true), 0);
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => {
      clearTimeout(t);
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);

  // Close search on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") setSearchOpen(false);
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, []);

  // Close inline search on outside click
  useEffect(() => {
    if (!searchOpen) return;
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node;
      if ((e.target as HTMLElement).closest?.("[data-nav-search-toggle]")) return;
      if (searchPanelRef.current?.contains(t)) return;
      setSearchOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [searchOpen]);

  return (
    <motion.header
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      className="fixed top-0 left-0 right-0 z-50 pt-[max(0.375rem,env(safe-area-inset-top))]"
    >
      <div
        className={`transition-all duration-300 ${
          scrolled
            ? "glass border-b border-[var(--border-subtle)]"
            : "bg-transparent"
        }`}
      >
        <div className="container-main">
          <nav className="flex items-center justify-between h-12 gap-3 md:gap-4">

            {/* Logo — always visible */}
            <Link href="/" className="flex items-center gap-2 group shrink-0">
              <div className="w-6 h-6 rounded bg-white/90 flex items-center justify-center">
                <Ticket className="w-3.5 h-3.5 text-black" />
              </div>
              <span className="text-[0.9375rem] font-medium tracking-tight text-[var(--text-primary)]">
                EventNexus
              </span>
            </Link>

            {/* ── Inline search (desktop) — expands over the nav links ─────── */}
            <AnimatePresence>
              {searchOpen && (
                <motion.div
                  ref={searchPanelRef}
                  initial={{ opacity: 0, scaleX: 0.9 }}
                  animate={{ opacity: 1, scaleX: 1 }}
                  exit={{ opacity: 0, scaleX: 0.9 }}
                  transition={{ duration: 0.15 }}
                  className="hidden md:flex flex-1 origin-left"
                >
                  <SearchBar
                    autoFocus
                    placeholder="Search events, artists, venues..."
                    className="w-full"
                    onClose={() => setSearchOpen(false)}
                  />
                </motion.div>
              )}
            </AnimatePresence>

            {/* Desktop Nav links — hidden when search is open */}
            {!searchOpen && (
              <div className="hidden md:flex items-center gap-0.5 flex-1">
                {navLinks.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    className="px-2 py-1 text-[0.8125rem] text-[var(--text-tertiary)] hover:text-[var(--text-primary)] rounded-md transition-colors duration-150"
                  >
                    {link.label}
                  </Link>
                ))}
              </div>
            )}

            {/* Desktop Actions */}
            <div className="hidden md:flex items-center gap-1.5 shrink-0">

              {/* Search toggle */}
              <button
                type="button"
                data-nav-search-toggle
                onClick={() => setSearchOpen((v) => !v)}
                className={`p-1.5 rounded-md transition-colors duration-150 mr-1 ${
                  searchOpen
                    ? "text-[var(--text-primary)] bg-white/[0.06]"
                    : "text-[var(--text-tertiary)] hover:text-[var(--text-primary)]"
                }`}
                aria-label={searchOpen ? "Close search" : "Open search"}
              >
                {searchOpen ? (
                  <X className="w-4 h-4" />
                ) : (
                  <Search className="w-4 h-4" />
                )}
              </button>

              {status === "loading" ? (
                <div className="w-16 h-8 bg-zinc-800 animate-pulse rounded-md" />
              ) : session ? (
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setIsOpen(true)}
                    className="relative p-1.5 rounded-md text-[var(--text-tertiary)] hover:text-[var(--text-primary)] transition-colors duration-150 mr-1"
                    aria-label="Cart"
                  >
                    <ShoppingCart className="w-4 h-4" />
                    {mounted && cartCount > 0 && (
                      <span className="absolute -top-1 -right-1 w-4 h-4 bg-white text-black text-[10px] font-bold rounded-full flex items-center justify-center">
                        {cartCount}
                      </span>
                    )}
                  </button>

                  <ThemeToggle />
                  <button
                    onClick={() => signOut({ callbackUrl: "/" })}
                    className="text-[0.8125rem] text-[var(--text-tertiary)] hover:text-[var(--text-primary)] transition-colors duration-150"
                  >
                    Sign out
                  </button>
                  <Link
                    href="/dashboard"
                    title="My tickets & bookings — open dashboard"
                    aria-label="Open your dashboard: tickets and QR codes"
                    className="ml-1 rounded-full outline-none transition-shadow hover:shadow-[0_0_0_2px_var(--border-hover)] focus-visible:shadow-[0_0_0_2px_var(--border-hover)]"
                  >
                    {session.user?.image ? (
                      <Image
                        src={session.user.image}
                        alt=""
                        width={28}
                        height={28}
                        className="rounded-full border border-[var(--border-subtle)]"
                      />
                    ) : (
                      <div className="w-7 h-7 rounded-full bg-zinc-800 border border-[var(--border-subtle)] flex items-center justify-center">
                        <span className="text-[10px] uppercase text-[var(--text-primary)]">
                          {session.user?.name?.[0] || session.user?.email?.[0] || "U"}
                        </span>
                      </div>
                    )}
                  </Link>
                </div>
              ) : (
                <>
                  <ThemeToggle />
                  <Link
                    href="/login"
                    className="text-[0.8125rem] text-[var(--text-tertiary)] hover:text-[var(--text-primary)] px-3 py-1.5 transition-colors duration-150"
                  >
                    Log in
                  </Link>
                  <Link href="/register" className="btn-primary text-[0.8125rem]">
                    Sign up
                  </Link>
                </>
              )}
            </div>

            {/* Mobile header: theme toggle (visible even when menu is closed) */}
            <div className="md:hidden flex items-center">
              <ThemeToggle />
            </div>

            {/* Mobile Toggle */}
            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              className="md:hidden p-1.5 rounded-md text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
              aria-label="Toggle menu"
            >
              {mobileOpen ? (
                <X className="w-5 h-5" />
              ) : (
                <Menu className="w-5 h-5" />
              )}
            </button>
          </nav>
        </div>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.15 }}
            className="md:hidden glass border-b border-[var(--border-subtle)]"
          >
            <div className="container-main py-3 flex flex-col gap-2">
              {/* Mobile search */}
              <SearchBar
                placeholder="Search events..."
                className="w-full"
                onClose={() => setMobileOpen(false)}
              />

              <div className="flex flex-col gap-0.5 pt-1">
                {navLinks.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={() => setMobileOpen(false)}
                    className="px-3 py-2.5 text-[0.8125rem] text-[var(--text-secondary)] hover:text-[var(--text-primary)] rounded-md transition-colors"
                  >
                    {link.label}
                  </Link>
                ))}
              </div>

              <div className="flex flex-col gap-2 mt-1 pt-2 border-t border-[var(--border-subtle)]">
                {session ? (
                  <>
                    <button
                      onClick={() => {
                        setMobileOpen(false);
                        setIsOpen(true);
                      }}
                      className="btn-secondary text-[0.8125rem] w-full flex items-center justify-center gap-2"
                    >
                      <ShoppingCart className="w-4 h-4" />
                      Cart {mounted && cartCount > 0 ? `(${cartCount})` : ""}
                    </button>
                    <Link
                      href="/dashboard"
                      onClick={() => setMobileOpen(false)}
                      className="btn-secondary text-[0.8125rem] w-full flex items-center justify-center gap-2"
                      title="Tickets & bookings"
                    >
                      {session.user?.image ? (
                        <Image
                          src={session.user.image}
                          alt=""
                          width={20}
                          height={20}
                          className="rounded-full border border-[var(--border-subtle)]"
                        />
                      ) : (
                        <span className="w-5 h-5 rounded-full bg-zinc-800 border border-[var(--border-subtle)] flex items-center justify-center text-[9px]">
                          {(session.user?.name?.[0] || session.user?.email?.[0] || "U").toUpperCase()}
                        </span>
                      )}
                      My tickets & bookings
                    </Link>
                    <button
                      onClick={() => {
                        setMobileOpen(false);
                        signOut({ callbackUrl: "/" });
                      }}
                      className="text-[0.8125rem] py-2.5 text-[var(--text-secondary)] hover:text-[var(--text-primary)] flex items-center justify-center gap-2 w-full transition-colors"
                    >
                      <LogOut className="w-4 h-4" />
                      Sign out
                    </button>
                  </>
                ) : (
                  <>
                    <div className="flex gap-2">
                      <Link
                        href="/login"
                        onClick={() => setMobileOpen(false)}
                        className="btn-secondary text-[0.8125rem] flex-1 justify-center"
                      >
                        Log in
                      </Link>
                      <Link
                        href="/register"
                        onClick={() => setMobileOpen(false)}
                        className="btn-primary text-[0.8125rem] flex-1 justify-center"
                      >
                        Sign up
                      </Link>
                    </div>
                    <div className="flex justify-center py-1">
                      <ThemeToggle />
                    </div>
                  </>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.header>
  );
}
