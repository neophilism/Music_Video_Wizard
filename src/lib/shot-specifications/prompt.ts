import type { CreativeLanguageDocument } from "@/lib/creative-language/schema";

export interface ShotSpecificationPromptShot{
  sourceStoryboardShotVersionId:string;
  sourceStoryboardShotNodeId:string;
  sequenceTitle:string;
  sequencePurpose:string|null;
  sequenceContext:unknown;
  position:number;
  startMs:number;
  endMs:number;
  label:string;
  dramaticPurpose:string;
  beat:string;
  subject:string;
  action:string;
  environment:string;
  framingIntent:string;
  cameraIntent:string;
  continuityNotes:string;
  transitionIn:string;
  transitionOut:string;
  visualIntensity:number;
}

export function buildShotSpecificationsPrompt(input:{
  projectTitle:string;
  aspectRatio:string;
  frameRate:number;
  creativeLanguage:CreativeLanguageDocument;
  shots:ShotSpecificationPromptShot[];
  direction:string;
}){
  return {
    system:[
      "You are the shot-specification department for a professional music video.",
      "Turn each locked storyboard shot into a precise provider-neutral production specification.",
      "Do not redesign the storyboard. Preserve every shot's subject, action, environment, dramatic purpose, sequence membership and exact timing.",
      "Do not write provider-specific prompts, model parameters, seeds or API syntax; a later Prompt Compiler owns those decisions.",
      "Resolve ambiguity by making concrete cinematography, lighting, motion, performance, continuity, wardrobe, prop and transition decisions that obey the locked Creative Language.",
      "generationHandlesMs means optional extra generated media before/after the editorial duration for transition safety; keep it conservative.",
      "requiredElements and exclusions must be actionable visual constraints, not generic quality slogans.",
      "Return exactly one specification for every supplied sourceStoryboardShotVersionId and no others.",
      "Return strict JSON matching the supplied schema."
    ].join("\n"),
    prompt:JSON.stringify({
      project:{
        title:input.projectTitle,
        aspectRatio:input.aspectRatio,
        frameRate:input.frameRate
      },
      lockedCreativeLanguage:input.creativeLanguage,
      lockedStoryboardShots:input.shots,
      additionalDirection:input.direction||null,
      requirements:[
        "Preserve sourceStoryboardShotVersionId exactly.",
        "Do not change protected shot timing or storyboard content.",
        "Specify composition, framing, angle and lens intent precisely enough to reproduce the shot.",
        "Specify lighting and color treatment with continuity in mind.",
        "Separate camera motion from subject motion.",
        "Give concrete performance, focus/depth, wardrobe, prop and continuity direction.",
        "Honor the storyboard transition intent and Creative Language hard exclusions.",
        "Do not compile final imageInstructions, videoInstructions or provider-specific negative prompts."
      ]
    },null,2)
  };
}
