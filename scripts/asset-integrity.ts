import { createHash,randomUUID } from "node:crypto";
import { createReadStream } from "node:fs";
import { stat,unlink } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { AssetStatus } from "@prisma/client";
import { db } from "../src/lib/db";
import { createAssetStorage } from "../src/lib/storage";

async function sha256File(path:string){
  return new Promise<string>((resolve,reject)=>{
    const hash=createHash("sha256");
    const stream=createReadStream(path);
    stream.on("data",chunk=>hash.update(chunk));
    stream.on("error",reject);
    stream.on("end",()=>resolve(hash.digest("hex")));
  });
}

async function mapLimited<T,R>(
  items:T[],
  limit:number,
  worker:(item:T,index:number)=>Promise<R>
){
  const results=new Array<R>(items.length);
  let next=0;
  const runners=Array.from(
    {length:Math.min(limit,items.length)},
    async()=>{
      while(true){
        const index=next++;
        if(index>=items.length) return;
        results[index]=await worker(items[index]!,index);
      }
    }
  );
  await Promise.all(runners);
  return results;
}

async function main(){
  const deep=process.argv.includes("--deep");
  const json=process.argv.includes("--json");
  const storage=createAssetStorage();

  const versions=await db.assetVersion.findMany({
    where:{status:AssetStatus.READY},
    orderBy:{createdAt:"asc"},
    select:{
      id:true,
      assetId:true,
      versionNumber:true,
      storageKey:true,
      contentType:true,
      byteSize:true,
      checksumSha256:true,
      createdAt:true,
      asset:{
        select:{
          kind:true,
          projectId:true,
          name:true
        }
      }
    }
  });

  const checked=await mapLimited(versions,8,async version=>{
    const exists=await storage.exists(version.storageKey);
    const result={
      assetVersionId:version.id,
      assetId:version.assetId,
      assetKind:version.asset.kind,
      projectId:version.asset.projectId,
      name:version.asset.name,
      versionNumber:version.versionNumber,
      storageKey:version.storageKey,
      exists,
      expectedByteSize:
        version.byteSize===null?null:Number(version.byteSize),
      actualByteSize:null as number|null,
      expectedChecksum:version.checksumSha256,
      actualChecksum:null as string|null,
      errors:[] as string[]
    };

    if(!exists){
      result.errors.push("storage object missing");
      return result;
    }
    if(!deep) return result;

    const path=join(
      tmpdir(),
      "music-video-wizard-integrity-"+randomUUID()
    );
    try{
      await storage.downloadToFile(version.storageKey,path);
      const info=await stat(path);
      result.actualByteSize=info.size;
      result.actualChecksum=await sha256File(path);

      if(
        result.expectedByteSize!==null&&
        result.actualByteSize!==result.expectedByteSize
      ){
        result.errors.push(
          "byte size mismatch: expected "+
          result.expectedByteSize+", got "+result.actualByteSize
        );
      }
      if(
        result.expectedChecksum&&
        result.actualChecksum!==result.expectedChecksum
      ){
        result.errors.push("SHA-256 mismatch");
      }
    }finally{
      await unlink(path).catch(()=>undefined);
    }
    return result;
  });

  const failures=checked.filter(item=>item.errors.length);
  const report={
    checkedAt:new Date().toISOString(),
    mode:deep?"deep":"existence",
    assetVersions:checked.length,
    missing:checked.filter(item=>!item.exists).length,
    corrupt:checked.filter(
      item=>item.exists&&item.errors.length>0
    ).length,
    failures
  };

  if(json){
    console.log(JSON.stringify(report,null,2));
  }else{
    console.log("Music Video Wizard asset integrity");
    console.log("checked:",report.checkedAt);
    console.log("mode:",report.mode);
    console.log("READY asset versions:",report.assetVersions);
    console.log("missing objects:",report.missing);
    console.log("corrupt/mismatched objects:",report.corrupt);
    for(const failure of failures){
      console.log(
        "  "+failure.assetKind+" "+failure.assetVersionId+
        " "+failure.storageKey+
        " -> "+failure.errors.join("; ")
      );
    }
  }

  if(failures.length) process.exitCode=2;
}

main()
  .catch(error=>{
    console.error("Asset integrity audit failed.");
    console.error(error);
    process.exitCode=1;
  })
  .finally(async()=>{
    await db.$disconnect();
  });
