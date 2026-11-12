// Private Google Sheets reader for Vercel Node.js Functions.
// Never put the service account key, credentials, or student records in GitHub.
// Service-account identity must have Viewer access to the three Sheets.
import { createSign } from 'node:crypto';

const SHEETS = [
  { level: 'PERALIHAN', id: '1Cn-XB6G6LGgyHDuICR5rYSfEMdFTUi3w29ZCp6qVNFE', tab: 'GABUNG PERALIHAN' },
  { level: 'TINGKATAN 1', id: '1597ZJl_9aZEWGmOzZlvQn5DVv2vbxPi_PZJW7VfOUfk', tab: 'GABUNG TINGKATAN 1' },
  { level: 'TINGKATAN 2', id: '1Hyz2B3jpWBy53AwjAL8Tt-Xwe37zlqSXc2A5tg_-O-4', tab: 'GABUNG TINGKATAN 2' },
];

const b64 = value => Buffer.from(JSON.stringify(value)).toString('base64url');

export function isGoogleSheetsConfigured() {
  return Boolean(process.env.GOOGLE_CLIENT_EMAIL && process.env.GOOGLE_PRIVATE_KEY);
}

export async function googleAccessToken() {
  if (!isGoogleSheetsConfigured()) throw new Error('Google credentials not configured');
  const now = Math.floor(Date.now() / 1000);
  const claim = {
    iss: process.env.GOOGLE_CLIENT_EMAIL,
    scope: 'https://www.googleapis.com/auth/spreadsheets.readonly',
    aud: 'https://oauth2.googleapis.com/token',
    iat: now, exp: now + 3600
  };
  const unsigned = b64({ alg: 'RS256', typ: 'JWT' }) + '.' + b64(claim);
  const signer = createSign('RSA-SHA256');
  signer.update(unsigned);
  signer.end();
  const signature = signer.sign(process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n')).toString('base64url');
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: unsigned + '.' + signature
    }),
    signal: AbortSignal.timeout(12000)
  });
  if (!response.ok) throw new Error('Google authorization failed: HTTP ' + response.status);
  const payload = await response.json();
  return payload.access_token;
}

async function values(sheet, range, token) {
  const a1 = `'${sheet.tab.replace(/'/g, "''")}'!${range}`;
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${sheet.id}/values/${encodeURIComponent(a1)}?valueRenderOption=FORMATTED_VALUE`;
  const result = await fetch(url, {
    headers: { Authorization: 'Bearer ' + token },
    signal: AbortSignal.timeout(15000)
  });
  if (!result.ok) throw new Error(`Google Sheets HTTP ${result.status} (${sheet.level})`);
  return (await result.json()).values ?? [];
}

// A1:CZ2 contains column headers only: no student records are returned.
export async function checkSheetHeaders() {
  const token = await googleAccessToken();
  const checks = [];
  for (const sheet of SHEETS) {
    const rows = await values(sheet, 'A1:CZ2', token);
    checks.push({
      level: sheet.level,
      readable: true,
      headerRows: rows.length,
      hasIcHeader: rows.some(row => row.some(cell => /^(NO\s*IC|NO\.?\s*KAD\s*PENGENALAN|IC)$/i.test(String(cell).trim())))
    });
  }
  return checks;
}

// For future implementation after parent-access verification is in place.
// This function intentionally does not expose student records.
export const sheetSources = SHEETS.map(({ level, id, tab }) => ({ level, id, tab }));
