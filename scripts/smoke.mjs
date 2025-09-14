
import http from "node:http";
const get=u=>new Promise((res,rej)=>{const r=http.get(u,s=>{let d="";s.on("data",c=>d+=c);s.on("end",()=>res({status:s.statusCode,data:d}))});r.on("error",rej);});
const wait=ms=>new Promise(r=>setTimeout(r,ms));
(async()=>{ await wait(1000);
  const h=await get("http://localhost:3001/healthz"); if(h.status!==200) throw new Error("BFF health failed");
  const k=await get("http://localhost:3001/kpis"); if(k.status!==200) throw new Error("BFF kpis failed");
  const a=await get("http://localhost:3002/dashboard"); if(a.status!==200) throw new Error("Admin dashboard failed");
  console.log("SMOKE OK");
})().catch(e=>{console.error(e);process.exit(1);});
