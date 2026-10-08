import { GenerationStatus } from "@prisma/client";
import { db } from "../src/lib/db";
import { getEnvironment } from "../src/lib/env";

function ageMs(date:Date){
  return Date.now()-date.getTime();
}

function formatAge(ms:number){
  const seconds=Math.max(0,Math.floor(ms/1000));
  if(seconds<60) return seconds+"s";
  const minutes=Math.floor(seconds/60);
  if(minutes<60) return minutes+"m";
  const hours=Math.floor(minutes/60);
  return hours+"h "+(minutes%60)+"m";
}

async function main(){
  const env=getEnvironment();
  const json=process.argv.includes("--json");
  const failOnStale=process.argv.includes("--fail-on-stale");
  const staleAfterMs=Math.max(
    5*60*1000,
    env.JOB_HEARTBEAT_SECONDS*6*1000
  );

  const dbStart=performance.now();
  await db.$queryRaw`SELECT 1`;
  const databaseLatencyMs=Math.round(performance.now()-dbStart);

  const [
    grouped,
    active,
    failures24h
  ]=await Promise.all([
    db.generationJob.groupBy({
      by:["status"],
      _count:{_all:true}
    }),
    db.generationJob.findMany({
      where:{
        status:{in:[GenerationStatus.QUEUED,GenerationStatus.RUNNING]}
      },
      orderBy:{createdAt:"asc"},
      select:{
        id:true,
        kind:true,
        status:true,
        providerKey:true,
        modelKey:true,
        progressPercent:true,
        progressMessage:true,
        createdAt:true,
        updatedAt:true,
        startedAt:true,
        attemptCount:true,
        maxAttempts:true
      },
      take:100
    }),
    db.generationJob.findMany({
      where:{
        status:GenerationStatus.FAILED,
        completedAt:{gte:new Date(Date.now()-24*60*60*1000)}
      },
      orderBy:{completedAt:"desc"},
      select:{
        id:true,
        kind:true,
        providerKey:true,
        modelKey:true,
        errorMessage:true,
        attemptCount:true,
        maxAttempts:true,
        completedAt:true
      },
      take:20
    })
  ]);

  const counts=Object.fromEntries(
    Object.values(GenerationStatus).map(status=>[status,0])
  ) as Record<GenerationStatus,number>;
  for(const row of grouped) counts[row.status]=row._count._all;

  const stale=active.filter(job=>ageMs(job.updatedAt)>staleAfterMs);

  const report={
    checkedAt:new Date().toISOString(),
    databaseLatencyMs,
    staleAfterSeconds:Math.round(staleAfterMs/1000),
    counts,
    active:active.map(job=>({
      ...job,
      ageSeconds:Math.round(ageMs(job.createdAt)/1000),
      idleSeconds:Math.round(ageMs(job.updatedAt)/1000)
    })),
    stale:stale.map(job=>({
      id:job.id,
      kind:job.kind,
      status:job.status,
      providerKey:job.providerKey,
      modelKey:job.modelKey,
      progressPercent:job.progressPercent,
      idleSeconds:Math.round(ageMs(job.updatedAt)/1000)
    })),
    failures24h:failures24h.map(job=>({
      ...job,
      errorMessage:job.errorMessage?.slice(0,1000)??null
    }))
  };

  if(json){
    console.log(JSON.stringify(report,null,2));
  }else{
    console.log("Music Video Wizard operator status");
    console.log("checked:",report.checkedAt);
    console.log("database latency:",databaseLatencyMs+"ms");
    console.log("jobs:");
    for(const status of Object.values(GenerationStatus)){
      console.log("  "+status.toLowerCase()+":",counts[status]);
    }

    console.log("active:",active.length);
    for(const job of active){
      console.log(
        "  "+job.status+" "+job.kind+" "+job.id+
        " "+job.progressPercent+"%"+
        " age="+formatAge(ageMs(job.createdAt))+
        " idle="+formatAge(ageMs(job.updatedAt))+
        " provider="+job.providerKey+
        (job.modelKey?" model="+job.modelKey:"")
      );
    }

    console.log("stale:",stale.length);
    for(const job of stale){
      console.log(
        "  "+job.status+" "+job.kind+" "+job.id+
        " idle="+formatAge(ageMs(job.updatedAt))
      );
    }

    console.log("failures in last 24h:",failures24h.length);
    for(const job of failures24h){
      console.log(
        "  "+job.kind+" "+job.id+
        " provider="+job.providerKey+
        " attempts="+job.attemptCount+"/"+job.maxAttempts+
        (job.errorMessage?" error="+job.errorMessage.slice(0,240):"")
      );
    }
  }

  if(failOnStale&&stale.length){
    process.exitCode=2;
  }
}

main()
  .catch(error=>{
    console.error("Operator status failed.");
    console.error(error);
    process.exitCode=1;
  })
  .finally(async()=>{
    await db.$disconnect();
  });
