import { describe,expect,it } from "vitest";
import {
  generatedShotSpecificationsDocumentSchema,
  shotSpecificationCompletionIssues
} from "./schema";

const a="11111111-1111-4111-8111-111111111111";
const b="22222222-2222-4222-8222-222222222222";

const spec=(sourceStoryboardShotVersionId:string)=>({
  sourceStoryboardShotVersionId,
  composition:"Layered diagonal composition with controlled negative space.",
  framing:"Medium-wide.",
  cameraAngle:"Eye level.",
  lens:"35mm-equivalent moderate wide lens.",
  lighting:"Soft motivated side light with stable practical sources.",
  colorTreatment:"Restrained neutral shadows and warm practical highlights.",
  cameraMotion:"Slow lateral dolly.",
  subjectMotion:"Measured forward movement.",
  performanceDirection:"Contained performance with direct eyeline on the final beat.",
  focusAndDepth:"Deep enough to preserve subject and key environmental landmarks.",
  continuityNotes:"Maintain screen direction and practical-light positions.",
  wardrobeNotes:"",
  propsNotes:"",
  transitionIn:"",
  transitionOut:"Cut on the final movement.",
  generationHandlesMs:250,
  requiredElements:["Primary subject remains identifiable."],
  exclusions:["No unmotivated background characters."],
  productionNotes:""
});

describe("shot specification schema",()=>{
  it("accepts one exact specification per locked storyboard source",()=>{
    const document=generatedShotSpecificationsDocumentSchema.parse({
      specifications:[spec(a),spec(b)]
    });
    expect(shotSpecificationCompletionIssues(document,[a,b])).toEqual([]);
  });

  it("rejects duplicate source coverage",()=>{
    const document=generatedShotSpecificationsDocumentSchema.parse({
      specifications:[spec(a),spec(a)]
    });
    expect(shotSpecificationCompletionIssues(document,[a,b])).toContain(
      "A locked storyboard shot has more than one generated specification."
    );
  });
});
