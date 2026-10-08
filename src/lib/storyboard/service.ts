import {
  DependencyRelation,
  DomainVersionKind,
  GenerationKind,
  GenerationStatus,
  Prisma,
  VersionLifecycle,
  WizardStepStatus
} from "@prisma/client";
import { db } from "@/lib/db";
import { fingerprintJson } from "@/lib/dependency-graph/fingerprint";
import { registerDependencyEdgeInTransaction } from "@/lib/dependency-graph/service";
import { getEnvironment } from "@/lib/env";
import { enqueueGenerationJob } from "@/lib/jobs/service";
import { sequenceSourceSpecSchema } from "@/lib/sequence-map/schema";
import {
  getConfiguredTextProvider,
  textGenerationAvailable
} from "@/lib/text-generation/factory";
import {
  completeAutomaticWizardStepInTransaction,
  ensureWizardProgress,
  WizardLockedError
} from "@/lib/wizard/service";
import { queuedStoryboardGenerationSchema } from "./input";
import {
  storyboardCompletionIssues,
  storyboardDocumentSchema,
  storyboardShotSpecSchema,
  type StoryboardDocument
} from "./schema";

export class StoryboardError extends Error {}
export class StoryboardConflictError extends StoryboardError {}

type Tx=Prisma.TransactionClient;

