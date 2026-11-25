// Who can use the simulation tool. Set ADMIN_EMAILS in Vercel (comma separated) to change it.
const fallback = ["joseph.newsum@gmail.com", "joe@stratechi.com"];

export function isAdmin(email: string | null | undefined): boolean {
  if (!email) return false;
  const list = (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  return (list.length ? list : fallback).includes(email.toLowerCase());
}
