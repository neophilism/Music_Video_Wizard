import type { GenerationJob } from "@prisma/client";
import { db } from "@/lib/db";
import { creativeLanguageDocumentSchema } from "@/lib/creative-language/schema";
import { getEnvironment } from "@/lib/env";
import type { GenerationHandlerContext } from "@/lib/jobs/registry";
import { PermanentGenerationError } from "@/lib/jobs/registry";
import { sequenceSourceSpecSchema } from "@/lib/sequence-map/schema";
import { storyboardShotSpecSchema } from "@/lib/storyboard/schema";
import { getTextProviderForKey } from "@/lib/text-generation/factory";
import { TextProviderError } from "@/lib/text-generation/types";
import { queuedShotSpecificationsGenerationSchema } from "./input";
import { buildShotSpecificationsPrompt } from "./prompt";
import {
  generatedShotSpecificationsDocumentSchema,
  shotSpecificationCompletionIssues,
  shotSpecificationsJsonSchema
} from "./schema";
import {
  persistShotSpecificationsGeneration,
  ShotSpecificationsError
} from "./service";

export async function handleShotSpecificationsGeneration(
  job:GenerationJob,
  context:GenerationHandlerContext
){
  const request=queuedShotSpecificationsGenerationSchema.parse(
    job.requestSnapshot
  );
  if(!job.modelKey){
    throw new PermanentGenerationError(
      "Shot Specifications job is missing its model snapshot."
    );
  }

  const projectVersion=await db.projectVersion.findUnique({
    where:{id:request.projectVersionId},
    include:{project:true}
  });
  if(!projectVersion||projectVersion.projectId!==request.projectId){
    throw new PermanentGenerationError(
      "Shot Specifications project version no longer exists."
    );
  }

  const creativeLanguage=await db.creativeLanguageVersion.findUnique({
    where:{id:request.sourceCreativeLanguageVersionId}
  });
  if(
    !creativeLanguage ||
    creativeLanguage.lifecycle!=="LOCKED"
  ){
    throw new PermanentGenerationError(
      "Shot Specifications source Creative Language must remain locked."
    );
  }
  const creativeLanguageDocument=creativeLanguageDocumentSchema.parse(
    creativeLanguage.document
  );

  const links=await db.sequenceVersionShot.findMany({
    where:{
      shotVersionId:{in:request.sourceStoryboardShotVersionIds},
      sequenceVersion:{
        projectLinks:{some:{projectVersionId:request.projectVersionId}}
      }
    },
    include:{
      shotVersion:true,
      sequenceVersion:true
    }
  });
  const byShotVersionId=new Map(
    links.map(link=>[link.shotVersionId,link])
  );
  const ordered=request.sourceStoryboardShotVersionIds.map(
    id=>byShotVersionId.get(id)
  );
  if(ordered.some(link=>!link)){
    throw new PermanentGenerationError(
      "A locked Storyboard source ShotVersion no longer belongs to this project version."
    );
  }
  if(
    ordered.some(
      link=>link!.shotVersion.lifecycle!=="LOCKED"
    )
  ){
    throw new PermanentGenerationError(
      "Shot Specifications source Storyboard shots must remain locked."
    );
  }

  const promptShots=ordered.map(link=>{
    const source=link!;
    const storyboardSpec=storyboardShotSpecSchema.parse(
      source.shotVersion.structuredSpec
    );
    const sequenceSpec=sequenceSourceSpecSchema.parse(
      source.sequenceVersion.structuredSpec
    );
    return {
      sourceStoryboardShotVersionId:source.shotVersion.id,
      sourceStoryboardShotNodeId:source.shotVersion.nodeId,
      sequenceTitle:source.sequenceVersion.title,
      sequencePurpose:source.sequenceVersion.purpose,
      sequenceContext:sequenceSpec,
      position:source.position,
      startMs:source.shotVersion.plannedStartMs??0,
      endMs:source.shotVersion.plannedEndMs??0,
      label:source.shotVersion.label??"Storyboard shot",
      dramaticPurpose:source.shotVersion.dramaticPurpose??"",
      beat:storyboardSpec.beat,
      subject:source.shotVersion.subject??"",
      action:source.shotVersion.action??"",
      environment:
        source.shotVersion.locationDescription??storyboardSpec.environment,
      framingIntent:
        source.shotVersion.composition??storyboardSpec.framingIntent,
      cameraIntent:
        source.shotVersion.cameraMotion??storyboardSpec.cameraIntent,
      continuityNotes:source.shotVersion.continuityNotes??"",
      transitionIn:source.shotVersion.transitionIn??"",
      transitionOut:source.shotVersion.transitionOut??"",
      visualIntensity:storyboardSpec.visualIntensity
    };
  });

  const prompt=buildShotSpecificationsPrompt({
    projectTitle:projectVersion.project.title,
    aspectRatio:projectVersion.aspectRatio??"16:9",
    frameRate:projectVersion.frameRate??24,
    creativeLanguage:creativeLanguageDocument,
    shots:promptShots,
    direction:request.direction
  });

  await context.reportProgress(
    15,
    "Compiling locked storyboard shots into reproducible production specifications."
  );

  try{
    const provider=getTextProviderForKey(
      getEnvironment(),
      job.providerKey.replace(/:shot-specifications$/,"")
    );
    const raw=await provider.generateStructured({
      model:job.modelKey,
      system:prompt.system,
      prompt:prompt.prompt,
      schemaName:"music_video_shot_specifications",
      jsonSchema:
        shotSpecificationsJsonSchema as unknown as Record<string,unknown>,
      maxOutputTokens:48000,
      signal:context.signal
    });

    await context.reportProgress(
      75,
      "Validating one-to-one locked Storyboard coverage."
    );
    const document=generatedShotSpecificationsDocumentSchema.parse(raw);
    const issues=shotSpecificationCompletionIssues(
      document,
      request.sourceStoryboardShotVersionIds
    );
    if(issues.length){
      throw new ShotSpecificationsError(issues.join(" "));
    }

    await context.reportProgress(
      90,
      "Saving versioned Shot Specifications and exact provenance."
    );
    return await persistShotSpecificationsGeneration({
      generationJobId:job.id,
      projectId:request.projectId,
      projectVersionId:request.projectVersionId,
      sourceStoryboardShotVersionIds:
        request.sourceStoryboardShotVersionIds,
      sourceCreativeLanguageVersionId:
        request.sourceCreativeLanguageVersionId,
      document
    });
  }catch(error){
    if(
      (error instanceof TextProviderError&&error.permanent) ||
      error instanceof ShotSpecificationsError
    ){
      throw new PermanentGenerationError(error.message);
    }
    throw error;
  }
}
