import { createHash } from "node:crypto";
import type { Prisma } from "@prisma/client";

function canonicalize(value: Prisma.JsonValue): string {
  if (value === null) return "null";

  if (typeof value === "string") return JSON.stringify(value);
  if (typeof value === "number" || typeof value === "boolean") {
    return JSON.stringify(value);
  }

  if (Array.isArray(value)) {
    return `[${value.map((item) => canonicalize(item)).join(",")}]`;
  }

  const entries = Object.entries(value)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(
      ([key, child]) =>
        `${JSON.stringify(key)}:${canonicalize(child as Prisma.JsonValue)}`
    );

  return `{${entries.join(",")}}`;
}

export function fingerprintJson(value: Prisma.JsonValue): string {
  return createHash("sha256").update(canonicalize(value)).digest("hex");
}
