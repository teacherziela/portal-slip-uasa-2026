// Vercel server-side lookup endpoint. No personal records are embedded in this repository.
// Live records intentionally disabled until a school-approved, authenticated data source exists.
const DEMO = {
  ic: '000000000000',
  nama: 'MURID CONTOH (BUKAN REKOD SEBENAR)',
  kelas: '2 CONTOH',
  guru: 'GURU KELAS CONTOH',
  ulasan: 'Teruskan usaha dan tingkatkan prestasi akademik.',
  subjek: [
    { kod: 'BM', nama: 'BAHASA MELAYU', markah: 82, gred: 'A' },
    { kod: 'BI', nama: 'BAHASA INGGERIS', markah: 76, gred: 'B' },
    { kod: 'MAT', nama: 'MATEMATIK', markah: 91, gred: 'A' },
    { kod: 'SEJ', nama: 'SEJARAH', markah: 74, gred: 'B' },
    { kod: 'SN', nama: 'SAINS', markah: 68, gred: 'B' },
    { kod: 'GEO', nama: 'GEOGRAFI', markah: 60, gred: 'C' }
  ]
};

export default function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store, max-age=0');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ ok: false, mesej: 'Kaedah tidak disokong.' });
  }
  const ic = typeof req.body?.ic === 'string' ? req.body.ic.trim() : '';
  if (!/^\d{12}$/.test(ic)) {
    return res.status(400).json({ ok: false, mesej: 'Masukkan IC 12 digit.' });
  }
  if (ic === DEMO.ic) {
    return res.status(200).json({ ok: true, data: DEMO, demo: true });
  }
  return res.status(503).json({
    ok: false,
    demo: true,
    mesej: 'Rekod sebenar belum disambungkan. Portal ini dalam mod demonstrasi.'
  });
}
