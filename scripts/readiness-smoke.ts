import assert from "node:assert/strict";
import { db } from "../src/lib/db";
import { GET } from "../src/app/api/ready/route";

async function main(){
  try{
    const response=await GET();
    assert.equal(response.status,200);
    const payload=await response.json() as {
      status?:string;
      checks?:{configuration?:string;database?:string};
    };
    assert.equal(payload.status,"ready");
    assert.equal(payload.checks?.configuration,"ok");
    assert.equal(payload.checks?.database,"ok");
    console.log("Readiness smoke test passed.");
  }finally{
    await db.$disconnect();
  }
}

main().catch(error=>{
  console.error(error);
  process.exit(1);
});
