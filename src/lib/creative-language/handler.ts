import type { GenerationJob } from "@prisma/client";
import { db } from "@/lib/db";
import { getEnvironment } from "@/lib/env";
import type { GenerationHandlerContext } from "@/lib/jobs/registry";
import { PermanentGenerationError } from "@/lib/jobs/registry";
import { getTextProviderForKey } from "@/lib/text-generation/factory";
import { TextProviderError } from "@/lib/text-generation/types";
import { treatmentDocumentSchema } from "@/lib/treatment/schema";
import { queuedCreativeLanguageGenerationSchema } from "./input";
import { buildCreativeLanguagePrompt } from "./prompt";
import {
  creativeLanguageDocumentSchema,
  creativeLanguageJsonSchema
} from "./schema";
import {
  CreativeLanguageError,
  persistCreativeLanguageGeneration
} from "./service";

export async function handleCreativeLanguageGeneration(
  job: GenerationJob,
  context: GenerationHandlerContext
) {
  const request = queuedCreativeLanguageGenerationSchema.parse(
    job.requestSnapshot
  );
  if (!job.modelKey) {
    throw new PermanentGenerationError(
      "Creative Language job is missing its model snapshot."
    );
  }

  const version = await db.creativeLanguageVersion.findUnique({
    where: { id: request.creativeLanguageVersionId },
    include: {
      creativeLanguage: { include: { project: true } },
      sourceTreatmentVersion: true
    }
  });
  if (!version) {
    throw new PermanentGenerationError(
      "Creative Language version no longer exists."
    );
  }
  if (version.lifecycle !== "DRAFT") {
    throw new PermanentGenerationError(
      "Creative Language version is no longer editable."
    );
  }
  if (
    version.sourceTreatmentVersionId !==
    request.treatmentVersionId
  ) {
    throw new PermanentGenerationError(
      "Creative Language source changed after the job was queued."
    );
  }

  const treatment = treatmentDocumentSchema.parse(
    version.sourceTreatmentVersion.document
  );
  const prompt = buildCreativeLanguagePrompt({
    projectTitle: version.creativeLanguage.project.title,
    treatment,
    direction: request.direction
  });

  await context.reportProgress(
    15,
    "Translating the Treatment into reusable creative rules."
  );

  try {
    const provider = getTextProviderForKey(
      getEnvironment(),
      job.providerKey.replace(/:creative-language$/, "")
    );
    const raw = await provider.generateStructured({
      model: job.modelKey,
      system: prompt.system,
      prompt: prompt.prompt,
      schemaName: "music_video_creative_language",
      jsonSchema:
        creativeLanguageJsonSchema as unknown as Record<
          string,
          unknown
        >,
      maxOutputTokens: 24000,
      signal: context.signal
    });

    await context.reportProgress(
      75,
      "Validating creative-language continuity and exclusions."
    );
    const document = creativeLanguageDocumentSchema.parse(raw);

    await context.reportProgress(
      90,
      "Saving Creative Language and generation provenance."
    );
    return await persistCreativeLanguageGeneration({
      generationJobId: job.id,
      creativeLanguageVersionId:
        request.creativeLanguageVersionId,
      treatmentVersionId: request.treatmentVersionId,
      document
    });
  } catch (error) {
    if (
      (error instanceof TextProviderError && error.permanent) ||
      error instanceof CreativeLanguageError
    ) {
      throw new PermanentGenerationError(error.message);
    }
    throw error;
  }
}
