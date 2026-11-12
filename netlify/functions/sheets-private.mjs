import { createSign } from 'node:crypto';

const SOURCES = [
  { name: 'PERALIHAN', id: '1Cn-XB6G6LGgyHDuICR5rYSfEMdFTUi3w29ZCp6qVNFE', tab: 'GABUNG PERALIHAN' },
  { name: 'TINGKATAN 1', id: '1597ZJl_9aZEWGmOzZlvQn5DVv2vbxPi_PZJW7VfOUfk', tab: 'GABUNG TINGKATAN 1' },
  { name: 'TINGKATAN 2', id: '1Hyz2B3jpWBy53AwjAL8Tt-Xwe37zlqSXc2A5tg_-O-4', tab: 'GABUNG TINGKATAN 2' }
];

const to64 = item => Buffer.from(JSON.stringify(item)).toString('base64url');
const normalize = item => String(item ?? '').trim().toUpperCase().replace(/\s+/g, ' ');
const cleanIC = item => String(item ?? '').replace(/\D/g, '');
const isBlank = item => item === undefined || item === null || String(item).trim() === '';

export const configured = () => Boolean(process.env.GOOGLE_CLIENT_EMAIL && process.env.GOOGLE_PRIVATE_KEY);

async function getAccessToken() {
  if (!configured()) throw new Error('Google Sheets credentials unavailable');
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    iss: process.env.GOOGLE_CLIENT_EMAIL,
    scope: 'https://www.googleapis.com/auth/spreadsheets.readonly',
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 3500
  };
  const headBody = to64({ alg: 'RS256', typ: 'JWT' }) + '.' + to64(payload);
  const sign = createSign('RSA-SHA256');
  sign.update(headBody);
  sign.end();
  const key = process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n');
  const signed = headBody + '.' + sign.sign(key).toString('base64url');
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion: signed }),
    signal: AbortSignal.timeout(12000)
  });
  if (!response.ok) throw new Error('Google OAuth HTTP ' + response.status);
  const data = await response.json();
  return data.access_token;
}

async function readValues(source, a1, token) {
  const ref = "'" + source.tab.replace(/'/g, "''") + "'!" + a1;
  const url = 'https://sheets.googleapis.com/v4/spreadsheets/' + source.id + '/values/' + encodeURIComponent(ref) + '?valueRenderOption=FORMATTED_VALUE';
  const response = await fetch(url, {
    headers: { Authorization: 'Bearer ' + token },
    signal: AbortSignal.timeout(15000)
  });
  if (!response.ok) throw new Error('Google Sheets ' + source.name + ' HTTP ' + response.status);
  return (await response.json()).values || [];
}

export async function checkSources() {
  const token = await getAccessToken();
  const output = [];
  for (const source of SOURCES) {
    const [head] = await readValues(source, 'A1:BU1', token);
    const headers = (head || []).map(normalize);
    output.push({
      level: source.name,
      readable: headers.includes('NO IC') && headers.includes('NAMA PELAJAR'),
      columns: headers.length
    });
  }
  return output;
}

// Internal parser for a future approved parent-authorization workflow.
// This function must never be called from a public IC-only endpoint.
export async function findPrivateRecord(ic) {
  if (!/^\d{12}$/.test(ic)) return null;
  const token = await getAccessToken();
  for (const source of SOURCES) {
    const rows = await readValues(source, 'A1:BU5000', token);
    const headers = (rows[0] || []).map(normalize);
    const idx = key => headers.indexOf(key);
    const icIndex = idx('NO IC');
    if (icIndex < 0) continue;
    const row = rows.slice(1).find(item => cleanIC(item[icIndex]) === ic);
    if (!row) continue;
    const get = key => idx(key) >= 0 ? row[idx(key)] ?? '' : '';
    const subjects = [];
    for (let col=4; col<headers.length-1; col++) {
      const code = headers[col];
      if (!code || / G$/.test(code) || headers[col+1] !== code+' G') continue;
      const mark = row[col], grade = row[col+1];
      if (isBlank(mark) && isBlank(grade)) continue;
      subjects.push({ kod: code, nama: code, markah: mark, gred: grade });
    }
    return {
      ic, nama: get('NAMA PELAJAR'), kelas: get('KELAS'), tingkatan: source.name,
      subjek: subjects,
      jumlah: get('JUM MARKAH'), purata: get('PURATA %'), gp: get('GP'),
      keputusan: get('KEPUTUSAN'), kdk: get('KDK'), analisis: get('ANALISIS'),
      ulasan: get('ULASAN GURU KELAS'), kdt: get('KDT'), guru: get('GURU KELAS')
    };
  }
  return null;
}
