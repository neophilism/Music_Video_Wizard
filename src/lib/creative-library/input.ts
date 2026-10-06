import { CreativeModuleKind, Prisma } from "@prisma/client";
import { z } from "zod";

const uuidListSchema = z.array(z.string().uuid()).max(24);

export const creativeModuleMetadataSchema = z.object({
  kind: z.nativeEnum(CreativeModuleKind),
  name: z.string().trim().min(1).max(160),
  description: z.string().trim().max(5000).default(""),
  tags: z.array(z.string().trim().min(1).max(64)).max(32).default([])
});

export interface CreativeVersionContent {
  definition: Prisma.InputJsonValue;
  positivePrompt: string;
  negativePrompt: string;
  notes: string;
  referenceAssetVersionIds: string[];
}

export type CreativeModuleMetadata = z.infer<typeof creativeModuleMetadataSchema>;

function parseJsonDefinition(raw: FormDataEntryValue | null): Prisma.InputJsonValue {
  const text = typeof raw === "string" ? raw.trim() : "";
  if (!text) return {};

  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new z.ZodError([
      {
        code: "custom",
        path: ["definition"],
        message: "Definition must be valid JSON."
      }
    ]);
  }

  if (
    parsed === null ||
    Array.isArray(parsed) ||
    typeof parsed !== "object"
  ) {
    throw new z.ZodError([
      {
        code: "custom",
        path: ["definition"],
        message: "Definition must be a JSON object."
      }
    ]);
  }

  return parsed as Prisma.InputJsonValue;
}

function parseTags(raw: FormDataEntryValue | null): string[] {
  if (typeof raw !== "string") return [];
  return [
    ...new Set(
      raw
        .split(",")
        .map((tag) => tag.trim().toLowerCase())
        .filter(Boolean)
    )
  ];
}

function parseReferenceIds(raw: FormDataEntryValue | null): string[] {
  if (typeof raw !== "string") return [];
  const ids = [
    ...new Set(
      raw
        .split(/[\s,]+/)
        .map((value) => value.trim())
        .filter(Boolean)
    )
  ];
  return uuidListSchema.parse(ids);
}

export function parseCreativeVersionForm(form: FormData): CreativeVersionContent {
  const textSchema = z.object({
    positivePrompt: z.string().trim().max(20000).default(""),
    negativePrompt: z.string().trim().max(20000).default(""),
    notes: z.string().trim().max(20000).default("")
  });

  const text = textSchema.parse({
    positivePrompt: form.get("positivePrompt") ?? "",
    negativePrompt: form.get("negativePrompt") ?? "",
    notes: form.get("notes") ?? ""
  });

  return {
    definition: parseJsonDefinition(form.get("definition")),
    positivePrompt: text.positivePrompt,
    negativePrompt: text.negativePrompt,
    notes: text.notes,
    referenceAssetVersionIds: parseReferenceIds(
      form.get("referenceAssetVersionIds")
    )
  };
}

export function parseCreativeModuleForm(form: FormData): {
  metadata: CreativeModuleMetadata;
  version: CreativeVersionContent;
} {
  return {
    metadata: creativeModuleMetadataSchema.parse({
      kind: form.get("kind"),
      name: form.get("name"),
      description: form.get("description") ?? "",
      tags: parseTags(form.get("tags"))
    }),
    version: parseCreativeVersionForm(form)
  };
}
