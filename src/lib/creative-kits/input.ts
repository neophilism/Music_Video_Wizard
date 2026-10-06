import { z } from "zod";

const slotSchema = z
  .string()
  .trim()
  .regex(
    /^[a-z0-9][a-z0-9:_-]{0,127}$/,
    "Slots must be 1-128 lowercase characters using letters, numbers, colon, underscore, or hyphen."
  );

const itemSchema = z.object({
  slot: slotSchema,
  creativeModuleVersionId: z.string().uuid()
});

const itemsSchema = z
  .array(itemSchema)
  .min(1, "A Creative Kit must contain at least one Library version.")
  .max(64, "A Creative Kit can contain at most 64 slots.")
  .superRefine((items, context) => {
    const seen = new Set<string>();
    items.forEach((item, index) => {
      if (seen.has(item.slot)) {
        context.addIssue({
          code: "custom",
          path: [index, "slot"],
          message: 'Duplicate Creative Kit slot "' + item.slot + '".'
        });
      }
      seen.add(item.slot);
    });
  });

export const creativeKitMetadataSchema = z.object({
  name: z.string().trim().min(1).max(160),
  description: z.string().trim().max(5000).default(""),
  tags: z.array(z.string().trim().min(1).max(64)).max(32).default([])
});

const notesSchema = z.string().trim().max(20000).default("");

export type CreativeKitMetadata = z.infer<typeof creativeKitMetadataSchema>;
export type CreativeKitItemInput = z.infer<typeof itemSchema>;

export interface CreativeKitVersionInput {
  items: CreativeKitItemInput[];
  notes: string;
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

function parseItems(raw: FormDataEntryValue | null): CreativeKitItemInput[] {
  if (typeof raw !== "string") {
    return itemsSchema.parse([]);
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new z.ZodError([
      {
        code: "custom",
        path: ["items"],
        message: "Creative Kit items must be valid JSON."
      }
    ]);
  }

  return itemsSchema.parse(parsed);
}

export function parseCreativeKitVersionForm(
  form: FormData
): CreativeKitVersionInput {
  return {
    items: parseItems(form.get("itemsJson")),
    notes: notesSchema.parse(form.get("notes") ?? "")
  };
}

export function parseCreativeKitForm(form: FormData): {
  metadata: CreativeKitMetadata;
  version: CreativeKitVersionInput;
} {
  return {
    metadata: creativeKitMetadataSchema.parse({
      name: form.get("name"),
      description: form.get("description") ?? "",
      tags: parseTags(form.get("tags"))
    }),
    version: parseCreativeKitVersionForm(form)
  };
}
