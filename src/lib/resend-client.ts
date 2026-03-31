import { Resend } from 'resend';

// Lazy singleton — avoids crashing at build time when RESEND_API_KEY is not set
let _resend: Resend | null = null;

export function getResend(): Resend {
  if (!_resend) {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) throw new Error('RESEND_API_KEY env var is not set');
    _resend = new Resend(apiKey);
  }
  return _resend;
}
