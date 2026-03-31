import Link from "next/link";
import { Ticket } from "lucide-react";
import { OAuthButtons } from "@/components/auth/oauth-buttons";

export default function RegisterPage() {
  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden pt-14 pb-24">
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.02]"
        style={{
          backgroundImage: `linear-gradient(#555 1px, transparent 1px), linear-gradient(90deg, #555 1px, transparent 1px)`,
          backgroundSize: "60px 60px",
        }}
      />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-white opacity-[0.015] blur-[100px] rounded-full pointer-events-none" />

      <div className="w-full max-w-[400px] px-5 relative z-10">
        <div className="flex flex-col items-center mb-8 text-center">
          <Link href="/" className="flex items-center gap-2 mb-6 group">
            <div className="w-8 h-8 rounded-lg bg-white/90 flex items-center justify-center transition-transform duration-200 group-hover:scale-105">
              <Ticket className="w-4 h-4 text-black" />
            </div>
          </Link>
          <h1 className="text-2xl font-semibold tracking-tight text-[var(--text-primary)] mb-2">
            Create an account
          </h1>
          <p className="text-[0.9375rem] text-[var(--text-tertiary)]">
            Get started with EventNexus. Verify and sign up.
          </p>
        </div>

        <OAuthButtons
          callbackUrl="/events"
          githubLabel="Sign up with GitHub"
          googleLabel="Sign up with Google"
        />

        <div className="mt-8 text-center">
          <p className="text-[0.8125rem] text-[var(--text-muted)]">
            Already have an account?{" "}
            <Link
              href="/login"
              className="text-[var(--text-primary)] font-medium hover:underline underline-offset-4"
            >
              Log in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
