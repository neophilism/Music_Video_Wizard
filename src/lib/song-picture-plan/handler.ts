import type { GenerationJob } from "@prisma/client";
import { MusicMapAnchorDecision } from "@prisma/client";
import { db } from "@/lib/db";
import { getEnvironment } from "@/lib/env";
import type { GenerationHandlerContext } from "@/lib/jobs/registry";
import { PermanentGenerationError } from "@/lib/jobs/registry";
import { getTextProviderForKey } from "@/lib/text-generation/factory";
import { TextProviderError } from "@/lib/text-generation/types";
import { creativeLanguageDocumentSchema } from "@/lib/creative-language/schema";
import { treatmentDocumentSchema } from "@/lib/treatment/schema";
import { queuedSongPicturePlanGenerationSchema } from "./input";
import { buildSongPicturePlanPrompt } from "./prompt";
import {
  songPicturePlanDocumentSchema,
  songPicturePlanJsonSchema
} from "./schema";
import {
  persistSongPicturePlanGeneration,
  SongPicturePlanError
} from "./service";

export async function handleSongPicturePlanGeneration(
  job: GenerationJob,
  context: GenerationHandlerContext
) {
  const request=queuedSongPicturePlanGenerationSchema.parse(job.requestSnapshot);
  if(!job.modelKey) throw new PermanentGenerationError("Song-to-Picture job is missing its model snapshot.");

  const version=await db.songPicturePlanVersion.findUnique({
    where:{id:request.songPicturePlanVersionId},
    include:{
      songPicturePlan:{include:{project:true}},
      sourceTreatmentVersion:true,
      sourceCreativeLanguageVersion:true,
      sourceMusicMapVersion:{
        include:{
          anchors:{
            where:{decision:MusicMapAnchorDecision.ACCEPTED},
            orderBy:[{startMs:"asc"},{position:"asc"}]
          }
        }
      }
    }
  });
  if(!version) throw new PermanentGenerationError("Song-to-Picture Plan version no longer exists.");
  if(version.lifecycle!=="DRAFT") throw new PermanentGenerationError("Song-to-Picture Plan is no longer editable.");
  if(
    version.sourceTreatmentVersionId!==request.treatmentVersionId||
    version.sourceCreativeLanguageVersionId!==request.creativeLanguageVersionId||
    version.sourceMusicMapVersionId!==request.musicMapVersionId
  ) throw new PermanentGenerationError("Song-to-Picture sources changed after the job was queued.");

  const treatment=treatmentDocumentSchema.parse(version.sourceTreatmentVersion.document);
  const language=creativeLanguageDocumentSchema.parse(version.sourceCreativeLanguageVersion.document);
  const map=version.sourceMusicMapVersion;
  const prompt=buildSongPicturePlanPrompt({
    projectTitle:version.songPicturePlan.project.title,
    treatment,
    creativeLanguage:language,
    musicMap:{
      durationMs:map.durationMs,
      tempoBpm:map.tempoBpm,
      meter:map.meterNumerator+"/"+map.meterDenominator,
      anchors:map.anchors.map(a=>({
        id:a.id,kind:a.kind,label:a.label,startMs:a.startMs,endMs:a.endMs
      }))
    },
    direction:request.direction
  });

  await context.reportProgress(15,"Mapping the Treatment and Creative Language across the song.");
  try{
    const provider=getTextProviderForKey(
      getEnvironment(),
      job.providerKey.replace(/:song-picture-plan$/,"")
    );
    const raw=await provider.generateStructured({
      model:job.modelKey,
      system:prompt.system,
      prompt:prompt.prompt,
      schemaName:"music_video_song_picture_plan",
      jsonSchema:songPicturePlanJsonSchema as unknown as Record<string,unknown>,
      maxOutputTokens:24000,
      signal:context.signal
    });
    await context.reportProgress(75,"Validating full-song passage coverage and source references.");
    const document=songPicturePlanDocumentSchema.parse(raw);
    await context.reportProgress(90,"Saving Song-to-Picture Plan and provenance.");
    return await persistSongPicturePlanGeneration({
      generationJobId:job.id,
      songPicturePlanVersionId:request.songPicturePlanVersionId,
      treatmentVersionId:request.treatmentVersionId,
      creativeLanguageVersionId:request.creativeLanguageVersionId,
      musicMapVersionId:request.musicMapVersionId,
      document
    });
  }catch(error){
    if((error instanceof TextProviderError&&error.permanent)||error instanceof SongPicturePlanError){
      throw new PermanentGenerationError(error.message);
    }
    throw error;
  }
}
