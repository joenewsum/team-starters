// Sends email through Resend. Does nothing if RESEND_API_KEY isn't set.
export async function sendEmail(msg: {
  to: string;
  subject: string;
  html: string;
  text: string;
  attachments?: { filename: string; content: string }[];
}): Promise<boolean> {
  const key = process.env.RESEND_API_KEY;
  if (!key) return false;
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: process.env.EMAIL_FROM ?? "Team Starters <starters@stratechi.com>",
      to: [msg.to],
      subject: msg.subject,
      html: msg.html,
      text: msg.text,
      attachments: msg.attachments,
    }),
  });
  if (!res.ok) console.error("Email failed", res.status, await res.text());
  return res.ok;
}

export const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
