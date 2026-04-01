export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? 'https://congress-trade-tracker.vercel.app';

export function absoluteUrl(path: string = '/') {
  return new URL(path, SITE_URL).toString();
}
