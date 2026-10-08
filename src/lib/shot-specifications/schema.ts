import { z } from "zod";

const text=(max:number)=>z.string().trim().max(max);
const req=(max:number)=>z.string().trim().min(1).max(max);
const list=(maxItems:number,maxLength:number)=>
  z.array(req(maxLength)).min(1).max(maxItems);

export const shotSpecificationFieldsSchema=z.object({
  composition:req(4000),
  framing:req(2500),
  cameraAngle:req(2500),
  lens:req(2500),
  lighting:req(4000),
  colorTreatment:req(4000),
  cameraMotion:req(3500),
  subjectMotion:req(3500),
  performanceDirection:req(4000),
  focusAndDepth:req(3000),
  continuityNotes:req(4000),
  wardrobeNotes:text(3000),
  propsNotes:text(3000),
  transitionIn:text(2500),
  transitionOut:text(2500),
  generationHandlesMs:z.number().int().min(0).max(5000),
  requiredElements:list(24,1000),
  exclusions:list(24,1000),
  productionNotes:text(4000)
}).strict();

export const generatedShotSpecificationSchema=shotSpecificationFieldsSchema.extend({
  sourceStoryboardShotVersionId:z.string().uuid()
}).strict();

export const generatedShotSpecificationsDocumentSchema=z.object({
  specifications:z.array(generatedShotSpecificationSchema).min(1).max(1000)
}).strict();

export type ShotSpecificationFields=z.infer<typeof shotSpecificationFieldsSchema>;
export type GeneratedShotSpecification=z.infer<typeof generatedShotSpecificationSchema>;
export type GeneratedShotSpecificationsDocument=
  z.infer<typeof generatedShotSpecificationsDocumentSchema>;

export const shotSpecificationSpecSchema=shotSpecificationFieldsSchema.extend({
  schemaVersion:z.literal(1),
  stage:z.literal("SHOT_SPECIFICATION"),
  sourceStoryboardShotVersionId:z.string().uuid(),
  sourceStoryboardShotNodeId:z.string().uuid(),
  sourceSequenceVersionId:z.string().uuid(),
  sourceSequenceNodeId:z.string().uuid(),
  sourceSequencePosition:z.number().int().min(0),
  sourceShotPosition:z.number().int().min(0),
  sourceCreativeLanguageVersionId:z.string().uuid(),
  generationJobId:z.string().uuid(),
  origin:z.literal("GENERATED")
}).strict();

export type ShotSpecificationSpec=z.infer<typeof shotSpecificationSpecSchema>;

export function shotSpecificationCompletionIssues(
  document:GeneratedShotSpecificationsDocument,
  sourceStoryboardShotVersionIds:readonly string[]
):string[]{
  const expected=new Set(sourceStoryboardShotVersionIds);
  if(document.specifications.length!==sourceStoryboardShotVersionIds.length){
    return ["Generate exactly one shot specification for every locked storyboard shot."];
  }
  const seen=new Set<string>();
  for(const item of document.specifications){
    if(!expected.has(item.sourceStoryboardShotVersionId)){
      return ["A shot specification references a storyboard shot outside the locked source set."];
    }
    if(seen.has(item.sourceStoryboardShotVersionId)){
      return ["A locked storyboard shot has more than one generated specification."];
    }
    seen.add(item.sourceStoryboardShotVersionId);
  }
  for(const id of sourceStoryboardShotVersionIds){
    if(!seen.has(id)){
      return ["Every locked storyboard shot must have a generated specification."];
    }
  }
  return [];
}

const fieldsJson={
  composition:{type:"string"},
  framing:{type:"string"},
  cameraAngle:{type:"string"},
  lens:{type:"string"},
  lighting:{type:"string"},
  colorTreatment:{type:"string"},
  cameraMotion:{type:"string"},
  subjectMotion:{type:"string"},
  performanceDirection:{type:"string"},
  focusAndDepth:{type:"string"},
  continuityNotes:{type:"string"},
  wardrobeNotes:{type:"string"},
  propsNotes:{type:"string"},
  transitionIn:{type:"string"},
  transitionOut:{type:"string"},
  generationHandlesMs:{type:"integer"},
  requiredElements:{type:"array",items:{type:"string"}},
  exclusions:{type:"array",items:{type:"string"}},
  productionNotes:{type:"string"}
} as const;

const requiredFields=[
  "composition","framing","cameraAngle","lens","lighting","colorTreatment",
  "cameraMotion","subjectMotion","performanceDirection","focusAndDepth",
  "continuityNotes","wardrobeNotes","propsNotes","transitionIn","transitionOut",
  "generationHandlesMs","requiredElements","exclusions","productionNotes"
] as const;

export const shotSpecificationsJsonSchema={
  type:"object",
  properties:{
    specifications:{
      type:"array",
      minItems:1,
      maxItems:1000,
      items:{
        type:"object",
        properties:{
          sourceStoryboardShotVersionId:{type:"string"},
          ...fieldsJson
        },
        required:["sourceStoryboardShotVersionId",...requiredFields],
        additionalProperties:false
      }
    }
  },
  required:["specifications"],
  additionalProperties:false
} as const;
