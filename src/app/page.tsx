import Link from "next/link";

export default function Home() {
  return (
    <div className="max-w-2xl">
      <p className="text-sm font-semibold uppercase tracking-widest text-gold-dark">
        Free for every leader
      </p>
      <h1 className="mt-3 text-4xl font-bold leading-tight text-navy">
        Ask your team. Get a readout. Start the right conversation.
      </h1>
      <p className="mt-5 text-lg text-gray-700">
        Pick a Team Starter, share one link with your team, and get an AI readout
        of what they think: where you agree, where you don&apos;t, and what to do
        next. Answers are anonymous and it takes about 10 minutes.
      </p>
      <Link
        href="/login"
        className="mt-8 inline-block rounded-md bg-navy px-6 py-3 font-semibold text-white hover:bg-navy-2"
      >
        Start a Team Starter
      </Link>
    </div>
  );
}
