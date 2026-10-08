import type { GenerationJob } from "@prisma/client";
import { db } from "@/lib/db";
import { getEnvironment } from "@/lib/env";
import type { GenerationHandlerContext } from "@/lib/jobs/registry";
import { PermanentGenerationError } from "@/lib/jobs/registry";
import { sequenceSourceSpecSchema } from "@/lib/sequence-map/schema";
import { getTextProviderForKey } from "@/lib/text-generation/factory";
import { TextProviderError } from "@/lib/text-generation/types";
import { queuedStoryboardShotRegenerationSchema } from "./input";
import { buildStoryboardShotRegenerationPrompt } from "./shot-prompt";
import {
  storyboardShotJsonSchema,
  storyboardShotSchema,
  storyboardShotSpecSchema,
  type StoryboardShot
} from "./schema";
import {
  persistStoryboardShotRegeneration,
  StoryboardError
} from "./service";

function shotDocument(input:{
  label:string|null;
  plannedStartMs:number|null;
  plannedEndMs:number|null;
  dramaticPurpose:string|null;
  subject:string|null;
  action:string|null;
  locationDescription:string|null;
  composition:string|null;
  cameraMotion:string|null;
  continuityNotes:string|null;
  transitionIn:string|null;
  transitionOut:string|null;
  structuredSpec:unknown;
}):StoryboardShot{
  const spec=storyboardShotSpecSchema.parse(input.structuredSpec);
  return storyboardShotSchema.parse({
    label:input.label??"Storyboard shot",
    startMs:input.plannedStartMs??0,
    endMs:input.plannedEndMs??0,
    dramaticPurpose:input.dramaticPurpose??"",
    beat:spec.beat,
    subject:input.subject??"",
    action:input.action??"",
    environment:input.locationDescription??spec.environment,
    framingIntent:input.composition??spec.framingIntent,
    cameraIntent:input.cameraMotion??spec.cameraIntent,
    continuityNotes:input.continuityNotes??"",
    transitionIn:input.transitionIn??"",
    transitionOut:input.transitionOut??"",
    visualIntensity:spec.visualIntensity
  });
}

export async function handleStoryboardShotRegeneration(
  job:GenerationJob,
  context:GenerationHandlerContext
){
  const request=queuedStoryboardShotRegenerationSchema.parse(job.requestSnapshot);
  if(!job.modelKey){
    throw new PermanentGenerationError(
      "Storyboard-shot job is missing its model snapshot."
    );
  }

  const sequence=await db.sequenceVersion.findUnique({
    where:{id:request.sequenceVersionId},
    include:{
      sequence:{include:{project:true}},
      shotLinks:{
        orderBy:{position:"asc"},
        include:{shotVersion:true}
      }
    }
  });
  if(!sequence){
    throw new PermanentGenerationError("Storyboard source sequence no longer exists.");
  }
  if(sequence.lifecycle!=="LOCKED"){
    throw new PermanentGenerationError("Storyboard source sequence is no longer locked.");
  }
  const index=sequence.shotLinks.findIndex(
    link=>link.shotVersionId===request.shotVersionId
  );
  if(index<0){
    throw new PermanentGenerationError(
      "Selected storyboard shot is no longer active."
    );
  }
  const current=shotDocument(sequence.shotLinks[index]!.shotVersion);
  const previous=index>0
    ? shotDocument(sequence.shotLinks[index-1]!.shotVersion)
    : null;
  const next=index<sequence.shotLinks.length-1
    ? shotDocument(sequence.shotLinks[index+1]!.shotVersion)
    : null;
  const source=sequenceSourceSpecSchema.parse(sequence.structuredSpec);

  const prompt=buildStoryboardShotRegenerationPrompt({
    projectTitle:sequence.sequence.project.title,
    sequence:{
      title:sequence.title,
      startMs:sequence.musicStartMs??0,
      endMs:sequence.musicEndMs??0,
      purpose:sequence.purpose,
      sourceContext:{
        dramaticPurpose:source.dramaticPurpose,
        pictureState:source.pictureState,
        narrativeState:source.narrativeState,
        characterState:source.characterState,
        performanceMode:source.performanceMode,
        worldState:source.worldState,
        motifState:source.motifState,
        creativeLanguageApplication:source.creativeLanguageApplication,
        cameraAndMotionIntent:source.cameraAndMotionIntent,
        editingRhythm:source.editingRhythm
      }
    },
    current,
    previous,
    next,
    direction:request.direction
  });

  await context.reportProgress(
    20,
    "Revising the selected storyboard shot while preserving exact timing."
  );

  try{
    const provider=getTextProviderForKey(
      getEnvironment(),
      job.providerKey.replace(/:storyboard-shot$/,"")
    );
    const raw=await provider.generateStructured({
      model:job.modelKey,
      system:prompt.system,
      prompt:prompt.prompt,
      schemaName:"music_video_storyboard_shot",
      jsonSchema:storyboardShotJsonSchema as unknown as Record<string,unknown>,
      maxOutputTokens:6000,
      signal:context.signal
    });
    const revised=storyboardShotSchema.parse(raw);
    if(revised.startMs!==current.startMs||revised.endMs!==current.endMs){
      throw new StoryboardError(
        "Targeted storyboard regeneration changed protected shot timing."
      );
    }

    await context.reportProgress(85,"Saving the regenerated ShotVersion.");
    return await persistStoryboardShotRegeneration({
      generationJobId:job.id,
      storyboardShot:revised
    });
  }catch(error){
    if(
      (error instanceof TextProviderError&&error.permanent) ||
      error instanceof StoryboardError
    ){
      throw new PermanentGenerationError(error.message);
    }
    throw error;
  }
}
