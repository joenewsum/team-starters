export const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
export const shareLink = (token: string) => `${siteUrl}/s/${token}`;
export const MIN_RESPONSES_FOR_READOUT = 3;
export const WORKSHOP_URL = "https://www.stratechi.com/team-alignment-workshop/";
export const REVIEW_URL = "https://calendly.com/joe-stratechi";
