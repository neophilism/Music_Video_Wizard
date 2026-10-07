import type { GenerationJob } from "@prisma/client";
import { db } from "@/lib/db";
import { getEnvironment } from "@/lib/env";
import type { GenerationHandlerContext } from "@/lib/jobs/registry";
import { PermanentGenerationError } from "@/lib/jobs/registry";
import { getTextProviderForKey } from "@/lib/text-generation/factory";
import { TextProviderError } from "@/lib/text-generation/types";
import { conceptContentSchema } from "@/lib/concepts/schema";
import { creativeBriefDraftSchema } from "@/lib/creative-brief/input";
import { queuedTreatmentGenerationSchema } from "./input";
import { buildTreatmentPrompt } from "./prompt";
import { treatmentCompletionIssues, treatmentDocumentSchema, treatmentJsonSchema } from "./schema";
import { persistTreatmentGeneration, TreatmentError } from "./service";

export async function handleTreatmentGeneration(
  job: GenerationJob,
  context: GenerationHandlerContext
) {
  const request = queuedTreatmentGenerationSchema.parse(job.requestSnapshot);
  if (!job.modelKey) {
    throw new PermanentGenerationError("Treatment job is missing its model snapshot.");
  }

  const version = await db.treatmentVersion.findUnique({
    where: { id: request.treatmentVersionId },
    include: {
      treatment: { include: { project: true } },
      sourceConcept: true,
      sourceConceptSetVersion: {
        include: {
          sourceCreativeBriefVersion: {
            include: {
              sourceMusicMapVersion: {
                include: {
                  anchors: {
                    where: { decision: "ACCEPTED" },
                    orderBy: [{ startMs: "asc" }, { position: "asc" }]
                  }
                }
              }
            }
          }
        }
      }
    }
  });
  if (!version) throw new PermanentGenerationError("Treatment version no longer exists.");
  if (version.lifecycle !== "DRAFT") {
    throw new PermanentGenerationError("Treatment version is no longer editable.");
  }
  if (
    version.sourceConceptSetVersionId !== request.conceptSetVersionId ||
    version.sourceConceptId !== request.conceptId
  ) {
    throw new PermanentGenerationError("Treatment source changed after the job was queued.");
  }

  const map = version.sourceConceptSetVersion.sourceCreativeBriefVersion.sourceMusicMapVersion;
  const prompt = buildTreatmentPrompt({
    projectTitle: version.treatment.project.title,
    concept: conceptContentSchema.parse(version.sourceConcept.content),
    creativeBrief: creativeBriefDraftSchema.parse(
      version.sourceConceptSetVersion.sourceCreativeBriefVersion.brief
    ),
    durationMs: map.durationMs,
    anchors: map.anchors.map((anchor) => ({
      label: anchor.label,
      kind: anchor.kind,
      startMs: anchor.startMs,
      endMs: anchor.endMs
    })),
    direction: request.direction
  });

  await context.reportProgress(15, "Expanding the selected concept into a song-mapped treatment.");

  try {
    const provider = getTextProviderForKey(
      getEnvironment(),
      job.providerKey.replace(/:treatment$/, "")
    );
    const raw = await provider.generateStructured({
      model: job.modelKey,
      system: prompt.system,
      prompt: prompt.prompt,
      schemaName: "music_video_treatment",
      jsonSchema: treatmentJsonSchema as unknown as Record<string, unknown>,
      maxOutputTokens: 24000,
      signal: context.signal
    });

    await context.reportProgress(75, "Validating treatment structure and timing.");
    const treatment = treatmentDocumentSchema.parse(raw);
    const issues = treatmentCompletionIssues(treatment, map.durationMs);
    if (issues.length) {
      throw new TreatmentError(issues.join(" "));
    }

    await context.reportProgress(90, "Saving the treatment and provenance.");
    return await persistTreatmentGeneration({
      generationJobId: job.id,
      treatmentVersionId: request.treatmentVersionId,
      conceptSetVersionId: request.conceptSetVersionId,
      conceptId: request.conceptId,
      treatment
    });
  } catch (error) {
    if (
      (error instanceof TextProviderError && error.permanent) ||
      error instanceof TreatmentError
    ) {
      throw new PermanentGenerationError(error.message);
    }
    throw error;
  }
}
