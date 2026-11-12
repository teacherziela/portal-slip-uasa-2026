// Server-side lookup for Netlify. Demonstration records only.
// No real student identifiers or marks are stored in this repository.
const demo={ic:'000000000000',nama:'MURID CONTOH (BUKAN REKOD SEBENAR)',kelas:'2 CONTOH',guru:'GURU KELAS CONTOH',ulasan:'Teruskan usaha dan tingkatkan prestasi akademik.',subjek:[
{kod:'BM',nama:'BAHASA MELAYU',markah:82,gred:'A'},
{kod:'BI',nama:'BAHASA INGGERIS',markah:76,gred:'B'},
{kod:'MAT',nama:'MATEMATIK',markah:91,gred:'A'},
{kod:'SEJ',nama:'SEJARAH',markah:74,gred:'B'},
{kod:'SN',nama:'SAINS',markah:68,gred:'B'},
{kod:'GEO',nama:'GEOGRAFI',markah:60,gred:'C'}]};
const headers={'Cache-Control':'no-store, max-age=0','Content-Type':'application/json; charset=utf-8'};
const reply=(statusCode,data)=>({statusCode,headers,body:JSON.stringify(data)});
export const handler=async(event)=>{
if(event.httpMethod!=='POST')return reply(405,{ok:false,mesej:'Kaedah tidak disokong.'});
let data;
try{data=JSON.parse(event.body||'{}')}catch{return reply(400,{ok:false,mesej:'Permintaan tidak sah.'})}
const ic=typeof data.ic==='string'?data.ic.trim():'';
if(!/^\d{12}$/.test(ic))return reply(400,{ok:false,mesej:'Sila masukkan IC 12 digit.'});
if(ic===demo.ic)return reply(200,{ok:true,data:demo,demo:true});
return reply(503,{ok:false,demo:true,mesej:'Sambungan keputusan MOE belum mendapat kebenaran akses. Portal masih versi demonstrasi.'});
};