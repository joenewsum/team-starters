export const metadata = { title: "Privacy | Team Starters" };

// Draft for Joe's review (Nov 25, 2026). Have a lawyer look before launch.
export default function Privacy() {
  return (
    <article className="prose-ts mx-auto max-w-3xl space-y-5 text-gray-800">
      <h1 className="text-3xl font-bold text-navy">Privacy</h1>
      <p className="text-sm text-gray-500">Last updated November 25, 2026</p>
      <p>
        Team Starters is a free tool from Stratechi that helps leaders survey their teams and get a
        readout. This page explains what we collect, how we use it, and the choices you have.
      </p>

      <h2 className="text-xl font-bold text-navy">If you answer a survey</h2>
      <ul className="list-disc space-y-2 pl-5">
        <li>You don&apos;t sign in, and we don&apos;t ask for your name or email.</li>
        <li>We store your answers with the survey. We don&apos;t store your name, email, or IP address with them.</li>
        <li>
          The person who ran the survey sees a readout that groups everyone&apos;s answers into themes,
          and they can read the individual answers. Answers are shuffled separately for each question
          and shown without names. Nothing appears until at least three team members have answered.
        </li>
        <li>
          Your browser remembers that you answered, so the survey can tell you if you open it again.
          That stays on your device.
        </li>
        <li>
          Please don&apos;t include details that would identify you or anyone else, like names, in your
          answers.
        </li>
      </ul>

      <h2 className="text-xl font-bold text-navy">If you run a survey</h2>
      <ul className="list-disc space-y-2 pl-5">
        <li>We store your email address so you can sign in, and the surveys, answers, and readouts in your account.</li>
        <li>Only you can see your surveys, answers, and readouts, unless you turn on a share link for a readout.</li>
        <li>
          We ask for your team&apos;s function, your role, your industry, and your company&apos;s size. We use these, along with
          scores and answers from many surveys, to build anonymous benchmarks, like the average score for sales teams. Benchmarks
          only show totals across many teams, never anything that identifies you, your company, or your team.
        </li>
        <li>We email you to sign in and, if you choose, when there&apos;s news about Team Starters. You can stop the updates any time.</li>
      </ul>

      <h2 className="text-xl font-bold text-navy">How we use AI</h2>
      <p>
        To write a readout, we send the survey&apos;s answers to an AI model from Anthropic. It reads them,
        groups them into themes, and writes the readout. Anthropic does not use this data to train its
        models. We use AI only to write readouts.
      </p>

      <h2 className="text-xl font-bold text-navy">Who else handles the data</h2>
      <p>
        We use a small set of providers to run the service: Vercel (hosting), Supabase (database and
        sign-in), Anthropic (AI readouts), Resend (email), and Cloudflare (security). They process data
        only to provide their services to us. We don&apos;t sell data, and we don&apos;t use it for
        advertising.
      </p>

      <h2 className="text-xl font-bold text-navy">Keeping and deleting data</h2>
      <p>
        Your data stays until you delete it. You can delete any survey and all its answers from the
        survey page, or delete your whole account, with every survey, answer, and readout in it, from
        the Account page.
      </p>

      <h2 className="text-xl font-bold text-navy">Questions</h2>
      <p>
        Email <a className="text-navy underline" href="mailto:joe@stratechi.com">joe@stratechi.com</a>.
      </p>
    </article>
  );
}
