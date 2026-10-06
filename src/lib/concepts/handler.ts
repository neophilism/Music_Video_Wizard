import type { GenerationJob } from "@prisma/client";
import { db } from "@/lib/db";
import { getEnvironment } from "@/lib/env";
import {
  PermanentGenerationError,
  type GenerationHandlerContext
} from "@/lib/jobs/registry";
import {
  getTextProviderForKey
} from "@/lib/text-generation/factory";
import { TextProviderError } from "@/lib/text-generation/types";
import {
  conceptContentSchema,
  conceptEnvelopeJsonSchema,
  conceptEnvelopeSchema
} from "./schema";
import {
  queuedConceptGenerationSchema
} from "./input";
import { buildConceptPrompt } from "./prompt";
import { persistConceptGeneration } from "./service";
import { creativeBriefDraftSchema } from "@/lib/creative-brief/input";

export async function handleConceptGeneration(
  job: GenerationJob,
  context: GenerationHandlerContext
) {
  const request = queuedConceptGenerationSchema.parse(
    job.requestSnapshot
  );
  if (!job.modelKey) {
    throw new PermanentGenerationError(
      "Concept-generation job is missing its model snapshot."
    );
  }

  const set = await db.conceptSetVersion.findUnique({
    where: { id: request.conceptSetVersionId },
    include: {
      conceptSet: {
        include: {
          project: {
            select: { title: true }
          }
        }
      },
      sourceCreativeBriefVersion: {
        include: {
          sourceMusicMapVersion: {
            include: {
              anchors: {
                where: { decision: "ACCEPTED" },
                orderBy: [
                  { startMs: "asc" },
                  { position: "asc" }
                ],
                select: {
                  kind: true,
                  label: true,
                  startMs: true,
                  endMs: true
                }
              }
            }
          }
        }
      }
    }
  });
  if (!set) {
    throw new PermanentGenerationError(
      "Concept set version no longer exists."
    );
  }
  if (set.lifecycle !== "DRAFT") {
    throw new PermanentGenerationError(
      "Concept set is no longer editable."
    );
  }
  if (
    set.sourceCreativeBriefVersionId !==
    request.creativeBriefVersionId
  ) {
    throw new PermanentGenerationError(
      "Concept job no longer matches the pinned Creative Brief."
    );
  }

  const parents = request.parentConceptIds.length
    ? await db.conceptOption.findMany({
        where: {
          id: { in: request.parentConceptIds },
          conceptSetVersionId: set.id
        },
        orderBy: { position: "asc" },
        select: { id: true, content: true }
      })
    : [];

  if (parents.length !== request.parentConceptIds.length) {
    throw new PermanentGenerationError(
      "One or more source concepts are unavailable."
    );
  }

  const brief = creativeBriefDraftSchema.parse(
    set.sourceCreativeBriefVersion.brief
  );
  const map =
    set.sourceCreativeBriefVersion.sourceMusicMapVersion;

  const prompt = buildConceptPrompt({
    operation: request.operation,
    count: request.count,
    direction: request.direction,
    parents: request.parentConceptIds.map((parentId) => {
      const parent = parents.find((item) => item.id === parentId);
      if (!parent) {
        throw new PermanentGenerationError(
          "A requested source concept is unavailable."
        );
      }
      return conceptContentSchema.parse(parent.content);
    }),
    context: {
      projectTitle: set.conceptSet.project.title,
      creativeBrief: brief,
      musicMap: {
        versionNumber: map.versionNumber,
        durationMs: map.durationMs,
        tempoBpm: map.tempoBpm,
        meter:
          map.meterNumerator + "/" + map.meterDenominator,
        acceptedAnchors: map.anchors
      }
    }
  });

  await context.reportProgress(
    15,
    request.operation === "generate"
      ? "Developing distinct concepts from the locked brief."
      : request.operation === "revise"
        ? "Revising the selected concept."
        : "Combining selected concepts."
  );

  try {
    const provider = getTextProviderForKey(
      getEnvironment(),
      job.providerKey
    );
    const raw = await provider.generateStructured({
      model: job.modelKey,
      system: prompt.system,
      prompt: prompt.prompt,
      schemaName: "music_video_concepts",
      jsonSchema: conceptEnvelopeJsonSchema() as unknown as Record<
        string,
        unknown
      >,
      maxOutputTokens: 18000,
      signal: context.signal
    });

    await context.reportProgress(
      75,
      "Validating structured concept output."
    );

    const envelope = conceptEnvelopeSchema.parse(raw);
    if (envelope.concepts.length !== request.count) {
      throw new Error(
        "Provider returned " +
          envelope.concepts.length +
          " concepts; expected " +
          request.count +
          "."
      );
    }

    await context.reportProgress(
      90,
      "Persisting concept options and lineage."
    );

    const persisted = await persistConceptGeneration({
      generationJobId: job.id,
      request,
      concepts: envelope.concepts,
      requestedByUserId: job.requestedByUserId
    });

    return {
      ...persisted,
      operation: request.operation,
      conceptCount: envelope.concepts.length
    };
  } catch (error) {
    if (
      error instanceof TextProviderError &&
      error.permanent
    ) {
      throw new PermanentGenerationError(error.message);
    }
    throw error;
  }
}
