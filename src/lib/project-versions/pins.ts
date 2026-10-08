import type { Prisma } from "@prisma/client";

export function wizardPayloadRecord(
  value:Prisma.JsonValue|null|undefined
):Record<string,Prisma.JsonValue>{
  if(!value||typeof value!=="object"||Array.isArray(value)){
    return {};
  }
  return value as Record<string,Prisma.JsonValue>;
}

export function pinnedString(
  value:Prisma.JsonValue|null|undefined,
  key:string
):string|null{
  const candidate=wizardPayloadRecord(value)[key];
  return typeof candidate==="string"&&candidate?candidate:null;
}

export function pinnedStringArray(
  value:Prisma.JsonValue|null|undefined,
  key:string
):string[]{
  const candidate=wizardPayloadRecord(value)[key];
  if(!Array.isArray(candidate)) return [];
  return candidate.filter(
    (item):item is string=>typeof item==="string"&&Boolean(item)
  );
}

export function pinnedNumber(
  value:Prisma.JsonValue|null|undefined,
  key:string
):number|null{
  const candidate=wizardPayloadRecord(value)[key];
  return typeof candidate==="number"&&Number.isFinite(candidate)
    ?candidate
    :null;
}

export function stepPayload(
  steps:readonly {
    stepKey:string;
    payload:Prisma.JsonValue|null;
  }[],
  stepKey:string
):Prisma.JsonValue|null{
  return steps.find(step=>step.stepKey===stepKey)?.payload??null;
}

export function pinnedStepString(
  steps:readonly {
    stepKey:string;
    payload:Prisma.JsonValue|null;
  }[],
  stepKey:string,
  key:string
):string|null{
  return pinnedString(stepPayload(steps,stepKey),key);
}

export function pinnedStepStringArray(
  steps:readonly {
    stepKey:string;
    payload:Prisma.JsonValue|null;
  }[],
  stepKey:string,
  key:string
):string[]{
  return pinnedStringArray(stepPayload(steps,stepKey),key);
}
