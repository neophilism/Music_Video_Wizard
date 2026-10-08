import {
  AssetStatus,
  Prisma,
  TimelineKind,
  VersionLifecycle,
  WizardStepStatus
} from "@prisma/client";
import { db } from "@/lib/db";
import { fingerprintJson } from "@/lib/dependency-graph/fingerprint";
import {
  ensureWizardProgress,
  saveManagedWizardStepInTransaction,
  WizardLockedError
} from "@/lib/wizard/service";
import {
  compileRenderManifest,
  type RenderManifest,
  type RenderSourceTransition
} from "./manifest";

export class FinishExportError extends Error{}
export class FinishExportConflictError extends FinishExportError{}

type Tx=Prisma.TransactionClient;

function toJson(value:unknown):Prisma.InputJsonValue{
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

async function mutationContext(tx:Tx,input:{
  userId:string;
  projectId:string;
  projectVersionId:string;
  expectedWizardRevision:number;
}){
  const progress=await tx.wizardProgress.findFirst({
    where:{
      projectVersionId:input.projectVersionId,
      projectVersion:{
        projectId:input.projectId,
        project:{workspace:{memberships:{some:{userId:input.userId}}}}
      }
    },
    include:{projectVersion:true,steps:true}
  });
  if(!progress) throw new FinishExportError("Finish & Export wizard state not found.");
  if(progress.projectVersion.lifecycle!==VersionLifecycle.DRAFT){
    throw new WizardLockedError("This project version is locked.");
  }
  if(progress.revision!==input.expectedWizardRevision){
    throw new FinishExportConflictError(
      "Finish & Export changed in another request. Reload before continuing."
    );
  }
  const step=progress.steps.find(item=>item.stepKey==="finish-export");
  if(!step) throw new FinishExportError("Finish & Export wizard step is unavailable.");
  if(step.lockedAt) throw new WizardLockedError("Finish & Export is locked.");
  const sourceStep=progress.steps.find(item=>item.stepKey==="refinement");
  if(!sourceStep?.lockedAt){
    throw new FinishExportError(
      "Lock Refinement before preparing Finish & Export."
    );
  }
  return {progress,step};
}

async function lockedRefinement(tx:Tx,projectId:string){
  const timeline=await tx.timeline.findFirst({
    where:{projectId,kind:TimelineKind.WORKING},
    orderBy:{createdAt:"asc"}
  });
  if(!timeline) return null;
  return tx.timelineVersion.findFirst({
    where:{
      timelineId:timeline.id,
      lifecycle:VersionLifecycle.LOCKED
    },
    orderBy:{versionNumber:"desc"},
    include:{
      node:true,
      items:{
        orderBy:[{trackIndex:"asc"},{position:"asc"}],
        include:{assetVersion:true}
      },
      transitions:true
    }
  });
}

async function compileCurrentManifest(
  tx:Tx,
  input:{
    projectId:string;
    projectVersionId:string;
  }
):Promise<RenderManifest>{
  const projectVersion=await tx.projectVersion.findUnique({
    where:{id:input.projectVersionId}
  });
  if(
    !projectVersion||
    projectVersion.projectId!==input.projectId
  ){
    throw new FinishExportError("Project version not found.");
  }
  if(
    !projectVersion.outputWidth||
    !projectVersion.outputHeight||
    !projectVersion.frameRate||
    !projectVersion.aspectRatio||
    !projectVersion.audioMasterAssetVersionId
  ){
    throw new FinishExportError(
      "Project delivery dimensions, frame rate, aspect ratio, and audio master are required."
    );
  }

  const source=await lockedRefinement(tx,input.projectId);
  if(!source){
    throw new FinishExportError("Locked Refinement timeline not found.");
  }
  if(source.basisProjectVersionId!==projectVersion.id){
    throw new FinishExportError(
      "Locked Refinement timeline belongs to a different ProjectVersion."
    );
  }

  const audio=await tx.assetVersion.findFirst({
    where:{
      id:projectVersion.audioMasterAssetVersionId,
      status:AssetStatus.READY,
      asset:{projectId:input.projectId}
    }
  });
  if(!audio){
    throw new FinishExportError(
      "The immutable audio master is not ready for rendering."
    );
  }

  const idToPosition=new Map(
    source.items.map(item=>[item.id,item.position])
  );
  const transitions:RenderSourceTransition[]=source.transitions.map(
    transition=>{
      const fromPosition=idToPosition.get(transition.fromItemId);
      const toPosition=idToPosition.get(transition.toItemId);
      if(fromPosition===undefined||toPosition===undefined){
        throw new FinishExportError(
          "Refinement transition references a missing timeline item."
        );
      }
      return {
        fromPosition,
        toPosition,
        kind:transition.kind,
        durationMs:transition.durationMs,
        parameters:transition.parameters
      };
    }
  );

  try{
    return compileRenderManifest({
      projectVersionId:projectVersion.id,
      sourceTimelineVersionId:source.id,
      sourceTimelineNodeId:source.nodeId,
      audioMasterAssetVersionId:audio.id,
      audioMasterNodeId:audio.nodeId,
      audioContentType:audio.contentType,
      audioDurationMs:audio.durationMs,
      width:projectVersion.outputWidth,
      height:projectVersion.outputHeight,
      frameRate:projectVersion.frameRate,
      aspectRatio:projectVersion.aspectRatio,
      items:source.items.map(item=>{
        if(
          !item.shotVersionId||
          !item.assetVersionId||
          !item.assetVersion
        ){
          throw new FinishExportError(
            "Refinement timeline contains an incomplete video item."
          );
        }
        if(item.sourceEndMs===null){
          throw new FinishExportError(
            "Refinement timeline contains an open-ended source range."
          );
        }
        return {
          position:item.position,
          shotVersionId:item.shotVersionId,
          clipAssetVersionId:item.assetVersionId,
          clipNodeId:item.assetVersion.nodeId,
          contentType:item.assetVersion.contentType,
          timelineStartMs:item.timelineStartMs,
          timelineEndMs:item.timelineEndMs,
          sourceStartMs:item.sourceStartMs,
          sourceEndMs:item.sourceEndMs,
          clipDurationMs:item.assetVersion.durationMs
        };
      }),
      transitions
    });
  }catch(error){
    if(error instanceof FinishExportError) throw error;
    throw new FinishExportError(
      error instanceof Error?error.message:"Render manifest validation failed."
    );
  }
}

function manifestFingerprint(manifest:RenderManifest){
  return fingerprintJson(
    toJson(manifest) as unknown as Prisma.JsonValue
  );
}

export async function prepareRenderManifest(input:{
  userId:string;
  projectId:string;
  expectedWizardRevision:number;
}){
  const projectVersion=await ensureWizardProgress(input);
  return db.$transaction(async tx=>{
    await mutationContext(tx,{
      ...input,
      projectVersionId:projectVersion.id
    });
    const manifest=await compileCurrentManifest(tx,{
      projectId:input.projectId,
      projectVersionId:projectVersion.id
    });
    const fingerprint=manifestFingerprint(manifest);

    await saveManagedWizardStepInTransaction(tx,{
      projectVersionId:projectVersion.id,
      stepKey:"finish-export",
      payload:toJson({
        manifest,
        manifestFingerprint:fingerprint,
        preparedAt:new Date().toISOString()
      }),
      semanticFingerprint:fingerprint
    });

    return {manifest,manifestFingerprint:fingerprint};
  },{isolationLevel:Prisma.TransactionIsolationLevel.Serializable});
}

export async function getFinishExportState(input:{
  userId:string;
  projectId:string;
}){
  const projectVersion=await ensureWizardProgress(input);

  return db.$transaction(async tx=>{
    const progress=await tx.wizardProgress.findUniqueOrThrow({
      where:{projectVersionId:projectVersion.id},
      include:{steps:true}
    });
    const sourceStep=progress.steps.find(step=>step.stepKey==="refinement");
    const step=progress.steps.find(step=>step.stepKey==="finish-export");
    if(!step){
      throw new FinishExportError("Finish & Export wizard step is unavailable.");
    }

    let manifest:RenderManifest|null=null;
    let currentFingerprint:string|null=null;
    let sourceError:string|null=null;
    if(sourceStep?.lockedAt){
      try{
        manifest=await compileCurrentManifest(tx,{
          projectId:input.projectId,
          projectVersionId:projectVersion.id
        });
        currentFingerprint=manifestFingerprint(manifest);
      }catch(error){
        sourceError=error instanceof Error
          ?error.message
          :"Render manifest validation failed.";
      }
    }

    const prepared=Boolean(
      currentFingerprint&&
      step.payloadFingerprint===currentFingerprint
    );

    return {
      sourceReady:Boolean(sourceStep?.lockedAt&&manifest),
      sourceError,
      prepared,
      needsPrepare:Boolean(sourceStep?.lockedAt&&manifest&&!prepared),
      manifest,
      wizardRevision:progress.revision,
      wizardStatus:step.status??WizardStepStatus.NOT_STARTED,
      wizardLocked:Boolean(step.lockedAt)
    };
  });
}
