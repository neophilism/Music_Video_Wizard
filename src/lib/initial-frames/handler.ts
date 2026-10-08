import { createHash,randomUUID } from "node:crypto";
import type { GenerationJob } from "@prisma/client";
import {
  AssetKind,
  AssetStatus,
  DependencyRelation,
  DomainVersionKind,
  VersionLifecycle
} from "@prisma/client";
import { db } from "@/lib/db";
import { registerDependencyEdgeInTransaction } from "@/lib/dependency-graph/service";
import { getEnvironment } from "@/lib/env";
import type { GenerationHandlerContext } from "@/lib/jobs/registry";
import { PermanentGenerationError } from "@/lib/jobs/registry";
import { MediaProviderError } from "@/lib/media-generation/errors";
import { getConfiguredMediaGenerationAdapters } from "@/lib/media-generation/factory";
import { modelRejectionReasons } from "@/lib/media-generation/selection";
import type {
  MediaGenerationAdapter,
  MediaGenerationOutput,
  MediaGenerationResult
} from "@/lib/media-generation/types";
import { shotSpecificationSpecSchema } from "@/lib/shot-specifications/schema";
import { createAssetStorage } from "@/lib/storage";
import { queuedInitialFrameGenerationSchema } from "./input";
import { completeInitialFramesIfCovered,InitialFramesError } from "./service";
import {
  initialFrameAssetsForProject,
  parseInitialFrameMetadata
} from "./source";

function sleep(ms:number,signal:AbortSignal){
  return new Promise<void>((resolve,reject)=>{
    const timer=setTimeout(resolve,ms);
    signal.addEventListener("abort",()=>{
      clearTimeout(timer);
      reject(signal.reason??new Error("Generation aborted."));
    },{once:true});
  });
}

function extensionFor(contentType:string){
  if(contentType==="image/jpeg") return "jpg";
  if(contentType==="image/webp") return "webp";
  return "png";
}

async function outputBytes(output:MediaGenerationOutput){
  if(output.kind==="INLINE_BASE64"&&output.base64){
    return new Uint8Array(Buffer.from(output.base64,"base64"));
  }
  if(output.kind==="REMOTE_URL"&&output.url){
    const response=await fetch(output.url);
    if(!response.ok){
      throw new Error(
        "Generated image download returned HTTP "+response.status+"."
      );
    }
    return new Uint8Array(await response.arrayBuffer());
  }
  throw new PermanentGenerationError(
    "Image provider returned an unusable generation output."
  );
}

async function execute(
  adapter:MediaGenerationAdapter,
  model:Awaited<ReturnType<MediaGenerationAdapter["listModels"]>>[number],
  request:ReturnType<typeof queuedInitialFrameGenerationSchema.parse>["request"],
  context:GenerationHandlerContext
):Promise<MediaGenerationResult>{
  const reasons=modelRejectionReasons(model,request);
  if(reasons.length){
    throw new PermanentGenerationError(
      "Selected image model no longer satisfies the compiled request: "+
      reasons.join(", ")
    );
  }

  const submission=await adapter.submit({model,request});
  if(submission.immediateResult) return submission.immediateResult;
  if(!submission.externalJobId){
    throw new PermanentGenerationError(
      "Image provider returned neither an immediate result nor a job ID."
    );
  }

  let progress=25;
  while(true){
    if(context.signal.aborted){
      if(adapter.cancel){
        await adapter.cancel({
          model,
          externalJobId:submission.externalJobId
        }).catch(()=>undefined);
      }
      throw context.signal.reason??new Error("Generation aborted.");
    }
    const result=await adapter.poll({
      model,
      externalJobId:submission.externalJobId
    });
    if(
      result.status==="SUCCEEDED"||
      result.status==="FAILED"||
      result.status==="CANCELED"
    ) return result;
    progress=Math.min(80,progress+5);
    await context.reportProgress(progress,"Waiting for image provider.");
    await sleep(1500,context.signal);
  }
}

async function existingOutput(jobId:string){
  const output=await db.generationOutput.findFirst({
    where:{jobId,role:"initial-frame"}
  });
  if(!output) return null;
  const version=await db.assetVersion.findFirst({
    where:{nodeId:output.nodeId}
  });
  return version?{
    assetVersionId:version.id,
    nodeId:version.nodeId,
    reused:true
  }:null;
}

