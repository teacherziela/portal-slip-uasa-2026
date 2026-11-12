import { checkSheetHeaders, isGoogleSheetsConfigured } from '../lib/google-sheets.js';

// Diagnostics for the school administrator only; never returns student data.
export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') return res.status(405).json({ ok: false });
  const adminKey = process.env.UASA_ADMIN_KEY;
  if (!adminKey || req.headers['x-admin-key'] !== adminKey) {
    return res.status(401).json({ ok: false, mesej: 'Not authorized' });
  }
  if (!isGoogleSheetsConfigured()) {
    return res.status(503).json({ ok: false, mesej: 'Google MOE credentials belum dikonfigurasi.' });
  }
  try {
    const sources = await checkSheetHeaders();
    return res.status(200).json({ ok: true, sources });
  } catch (error) {
    // Error codes only; never send tokens or credentials to the client.
    return res.status(502).json({ ok: false, mesej: 'Google Sheets API tidak dapat diakses dengan kebenaran semasa.' });
  }
}
