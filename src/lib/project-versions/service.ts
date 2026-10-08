import {
  DependencyRelation,
  DomainVersionKind,
  Prisma,
  VersionLifecycle,
  WizardStepStatus
} from "@prisma/client";
import { db } from "@/lib/db";
import { fingerprintJson } from "@/lib/dependency-graph/fingerprint";
import { registerDependencyEdgeInTransaction } from "@/lib/dependency-graph/service";
import {
  WIZARD_STEPS,
  requireWizardStepDefinition
} from "@/lib/wizard/registry";

export class ProjectVersionBranchError extends Error{}

function toJson(value:unknown):Prisma.InputJsonValue{
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

function jsonData(value:Prisma.JsonValue|null){
  return value===null?undefined:toJson(value);
}

async function authorizedProject(input:{
  userId:string;
  projectId:string;
}){
  const project=await db.project.findFirst({
    where:{
      id:input.projectId,
      archivedAt:null,
      workspace:{
        memberships:{
          some:{userId:input.userId}
        }
      }
    },
    select:{
      id:true,
      activeProjectVersionId:true
    }
  });
  if(!project){
    throw new ProjectVersionBranchError("Project not found.");
  }
  return project;
}

async function cloneSequenceVersionForStoryboard(
  tx:Prisma.TransactionClient,
  input:{
    source:{
      id:string;
      sequenceId:string;
      nodeId:string;
      lifecycle:VersionLifecycle;
      title:string;
      summary:string|null;
      purpose:string|null;
      musicStartMs:number|null;
      musicEndMs:number|null;
      structuredSpec:Prisma.JsonValue|null;
      lockedAt:Date|null;
    };
    userId:string;
  }
){
  const latest=await tx.sequenceVersion.findFirst({
    where:{sequenceId:input.source.sequenceId},
    orderBy:{versionNumber:"desc"},
    select:{versionNumber:true}
  });
  const node=await tx.domainVersionNode.create({
    data:{kind:DomainVersionKind.SEQUENCE}
  });
  const version=await tx.sequenceVersion.create({
    data:{
      sequenceId:input.source.sequenceId,
      nodeId:node.id,
      versionNumber:(latest?.versionNumber??0)+1,
      lifecycle:input.source.lifecycle,
      title:input.source.title,
      summary:input.source.summary,
      purpose:input.source.purpose,
      musicStartMs:input.source.musicStartMs,
      musicEndMs:input.source.musicEndMs,
      structuredSpec:jsonData(input.source.structuredSpec),
      createdByUserId:input.userId,
      lockedAt:input.source.lockedAt
    }
  });
  await registerDependencyEdgeInTransaction(tx,{
    upstreamNodeId:input.source.nodeId,
    downstreamNodeId:node.id,
    relation:DependencyRelation.DERIVED_FROM,
    reason:
      "Storyboard branch clones this locked SequenceVersion so branch shot links remain isolated."
  });
  return version;
}

export async function listProjectVersionBranches(input:{
  userId:string;
  projectId:string;
}){
  const project=await authorizedProject(input);
  const versions=await db.projectVersion.findMany({
    where:{projectId:input.projectId},
    orderBy:{versionNumber:"asc"},
    include:{
      parent:{
        select:{
          id:true,
          versionNumber:true,
          branchName:true
        }
      },
      wizardProgress:{
        include:{
          steps:{orderBy:{ordinal:"asc"}}
        }
      }
    }
  });

  return {
    activeProjectVersionId:project.activeProjectVersionId,
    versions:versions.map(version=>({
      id:version.id,
      versionNumber:version.versionNumber,
      branchName:
        version.branchName?.trim()||
        (version.versionNumber===1?"Main":"Version "+version.versionNumber),
      branchForkStepKey:version.branchForkStepKey,
      parentProjectVersionId:version.parentProjectVersionId,
      parent:version.parent
        ?{
          id:version.parent.id,
          versionNumber:version.parent.versionNumber,
          branchName:
            version.parent.branchName?.trim()||
            "Version "+version.parent.versionNumber
        }
        :null,
      lifecycle:version.lifecycle,
      createdAt:version.createdAt,
      active:version.id===project.activeProjectVersionId,
      currentStepKey:version.wizardProgress?.currentStepKey??null,
      completedSteps:
        version.wizardProgress?.steps.filter(
          step=>step.status===WizardStepStatus.COMPLETED
        ).length??0,
      lockedSteps:
        version.wizardProgress?.steps.filter(
          step=>Boolean(step.lockedAt)
        ).length??0
    }))
  };
}

export async function switchProjectVersionBranch(input:{
  userId:string;
  projectId:string;
  projectVersionId:string;
}){
  await authorizedProject(input);
  const version=await db.projectVersion.findFirst({
    where:{
      id:input.projectVersionId,
      projectId:input.projectId
    },
    select:{id:true,versionNumber:true,branchName:true}
  });
  if(!version){
    throw new ProjectVersionBranchError(
      "Selected ProjectVersion does not belong to this project."
    );
  }
  await db.project.update({
    where:{id:input.projectId},
    data:{activeProjectVersionId:version.id}
  });
  return {
    projectVersionId:version.id,
    versionNumber:version.versionNumber,
    branchName:
      version.branchName?.trim()||
      "Version "+version.versionNumber
  };
}

export async function forkProjectVersionBranch(input:{
  userId:string;
  projectId:string;
  sourceProjectVersionId?:string;
  branchName:string;
  forkStepKey:string;
}){
  const project=await authorizedProject(input);
  const forkStep=requireWizardStepDefinition(input.forkStepKey);
  if(forkStep.key==="project-setup"){
    throw new ProjectVersionBranchError(
      "Branch after Project setup; Project setup itself is the shared project identity and delivery boundary."
    );
  }

  return db.$transaction(async tx=>{
    const sourceId=
      input.sourceProjectVersionId??
      project.activeProjectVersionId??
      (
        await tx.projectVersion.findFirst({
          where:{projectId:input.projectId},
          orderBy:{versionNumber:"desc"},
          select:{id:true}
        })
      )?.id;
    if(!sourceId){
      throw new ProjectVersionBranchError("Source ProjectVersion not found.");
    }

    const source=await tx.projectVersion.findFirst({
      where:{
        id:sourceId,
        projectId:input.projectId,
        project:{
          archivedAt:null,
          workspace:{
            memberships:{some:{userId:input.userId}}
          }
        }
      },
      include:{
        wizardProgress:{
          include:{
            steps:{orderBy:{ordinal:"asc"}}
          }
        },
        sequences:{
          orderBy:{position:"asc"},
          include:{sequenceVersion:true}
        }
      }
    });
    if(!source||!source.wizardProgress){
      throw new ProjectVersionBranchError(
        "Source branch has no initialized wizard state."
      );
    }

    const duplicate=await tx.projectVersion.findFirst({
      where:{
        projectId:input.projectId,
        branchName:{
          equals:input.branchName.trim(),
          mode:"insensitive"
        }
      },
      select:{id:true}
    });
    if(duplicate){
      throw new ProjectVersionBranchError(
        "A branch with that name already exists."
      );
    }

    const upstreamDefinitions=WIZARD_STEPS.filter(
      step=>step.ordinal<forkStep.ordinal
    );
    for(const definition of upstreamDefinitions){
      const state=source.wizardProgress.steps.find(
        step=>step.stepKey===definition.key
      );
      if(!state?.lockedAt){
        throw new ProjectVersionBranchError(
          'Lock upstream step "'+definition.title+
          '" before forking at '+forkStep.title+"."
        );
      }
    }

    const latest=await tx.projectVersion.findFirst({
      where:{projectId:input.projectId},
      orderBy:{versionNumber:"desc"},
      select:{versionNumber:true}
    });
    const node=await tx.domainVersionNode.create({
      data:{kind:DomainVersionKind.PROJECT}
    });
    const upstreamFingerprints=upstreamDefinitions.map(definition=>{
      const state=source.wizardProgress!.steps.find(
        step=>step.stepKey===definition.key
      );
      return {
        stepKey:definition.key,
        fingerprint:state?.payloadFingerprint??null
      };
    });
    const branchFingerprint=fingerprintJson(
      toJson({
        parentProjectVersionId:source.id,
        forkStepKey:forkStep.key,
        title:source.title,
        description:source.description,
        aspectRatio:source.aspectRatio,
        outputWidth:source.outputWidth,
        outputHeight:source.outputHeight,
        frameRate:source.frameRate,
        audioMasterAssetVersionId:source.audioMasterAssetVersionId,
        upstreamFingerprints
      }) as unknown as Prisma.JsonValue
    );
    await tx.domainVersionNode.update({
      where:{id:node.id},
      data:{fingerprint:branchFingerprint}
    });

    const version=await tx.projectVersion.create({
      data:{
        projectId:input.projectId,
        nodeId:node.id,
        parentProjectVersionId:source.id,
        branchName:input.branchName.trim(),
        branchForkStepKey:forkStep.key,
        versionNumber:(latest?.versionNumber??0)+1,
        lifecycle:VersionLifecycle.DRAFT,
        title:source.title,
        description:source.description,
        aspectRatio:source.aspectRatio,
        outputWidth:source.outputWidth,
        outputHeight:source.outputHeight,
        frameRate:source.frameRate,
        audioMasterAssetVersionId:source.audioMasterAssetVersionId,
        specification:jsonData(source.specification),
        notes:
          "Forked from ProjectVersion v"+
          source.versionNumber+" at "+forkStep.title+".",
        createdByUserId:input.userId
      }
    });

    await registerDependencyEdgeInTransaction(tx,{
      upstreamNodeId:source.nodeId,
      downstreamNodeId:node.id,
      relation:DependencyRelation.DERIVED_FROM,
      reason:
        "ProjectVersion branch derives from this exact parent ProjectVersion."
    });
    if(source.audioMasterAssetVersionId){
      const audio=await tx.assetVersion.findUnique({
        where:{id:source.audioMasterAssetVersionId},
        select:{nodeId:true}
      });
      if(audio){
        await registerDependencyEdgeInTransaction(tx,{
          upstreamNodeId:audio.nodeId,
          downstreamNodeId:node.id,
          relation:DependencyRelation.REFERENCES,
          reason:
            "ProjectVersion branch pins the same immutable audio master."
        });
      }
    }

    const sourceSteps=source.wizardProgress.steps;
    await tx.wizardProgress.create({
      data:{
        projectVersionId:version.id,
        currentStepKey:forkStep.key,
        revision:0,
        steps:{
          create:WIZARD_STEPS.map(definition=>{
            const original=sourceSteps.find(
              step=>step.stepKey===definition.key
            );
            if(definition.ordinal<forkStep.ordinal){
              if(!original){
                throw new ProjectVersionBranchError(
                  "Source branch is missing upstream wizard state."
                );
              }
              return {
                stepKey:definition.key,
                ordinal:definition.ordinal,
                status:original.status,
                payload:
                  original.payload===null
                    ?undefined
                    :toJson(original.payload),
                payloadFingerprint:original.payloadFingerprint,
                contentRevision:original.contentRevision,
                lastSavedAt:original.lastSavedAt,
                completedAt:original.completedAt,
                lockedAt:original.lockedAt,
                needsReviewAt:original.needsReviewAt,
                reviewReason:original.reviewReason
              };
            }
            return {
              stepKey:definition.key,
              ordinal:definition.ordinal,
              status:WizardStepStatus.NOT_STARTED,
              contentRevision:0
            };
          })
        }
      }
    });

    if(forkStep.ordinal>80){
      if(source.sequences.length){
        await tx.projectVersionSequence.createMany({
          data:source.sequences.map(link=>({
            projectVersionId:version.id,
            sequenceVersionId:link.sequenceVersionId,
            position:link.position
          }))
        });
      }
    }else if(forkStep.key==="storyboard"){
      for(const link of source.sequences){
        const cloned=await cloneSequenceVersionForStoryboard(tx,{
          source:link.sequenceVersion,
          userId:input.userId
        });
        await tx.projectVersionSequence.create({
          data:{
            projectVersionId:version.id,
            sequenceVersionId:cloned.id,
            position:link.position
          }
        });
      }
    }

    await tx.project.update({
      where:{id:input.projectId},
      data:{activeProjectVersionId:version.id}
    });

    return {
      projectVersionId:version.id,
      versionNumber:version.versionNumber,
      branchName:version.branchName!,
      forkStepKey:forkStep.key,
      parentProjectVersionId:source.id
    };
  },{isolationLevel:Prisma.TransactionIsolationLevel.Serializable});
}

export async function compareProjectVersions(input:{
  userId:string;
  projectId:string;
  leftProjectVersionId:string;
  rightProjectVersionId:string;
}){
  await authorizedProject(input);
  const versions=await db.projectVersion.findMany({
    where:{
      projectId:input.projectId,
      id:{
        in:[
          input.leftProjectVersionId,
          input.rightProjectVersionId
        ]
      }
    },
    include:{
      wizardProgress:{
        include:{
          steps:{orderBy:{ordinal:"asc"}}
        }
      },
      sequences:{
        orderBy:{position:"asc"},
        include:{
          sequenceVersion:{
            include:{node:true}
          }
        }
      }
    }
  });
  const left=versions.find(
    version=>version.id===input.leftProjectVersionId
  );
  const right=versions.find(
    version=>version.id===input.rightProjectVersionId
  );
  if(!left||!right){
    throw new ProjectVersionBranchError(
      "Both comparison versions must belong to this project."
    );
  }

  const stepRows=WIZARD_STEPS.map(definition=>{
    const leftState=left.wizardProgress?.steps.find(
      step=>step.stepKey===definition.key
    )??null;
    const rightState=right.wizardProgress?.steps.find(
      step=>step.stepKey===definition.key
    )??null;
    return {
      stepKey:definition.key,
      title:definition.title,
      ordinal:definition.ordinal,
      sameFingerprint:Boolean(
        leftState?.payloadFingerprint&&
        leftState.payloadFingerprint===rightState?.payloadFingerprint
      )||(
        !leftState?.payloadFingerprint&&
        !rightState?.payloadFingerprint
      ),
      left:leftState
        ?{
          status:leftState.status,
          locked:Boolean(leftState.lockedAt),
          fingerprint:leftState.payloadFingerprint,
          contentRevision:leftState.contentRevision,
          payload:leftState.payload
        }
        :null,
      right:rightState
        ?{
          status:rightState.status,
          locked:Boolean(rightState.lockedAt),
          fingerprint:rightState.payloadFingerprint,
          contentRevision:rightState.contentRevision,
          payload:rightState.payload
        }
        :null
    };
  });

  const configKeys=[
    "title",
    "description",
    "aspectRatio",
    "outputWidth",
    "outputHeight",
    "frameRate",
    "audioMasterAssetVersionId"
  ] as const;
  const configuration=configKeys.map(key=>({
    key,
    left:left[key],
    right:right[key],
    same:left[key]===right[key]
  }));

  const sequenceRows=Math.max(
    left.sequences.length,
    right.sequences.length
  );
  const sequences=Array.from({length:sequenceRows},(_,position)=>{
    const l=left.sequences[position]?.sequenceVersion??null;
    const r=right.sequences[position]?.sequenceVersion??null;
    return {
      position,
      sameNode:Boolean(l&&r&&l.nodeId===r.nodeId),
      sameFingerprint:Boolean(
        l?.node.fingerprint&&
        l.node.fingerprint===r?.node.fingerprint
      ),
      left:l
        ?{
          id:l.id,
          nodeId:l.nodeId,
          versionNumber:l.versionNumber,
          title:l.title,
          fingerprint:l.node.fingerprint
        }
        :null,
      right:r
        ?{
          id:r.id,
          nodeId:r.nodeId,
          versionNumber:r.versionNumber,
          title:r.title,
          fingerprint:r.node.fingerprint
        }
        :null
    };
  });

  function summary(version:typeof left){
    return {
      id:version.id,
      versionNumber:version.versionNumber,
      branchName:
        version.branchName?.trim()||
        "Version "+version.versionNumber,
      branchForkStepKey:version.branchForkStepKey,
      parentProjectVersionId:version.parentProjectVersionId,
      lifecycle:version.lifecycle,
      createdAt:version.createdAt
    };
  }

  return {
    left:summary(left),
    right:summary(right),
    configuration,
    steps:stepRows,
    sequences
  };
}
