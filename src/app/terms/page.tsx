export const metadata = { title: "Terms | Team Starters" };

// Draft for Joe's review (Nov 25, 2026). Have a lawyer look before launch.
export default function Terms() {
  return (
    <article className="mx-auto max-w-3xl space-y-5 text-gray-800">
      <h1 className="text-3xl font-bold text-navy">Terms of use</h1>
      <p className="text-sm text-gray-500">Last updated November 25, 2026</p>
      <p>
        Team Starters is provided by Stratechi. By using it, you agree to these terms. If you don&apos;t
        agree, please don&apos;t use it.
      </p>
      <h2 className="text-xl font-bold text-navy">Using Team Starters</h2>
      <ul className="list-disc space-y-2 pl-5">
        <li>Team Starters is free. We may change or end features over time.</li>
        <li>
          If you run a survey, you&apos;re responsible for having permission to survey your team, and for
          telling them how it works: their answers are anonymous, shuffled, and shown without names.
        </li>
        <li>Use it for its purpose: understanding and improving how your team works. Don&apos;t use it to identify, single out, or retaliate against anyone who answers.</li>
        <li>Don&apos;t misuse the service, try to get around its limits or security, or send spam through it.</li>
      </ul>
      <h2 className="text-xl font-bold text-navy">Your content</h2>
      <p>
        The surveys you run and the answers your team gives belong to you and your team. You give us
        permission to store and process them to run the service, including using AI to write readouts.
      </p>
      <h2 className="text-xl font-bold text-navy">AI readouts</h2>
      <p>
        Readouts are written by AI from your team&apos;s answers. They can contain mistakes or miss
        context. Use them as a starting point for a conversation with your team, and use your own
        judgment.
      </p>
      <h2 className="text-xl font-bold text-navy">No warranty</h2>
      <p>
        Team Starters is provided as is, without warranties of any kind. To the extent the law allows,
        Stratechi isn&apos;t liable for indirect or consequential losses from using it.
      </p>
      <h2 className="text-xl font-bold text-navy">Changes and contact</h2>
      <p>
        We may update these terms, and we&apos;ll change the date above when we do. Questions:{" "}
        <a className="text-navy underline" href="mailto:joe@stratechi.com">joe@stratechi.com</a>.
      </p>
    </article>
  );
}
