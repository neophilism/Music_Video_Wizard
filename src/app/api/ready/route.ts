import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getEnvironment } from "@/lib/env";

export const dynamic="force-dynamic";
export const runtime="nodejs";

export async function GET(){
  try{
    getEnvironment();
    const result=await db.$queryRaw<Array<{value:number}>>`
      SELECT 1::int AS value
    `;
    if(result[0]?.value!==1){
      throw new Error("Unexpected database readiness result.");
    }
    return NextResponse.json(
      {
        status:"ready",
        service:"music-video-wizard",
        checks:{configuration:"ok",database:"ok"},
        timestamp:new Date().toISOString()
      },
      {headers:{"Cache-Control":"no-store"}}
    );
  }catch(error){
    console.error("Readiness check failed",error);
    return NextResponse.json(
      {
        status:"not_ready",
        service:"music-video-wizard",
        checks:{configuration:"checked",database:"unavailable"},
        timestamp:new Date().toISOString()
      },
      {
        status:503,
        headers:{"Cache-Control":"no-store"}
      }
    );
  }
}
