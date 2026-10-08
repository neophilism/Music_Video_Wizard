import type { GenerationJob } from "@prisma/client";
import { db } from "@/lib/db";
import { getEnvironment } from "@/lib/env";
import type { GenerationHandlerContext } from "@/lib/jobs/registry";
import { PermanentGenerationError } from "@/lib/jobs/registry";
import { sequenceSourceSpecSchema } from "@/lib/sequence-map/schema";
import { getTextProviderForKey } from "@/lib/text-generation/factory";
import { TextProviderError } from "@/lib/text-generation/types";
import { queuedStoryboardGenerationSchema } from "./input";
import { buildStoryboardPrompt } from "./prompt";
import {
  storyboardCompletionIssues,
  storyboardDocumentSchema,
  storyboardJsonSchema
} from "./schema";
import {
  persistStoryboardGeneration,
  StoryboardError
} from "./service";

export async function handleStoryboardGeneration(
  job:GenerationJob,
  context:GenerationHandlerContext
){
  const request=queuedStoryboardGenerationSchema.parse(job.requestSnapshot);
  if(!job.modelKey){
    throw new PermanentGenerationError(
      "Storyboard job is missing its model snapshot."
    );
  }

  const project=await db.project.findUnique({
    where:{id:request.projectId},
    select:{title:true}
  });
  if(!project) throw new PermanentGenerationError("Storyboard project no longer exists.");

  const versions=await db.sequenceVersion.findMany({
    where:{id:{in:request.sequenceVersionIds}},
    include:{sequence:true}
  });
  const byId=new Map(versions.map(version=>[version.id,version]));
  const sequences=request.sequenceVersionIds.map(id=>byId.get(id));
  if(sequences.some(sequence=>!sequence)){
    throw new PermanentGenerationError(
      "A storyboard source SequenceVersion no longer exists."
    );
  }
  if(sequences.some(sequence=>sequence!.lifecycle!=="LOCKED")){
    throw new PermanentGenerationError(
      "Storyboard source sequences must remain locked."
    );
  }

  const promptSequences=sequences.map(sequence=>{
    const version=sequence!;
    const spec=sequenceSourceSpecSchema.parse(version.structuredSpec);
    return {
      sequenceVersionId:version.id,
      title:version.title,
      summary:version.summary,
      purpose:version.purpose,
      startMs:version.musicStartMs??0,
      endMs:version.musicEndMs??0,
      targetShotCount:spec.targetShotCount,
      planningNotes:spec.planningNotes,
      source:spec
    };
  });

  const prompt=buildStoryboardPrompt({
    projectTitle:project.title,
    sequences:promptSequences,
    direction:request.direction
  });

  await context.reportProgress(
    15,
    "Designing complete timed storyboard beats across locked sequences."
  );

  try{
    const provider=getTextProviderForKey(
      getEnvironment(),
      job.providerKey.replace(/:storyboard$/,"")
    );
    const raw=await provider.generateStructured({
      model:job.modelKey,
      system:prompt.system,
      prompt:prompt.prompt,
      schemaName:"music_video_storyboard",
      jsonSchema:storyboardJsonSchema as unknown as Record<string,unknown>,
      maxOutputTokens:32000,
      signal:context.signal
    });

    await context.reportProgress(
      75,
      "Validating storyboard timing, sequence coverage and shot counts."
    );
    const storyboard=storyboardDocumentSchema.parse(raw);
    const issues=storyboardCompletionIssues(
      storyboard,
      promptSequences.map(sequence=>({
        sequenceVersionId:sequence.sequenceVersionId,
        startMs:sequence.startMs,
        endMs:sequence.endMs,
        targetShotCount:sequence.targetShotCount
      }))
    );
    if(issues.length) throw new StoryboardError(issues.join(" "));

    await context.reportProgress(
      90,
      "Materializing storyboard beats into versioned shots."
    );
    return await persistStoryboardGeneration({
      generationJobId:job.id,
      projectId:request.projectId,
      projectVersionId:request.projectVersionId,
      sequenceVersionIds:request.sequenceVersionIds,
      storyboard
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
