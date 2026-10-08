import type { SequenceSourceSpec } from "@/lib/sequence-map/schema";

export interface StoryboardPromptSequence{
  sequenceVersionId:string;
  title:string;
  summary:string|null;
  purpose:string|null;
  startMs:number;
  endMs:number;
  targetShotCount:number|null;
  planningNotes:string;
  source:SequenceSourceSpec;
}

export function buildStoryboardPrompt(input:{
  projectTitle:string;
  sequences:StoryboardPromptSequence[];
  direction:string;
}){
  return {
    system:[
      "You are storyboarding a professional music video around a finished immutable song.",
      "Convert every supplied locked sequence into a complete timed shot-by-shot storyboard.",
      "Do not redesign the song or change sequence boundaries.",
      "Respect the exact creative state, dramatic purpose, motif, performance, camera, motion and editing guidance supplied by each sequence.",
      "Storyboard shots are visual planning beats, not final generation prompts.",
      "Cover every millisecond continuously inside each sequence with no gaps or overlaps.",
      "If targetShotCount is supplied, return exactly that many shots for the sequence.",
      "Prefer coherent visual continuity over arbitrary shot variety.",
      "Return strict JSON matching the supplied schema."
    ].join("\n"),
    prompt:JSON.stringify({
      projectTitle:input.projectTitle,
      additionalDirection:input.direction||null,
      sequences:input.sequences.map(sequence=>({
        sequenceVersionId:sequence.sequenceVersionId,
        title:sequence.title,
        summary:sequence.summary,
        purpose:sequence.purpose,
        startMs:sequence.startMs,
        endMs:sequence.endMs,
        targetShotCount:sequence.targetShotCount,
        planningNotes:sequence.planningNotes||null,
        sourceContext:{
          dramaticPurpose:sequence.source.dramaticPurpose,
          pictureState:sequence.source.pictureState,
          narrativeState:sequence.source.narrativeState,
          characterState:sequence.source.characterState,
          performanceMode:sequence.source.performanceMode,
          worldState:sequence.source.worldState,
          motifState:sequence.source.motifState,
          creativeLanguageApplication:sequence.source.creativeLanguageApplication,
          cameraAndMotionIntent:sequence.source.cameraAndMotionIntent,
          editingRhythm:sequence.source.editingRhythm,
          transitionIn:sequence.source.transitionIn,
          transitionOut:sequence.source.transitionOut,
          visualIntensity:sequence.source.visualIntensity
        }
      })),
      requirements:[
        "Return every supplied sequenceVersionId exactly once.",
        "For each sequence, first shot startMs must equal sequence startMs.",
        "Adjacent shots must touch exactly: next startMs equals previous endMs.",
        "Final shot endMs must equal sequence endMs.",
        "Storyboard descriptions should be specific enough to review composition, action, continuity and editorial flow but should not include provider-specific prompt syntax."
      ]
    },null,2)
  };
}