function toJson(value:unknown):Prisma.InputJsonValue{
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

async function activeSequences(tx:Tx,projectVersionId:string){
  const links=await tx.projectVersionSequence.findMany({
    where:{projectVersionId},
    orderBy:{position:"asc"},
    include:{sequenceVersion:true}
  });
  return links.map(link=>({
    position:link.position,
    version:link.sequenceVersion,
    spec:sequenceSourceSpecSchema.parse(link.sequenceVersion.structuredSpec)
  }));
}

async function activeStoryboardJob(tx:Tx,projectId:string){
  return tx.generationJob.findFirst({
    where:{
      projectId,
      kind:GenerationKind.TEXT,
      providerKey:{endsWith:":storyboard"},
      status:{in:[GenerationStatus.QUEUED,GenerationStatus.RUNNING]}
    },
    orderBy:{createdAt:"desc"}
  });
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
  if(!progress) throw new StoryboardError("Storyboard wizard state not found.");
  if(progress.projectVersion.lifecycle!==VersionLifecycle.DRAFT){
    throw new WizardLockedError("This project version is locked.");
  }
  if(progress.revision!==input.expectedWizardRevision){
    throw new StoryboardConflictError(
      "Storyboard changed in another request. Reload before continuing."
    );
  }
  const step=progress.steps.find(item=>item.stepKey==="storyboard");
  if(!step) throw new StoryboardError("Storyboard wizard step is unavailable.");
  if(step.lockedAt) throw new WizardLockedError("The Storyboard is locked.");
  const sequenceStep=progress.steps.find(item=>item.stepKey==="sequence-map");
  if(!sequenceStep?.lockedAt){
    throw new StoryboardError(
      "Lock the Sequence Map before generating the storyboard."
    );
  }
  return {progress,step};
}

async function serializeStoryboard(tx:Tx,projectVersionId:string){
  const links=await tx.projectVersionSequence.findMany({
    where:{projectVersionId},
    orderBy:{position:"asc"},
    include:{
      sequenceVersion:{
        include:{
          shotLinks:{
            orderBy:{position:"asc"},
            include:{shotVersion:true}
          }
        }
      }
    }
  });
  return {
    sequences:links.map(link=>{
      const sequence=link.sequenceVersion;
      const sequenceSpec=sequenceSourceSpecSchema.parse(sequence.structuredSpec);
      return {
        position:link.position,
        sequenceVersionId:sequence.id,
        sequenceNodeId:sequence.nodeId,
        sequenceVersionNumber:sequence.versionNumber,
        sequenceLifecycle:sequence.lifecycle,
        title:sequence.title,
        startMs:sequence.musicStartMs,
        endMs:sequence.musicEndMs,
        targetShotCount:sequenceSpec.targetShotCount,
        shots:sequence.shotLinks.map(shotLink=>{
          const shot=shotLink.shotVersion;
          const spec=storyboardShotSpecSchema.parse(shot.structuredSpec);
          return {
            position:shotLink.position,
            shotId:shot.shotId,
            shotVersionId:shot.id,
            nodeId:shot.nodeId,
            versionNumber:shot.versionNumber,
            lifecycle:shot.lifecycle,
            label:shot.label,
            startMs:shot.plannedStartMs,
            endMs:shot.plannedEndMs,
            dramaticPurpose:shot.dramaticPurpose,
            subject:shot.subject,
            action:shot.action,
            environment:shot.locationDescription,
            framingIntent:shot.composition,
            cameraIntent:shot.cameraMotion,
            continuityNotes:shot.continuityNotes,
            transitionIn:shot.transitionIn,
            transitionOut:shot.transitionOut,
            visualIntensity:spec.visualIntensity,
            beat:spec.beat,
            generationJobId:spec.generationJobId
          };
        })
      };
    })
  };
}

function storyboardFingerprint(state:Awaited<ReturnType<typeof serializeStoryboard>>){
  return fingerprintJson(toJson(state) as unknown as Prisma.JsonValue);
}

async function storyboardPayload(tx:Tx,projectVersionId:string){
  const state=await serializeStoryboard(tx,projectVersionId);
  return toJson({
    sequenceVersionIds:state.sequences.map(sequence=>sequence.sequenceVersionId),
    shotVersionIds:state.sequences.flatMap(sequence=>
      sequence.shots.map(shot=>shot.shotVersionId)
    ),
    shotNodeIds:state.sequences.flatMap(sequence=>
      sequence.shots.map(shot=>shot.nodeId)
    ),
    shotCount:state.sequences.reduce(
      (sum,sequence)=>sum+sequence.shots.length,
      0
    )
  });
}

export async function queueStoryboardGeneration(input:{
  userId:string;
  projectId:string;
  expectedWizardRevision:number;
  direction:string;
}){
  const projectVersion=await ensureWizardProgress(input);
  const configured=getConfiguredTextProvider(getEnvironment());

  const context=await db.$transaction(async tx=>{
    const current=await mutationContext(tx,{
      ...input,
      projectVersionId:projectVersion.id
    });
    if(await activeStoryboardJob(tx,input.projectId)){
      throw new StoryboardError("A storyboard generation job is already active.");
    }
    const sequences=await activeSequences(tx,projectVersion.id);
    if(sequences.length===0){
      throw new StoryboardError("The locked Sequence Map is empty.");
    }
    if(sequences.some(item=>item.version.lifecycle!==VersionLifecycle.LOCKED)){
      throw new StoryboardError(
        "Every active Sequence Map sequence must be locked."
      );
    }
    return {
      progressId:current.progress.id,
      stepId:current.step.id,
      sequences
    };
  });

  const request=queuedStoryboardGenerationSchema.parse({
    textOperation:"storyboard",
    projectId:input.projectId,
    projectVersionId:projectVersion.id,
    sequenceVersionIds:context.sequences.map(item=>item.version.id),
    direction:input.direction
  });
  const workspace=await db.project.findUniqueOrThrow({
    where:{id:input.projectId},
    select:{workspaceId:true}
  });

  const job=await enqueueGenerationJob({
    workspaceId:workspace.workspaceId,
    projectId:input.projectId,
    kind:GenerationKind.TEXT,
    providerKey:configured.provider.key+":storyboard",
    modelKey:configured.model,
    requestSnapshot:toJson(request),
    requestedByUserId:input.userId,
    inputs:context.sequences.map(item=>({
      nodeId:item.version.nodeId,
      role:"storyboard-sequence",
      position:item.position
    })),
    prepare:async(tx)=>{
      await tx.wizardStepState.update({
        where:{id:context.stepId},
        data:{
          status:WizardStepStatus.IN_PROGRESS,
          completedAt:null,
          needsReviewAt:null,
          reviewReason:null
        }
      });
      await tx.wizardProgress.update({
        where:{id:context.progressId},
        data:{revision:{increment:1},currentStepKey:"storyboard"}
      });
    }
  });
  return {jobId:job.id,status:job.status};
}

export async function persistStoryboardGeneration(input:{
  generationJobId:string;
  projectId:string;
  projectVersionId:string;
  sequenceVersionIds:string[];
  storyboard:StoryboardDocument;
}){
  const storyboard=storyboardDocumentSchema.parse(input.storyboard);
  return db.$transaction(async tx=>{
    const job=await tx.generationJob.findUniqueOrThrow({
      where:{id:input.generationJobId}
    });
    const request=queuedStoryboardGenerationSchema.parse(job.requestSnapshot);
    if(
      request.projectId!==input.projectId ||
      request.projectVersionId!==input.projectVersionId ||
      request.sequenceVersionIds.length!==input.sequenceVersionIds.length ||
      request.sequenceVersionIds.some((id,index)=>id!==input.sequenceVersionIds[index])
    ){
      throw new StoryboardError("Storyboard generation no longer matches its queued source.");
    }

    const sequences=await activeSequences(tx,input.projectVersionId);
    const activeIds=sequences.map(item=>item.version.id);
    if(
      activeIds.length!==input.sequenceVersionIds.length ||
      activeIds.some((id,index)=>id!==input.sequenceVersionIds[index]) ||
      sequences.some(item=>item.version.lifecycle!==VersionLifecycle.LOCKED)
    ){
      throw new StoryboardError("Sequence Map changed after storyboard generation was queued.");
    }

    const constraints=sequences.map(item=>({
      sequenceVersionId:item.version.id,
      startMs:item.version.musicStartMs??0,
      endMs:item.version.musicEndMs??0,
      targetShotCount:item.spec.targetShotCount
    }));
    const issues=storyboardCompletionIssues(storyboard,constraints);
    if(issues.length) throw new StoryboardError(issues.join(" "));

    const existingOutput=await tx.generationOutput.findFirst({
      where:{jobId:input.generationJobId,role:"storyboard-shot"}
    });
    if(existingOutput){
      return {projectVersionId:input.projectVersionId};
    }

    let globalPosition=0;
    for(const sequenceResult of storyboard.sequences){
      const sequence=sequences.find(
        item=>item.version.id===sequenceResult.sequenceVersionId
      )!;
      const priorLinks=await tx.sequenceVersionShot.findMany({
        where:{sequenceVersionId:sequence.version.id},
        orderBy:{position:"asc"},
        include:{shotVersion:true}
      });
      const priorByPosition=new Map(priorLinks.map(link=>[
        link.position,
        link.shotVersion
      ]));

      await tx.sequenceVersionShot.deleteMany({
        where:{sequenceVersionId:sequence.version.id}
      });

      for(let position=0;position<sequenceResult.shots.length;position++){
        const generated=sequenceResult.shots[position]!;
        const prior=priorByPosition.get(position);
        let shotId=prior?.shotId;
        if(!shotId){
          const logical=await tx.shot.create({
            data:{projectId:input.projectId}
          });
          shotId=logical.id;
        }
        if(prior?.lifecycle===VersionLifecycle.DRAFT){
          await tx.shotVersion.update({
            where:{id:prior.id},
            data:{lifecycle:VersionLifecycle.SUPERSEDED}
          });
        }
        const latest=await tx.shotVersion.findFirst({
          where:{shotId},
          orderBy:{versionNumber:"desc"},
          select:{versionNumber:true}
        });
        const node=await tx.domainVersionNode.create({
          data:{kind:DomainVersionKind.SHOT}
        });
        const spec=storyboardShotSpecSchema.parse({
          schemaVersion:1,
          stage:"STORYBOARD",
          sourceSequenceVersionId:sequence.version.id,
          sourceSequenceNodeId:sequence.version.nodeId,
          sourceSequencePosition:sequence.position,
          sourceShotPosition:position,
          beat:generated.beat,
          environment:generated.environment,
          framingIntent:generated.framingIntent,
          cameraIntent:generated.cameraIntent,
          visualIntensity:generated.visualIntensity,
          generationJobId:input.generationJobId
        });
        const version=await tx.shotVersion.create({
          data:{
            shotId,
            nodeId:node.id,
            versionNumber:(latest?.versionNumber??0)+1,
            label:generated.label,
            plannedStartMs:generated.startMs,
            plannedEndMs:generated.endMs,
            dramaticPurpose:generated.dramaticPurpose,
            subject:generated.subject,
            locationDescription:generated.environment,
            action:generated.action,
            composition:generated.framingIntent,
            cameraMotion:generated.cameraIntent,
            continuityNotes:generated.continuityNotes,
            transitionIn:generated.transitionIn,
            transitionOut:generated.transitionOut,
            structuredSpec:toJson(spec),
            createdByUserId:job.requestedByUserId
          }
        });
        const fingerprint=fingerprintJson(toJson({
          label:version.label,
          startMs:version.plannedStartMs,
          endMs:version.plannedEndMs,
          dramaticPurpose:version.dramaticPurpose,
          subject:version.subject,
          action:version.action,
          structuredSpec:spec
        }) as unknown as Prisma.JsonValue);
        await tx.domainVersionNode.update({
          where:{id:node.id},
          data:{fingerprint}
        });
        await registerDependencyEdgeInTransaction(tx,{
          upstreamNodeId:sequence.version.nodeId,
          downstreamNodeId:node.id,
          relation:DependencyRelation.REFERENCES,
          reason:"Storyboard shot is derived from this exact locked SequenceVersion."
        });
        await tx.sequenceVersionShot.create({
          data:{
            sequenceVersionId:sequence.version.id,
            shotVersionId:version.id,
            position
          }
        });
        await tx.generationOutput.create({
          data:{
            jobId:input.generationJobId,
            nodeId:node.id,
            role:"storyboard-shot",
            position:globalPosition++
          }
        });
      }
    }

    const state=await serializeStoryboard(tx,input.projectVersionId);
    await completeAutomaticWizardStepInTransaction(tx,{
      projectVersionId:input.projectVersionId,
      stepKey:"storyboard",
      payload:await storyboardPayload(tx,input.projectVersionId),
      semanticFingerprint:storyboardFingerprint(state)
    });
    return {
      projectVersionId:input.projectVersionId,
      shotCount:state.sequences.reduce(
        (sum,sequence)=>sum+sequence.shots.length,
        0
      )
    };
  },{isolationLevel:Prisma.TransactionIsolationLevel.Serializable});
}

export async function getStoryboardState(input:{
  userId:string;
  projectId:string;
}){
  const projectVersion=await ensureWizardProgress(input);
  const progress=projectVersion.wizardProgress!;
  const sequenceStep=progress.steps.find(step=>step.stepKey==="sequence-map");
  const storyboardStep=progress.steps.find(step=>step.stepKey==="storyboard");
  const sequences=await activeSequences(db,projectVersion.id);
  const state=await serializeStoryboard(db,projectVersion.id);
  const recentJob=await db.generationJob.findFirst({
    where:{
      projectId:input.projectId,
      kind:GenerationKind.TEXT,
      providerKey:{endsWith:":storyboard"}
    },
    orderBy:{createdAt:"desc"},
    select:{
      id:true,
      status:true,
      progressPercent:true,
      progressMessage:true,
      errorMessage:true
    }
  });
  let providerAvailable=false;
  try{providerAvailable=textGenerationAvailable(getEnvironment());}catch{}

  const sourceReady=Boolean(
    sequenceStep?.lockedAt &&
    sequences.length>0 &&
    sequences.every(item=>item.version.lifecycle===VersionLifecycle.LOCKED)
  );
  const activeIds=new Set(sequences.map(item=>item.version.id));
  const storyboardSourceIds=new Set(
    state.sequences
      .filter(sequence=>sequence.shots.length>0)
      .map(sequence=>sequence.sequenceVersionId)
  );

  return {
    sourceReady,
    providerAvailable,
    recentJob,
    storyboard:state,
    needsRegeneration:Boolean(
      sourceReady &&
      (
        storyboardSourceIds.size!==activeIds.size ||
        [...activeIds].some(id=>!storyboardSourceIds.has(id))
      )
    ),
    wizardRevision:progress.revision,
    wizardStatus:storyboardStep?.status??WizardStepStatus.NOT_STARTED,
    wizardLocked:Boolean(storyboardStep?.lockedAt)
  };
}
