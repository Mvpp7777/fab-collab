import Link from "next/link";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-foam px-6 text-center">
      <h1 className="font-display text-7xl font-extrabold leading-none tracking-tight sm:text-8xl md:text-9xl">
        <span className="block text-ocean">fab</span>
        <span className="block text-lagoon">collab</span>
      </h1>
      <p className="mt-8 font-display text-xl text-ocean/80 sm:text-2xl">
        Write together. Create something legendary.
      </p>
      <Link
        href="/auth/signup"
        style={{ backgroundColor: "#FF6B47", color: "white" }}
        className="mt-10 inline-block rounded-full px-8 py-3 font-display text-lg font-semibold shadow-lg transition hover:brightness-110 active:scale-95"
      >
        Get started
      </Link>
    </main>
  );
}
