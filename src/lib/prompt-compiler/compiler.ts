import type { ShotSpecificationSpec } from "@/lib/shot-specifications/schema";
import {
  compiledGenerationRequestSchema,
  type CompiledGenerationRequest,
  type GenerationMediaKind
} from "./schema";

export interface CompileShotPromptInput{
  sourceShotSpecificationVersionId:string;
  sourceStoryboardShotVersionId:string;
  shot:ShotSpecificationSpec;
  mediaKind:GenerationMediaKind;
  editorialDurationMs:number;
  aspectRatio:string;
  frameRate:number;
  referenceDescriptions?:Array<{
    role:"SUBJECT"|"WARDROBE"|"PROP"|"ENVIRONMENT"|"STYLE"|"FIRST_FRAME"|"LAST_FRAME";
    required:boolean;
    description:string;
  }>;
}

function line(label:string,value:string){
  return value.trim()?label+": "+value.trim()+".":"";
}

export function compileShotGenerationRequest(
  input:CompileShotPromptInput
):CompiledGenerationRequest{
  const handles=Math.max(0,input.shot.generationHandlesMs);
  const generationDurationMs=input.editorialDurationMs+(handles*2);

  const prompt=[
    "Create the exact locked music-video shot described below.",
    line("Composition",input.shot.composition),
    line("Framing",input.shot.framing),
    line("Camera angle",input.shot.cameraAngle),
    line("Lens intent",input.shot.lens),
    line("Lighting",input.shot.lighting),
    line("Color treatment",input.shot.colorTreatment),
    line("Camera motion",input.shot.cameraMotion),
    line("Subject motion",input.shot.subjectMotion),
    line("Performance direction",input.shot.performanceDirection),
    line("Focus and depth",input.shot.focusAndDepth),
    line("Continuity",input.shot.continuityNotes),
    line("Wardrobe",input.shot.wardrobeNotes),
    line("Props",input.shot.propsNotes),
    line("Transition in",input.shot.transitionIn),
    line("Transition out",input.shot.transitionOut),
    input.shot.requiredElements.length
      ?"Required visual elements: "+input.shot.requiredElements.join("; ")+".":"",
    line("Production notes",input.shot.productionNotes),
    "Preserve the approved shot design; do not invent a different setup."
  ].filter(Boolean).join("\n");

  const negativeConstraints=[
    ...input.shot.exclusions,
    "Do not alter the locked shot timing or editorial intent.",
    "Do not introduce unrequested subjects, props, locations, typography, logos, or camera moves."
  ];

  const referenceRequirements=input.referenceDescriptions??[];

  const capabilityRequirements={
    textToImage:input.mediaKind==="IMAGE",
    imageEditing:false,
    imageToVideo:input.mediaKind==="VIDEO",
    referenceImages:referenceRequirements.length>0,
    firstFrame:input.mediaKind==="VIDEO",
    lastFrame:referenceRequirements.some(item=>item.role==="LAST_FRAME"),
    minDurationMs:generationDurationMs,
    maxDurationMs:generationDurationMs
  };

  return compiledGenerationRequestSchema.parse({
    schemaVersion:1,
    mediaKind:input.mediaKind,
    sourceShotSpecificationVersionId:input.sourceShotSpecificationVersionId,
    sourceStoryboardShotVersionId:input.sourceStoryboardShotVersionId,
    editorialDurationMs:input.editorialDurationMs,
    generationDurationMs,
    aspectRatio:input.aspectRatio,
    frameRate:input.frameRate,
    prompt,
    negativeConstraints,
    referenceRequirements,
    capabilityRequirements,
    requestFingerprintInput:{
      sourceShotSpecificationVersionId:input.sourceShotSpecificationVersionId,
      sourceStoryboardShotVersionId:input.sourceStoryboardShotVersionId,
      mediaKind:input.mediaKind,
      editorialDurationMs:input.editorialDurationMs,
      generationDurationMs,
      aspectRatio:input.aspectRatio,
      frameRate:input.frameRate,
      prompt,
      negativeConstraints
    }
  });
}
