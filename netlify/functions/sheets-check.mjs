import { checkSources, configured } from './sheets-private.mjs';

const respond=(statusCode,body)=>({statusCode,headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'},body:JSON.stringify(body)});
export const handler=async(event)=>{
  if(event.httpMethod!=='POST') return respond(405,{ok:false});
  const expected=process.env.UASA_ADMIN_KEY;
  if(!expected || event.headers['x-admin-key']!==expected) return respond(401,{ok:false,mesej:'Akses pentadbir sahaja.'});
  if(!configured())return respond(503,{ok:false,mesej:'GOOGLE_CLIENT_EMAIL / GOOGLE_PRIVATE_KEY belum ditetapkan dalam Netlify.'});
  try {
    const sheets=await checkSources();
    return respond(200,{ok:sheets.every(s=>s.readable),sheets});
  } catch {
    return respond(502,{ok:false,mesej:'Kebenaran Google Sheets API tidak tersedia atau sambungan gagal.'});
  }
};