export async function handleInitialFrameGeneration(
  job:GenerationJob,
  context:GenerationHandlerContext
){
  const queued=queuedInitialFrameGenerationSchema.parse(job.requestSnapshot);
  const already=await existingOutput(job.id);
  if(already) return already;
  if(!job.modelKey){
    throw new PermanentGenerationError(
      "Initial Frame job is missing its selected model snapshot."
    );
  }

  const specificationVersion=await db.shotVersion.findFirst({
    where:{
      id:queued.shotSpecificationVersionId,
      nodeId:queued.shotSpecificationNodeId,
      lifecycle:VersionLifecycle.LOCKED,
      shot:{projectId:queued.projectId}
    }
  });
  if(!specificationVersion){
    throw new PermanentGenerationError(
      "The locked Shot Specification source no longer exists."
    );
  }
  const specification=shotSpecificationSpecSchema.parse(
    specificationVersion.structuredSpec
  );
  if(
    specification.sourceStoryboardShotVersionId!==
      queued.sourceStoryboardShotVersionId
  ){
    throw new PermanentGenerationError(
      "Initial Frame source provenance no longer matches the queued request."
    );
  }

  const providerId=job.providerKey.replace(/:initial-frame$/,"");
  const adapters=getConfiguredMediaGenerationAdapters(getEnvironment());
  const adapter=adapters.find(candidate=>candidate.providerId===providerId);
  if(!adapter){
    throw new PermanentGenerationError(
      "Configured image provider is unavailable: "+providerId
    );
  }
  const model=(await adapter.listModels()).find(
    candidate=>candidate.modelId===job.modelKey
  );
  if(!model){
    throw new PermanentGenerationError(
      "Configured image model is unavailable: "+job.modelKey
    );
  }

  await context.reportProgress(15,"Generating initial frame.");
  let result:MediaGenerationResult;
  try{
    result=await execute(adapter,model,queued.request,context);
  }catch(error){
    if(error instanceof MediaProviderError&&error.permanent){
      throw new PermanentGenerationError(error.message);
    }
    throw error;
  }
  if(result.status!=="SUCCEEDED"){
    throw new PermanentGenerationError(
      result.errorMessage??"Image provider did not produce a successful frame."
    );
  }
  const output=result.outputs[0];
  if(!output){
    throw new PermanentGenerationError("Image provider returned no frame output.");
  }
  const bytes=await outputBytes(output);
  if(!bytes.byteLength){
    throw new PermanentGenerationError("Generated Initial Frame is empty.");
  }

  await context.reportProgress(85,"Persisting generated Initial Frame.");
  const checksum=createHash("sha256").update(bytes).digest("hex");
  const storage=createAssetStorage();
  const assets=await db.$transaction(tx=>
    initialFrameAssetsForProject(tx,queued.projectId)
  );
  const priorAsset=assets.find(asset=>
    asset.versions.some(version=>
      parseInitialFrameMetadata(version.metadata)?.logicalShotId===
        specificationVersion.shotId
    )
  )??null;
  const assetId=priorAsset?.id??randomUUID();
  const assetVersionId=job.id;
  const nodeId=randomUUID();
  const versionNumber=(priorAsset?.versions[0]?.versionNumber??0)+1;
  const extension=extensionFor(output.contentType);
  const storageKey=[
    "workspaces",job.workspaceId,
    "projects",queued.projectId,
    "initial-frames",assetId,
    assetVersionId+"."+extension
  ].join("/");

  await storage.put({
    key:storageKey,
    body:bytes,
    contentType:output.contentType
  });

  try{
    const persisted=await db.$transaction(async tx=>{
      const duplicate=await tx.generationOutput.findFirst({
        where:{jobId:job.id,role:"initial-frame"}
      });
      if(duplicate){
        const version=await tx.assetVersion.findFirstOrThrow({
          where:{nodeId:duplicate.nodeId}
        });
        return {assetVersionId:version.id,nodeId:version.nodeId,reused:true};
      }

      const currentSource=await tx.shotVersion.findFirst({
        where:{
          id:queued.shotSpecificationVersionId,
          nodeId:queued.shotSpecificationNodeId,
          lifecycle:VersionLifecycle.LOCKED,
          shot:{projectId:queued.projectId}
        }
      });
      if(!currentSource){
        throw new InitialFramesError(
          "Shot Specification changed before the Initial Frame could be persisted."
        );
      }

      await tx.domainVersionNode.create({
        data:{
          id:nodeId,
          kind:DomainVersionKind.ASSET,
          fingerprint:checksum
        }
      });
      if(!priorAsset){
        await tx.asset.create({
          data:{
            id:assetId,
            workspaceId:job.workspaceId,
            projectId:queued.projectId,
            kind:AssetKind.GENERATED_IMAGE,
            name:"Initial frame · "+(currentSource.label??"shot")
          }
        });
      }
      await tx.assetVersion.create({
        data:{
          id:assetVersionId,
          assetId,
          nodeId,
          versionNumber,
          status:AssetStatus.READY,
          storageKey,
          contentType:output.contentType,
          byteSize:BigInt(bytes.byteLength),
          checksumSha256:checksum,
          metadata:{
            role:"initial-frame",
            logicalShotId:currentSource.shotId,
            sourceShotSpecificationVersionId:currentSource.id,
            sourceStoryboardShotVersionId:
              specification.sourceStoryboardShotVersionId,
            generationJobId:job.id,
            providerId,
            modelId:job.modelKey
          },
          createdByUserId:job.requestedByUserId,
          readyAt:new Date()
        }
      });
      await registerDependencyEdgeInTransaction(tx,{
        upstreamNodeId:currentSource.nodeId,
        downstreamNodeId:nodeId,
        relation:DependencyRelation.GENERATED_FROM,
        reason:
          "Initial Frame is generated from this exact locked Shot Specification."
      });
      await tx.generationOutput.create({
        data:{
          jobId:job.id,
          nodeId,
          role:"initial-frame",
          position:0
        }
      });
      await completeInitialFramesIfCovered(tx,{
        projectId:queued.projectId,
        projectVersionId:queued.projectVersionId
      });
      return {assetVersionId,nodeId,reused:false};
    });

    return {
      ...persisted,
      checksumSha256:checksum,
      providerId,
      modelId:job.modelKey,
      providerSnapshot:result.providerSnapshot??null
    };
  }catch(error){
    await storage.delete(storageKey).catch(()=>undefined);
    if(error instanceof InitialFramesError){
      throw new PermanentGenerationError(error.message);
    }
    throw error;
  }
}
