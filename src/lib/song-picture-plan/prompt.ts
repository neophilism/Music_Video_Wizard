import type { TreatmentDocument } from "@/lib/treatment/schema";
import type { CreativeLanguageDocument } from "@/lib/creative-language/schema";

export function buildSongPicturePlanPrompt(input:{
  projectTitle:string;
  treatment:TreatmentDocument;
  creativeLanguage:CreativeLanguageDocument;
  musicMap:{durationMs:number;tempoBpm:number|null;meter:string;anchors:Array<{id:string;kind:string;label:string;startMs:number;endMs:number|null}>};
  direction:string;
}) {
  return {
    system:[
      "You are creating a professional song-to-picture plan for a finished music video track.",
      "The locked Treatment and locked Creative Language are authoritative.",
      "Map them continuously across the exact song timing and accepted Music Map anchors.",
      "Create visual passages, not individual shots or storyboard frames.",
      "Do not change the music, Treatment story, or Creative Language rules.",
      "Return strict JSON matching the supplied schema."
    ].join("\n"),
    prompt:JSON.stringify({
      projectTitle:input.projectTitle,
      lockedTreatment:input.treatment,
      lockedCreativeLanguage:input.creativeLanguage,
      approvedMusicMap:input.musicMap,
      additionalDirection:input.direction||null,
      requirements:[
        "Cover the full song contiguously from 0 to durationMs.",
        "Every passage must reference one or more locked Treatment section indexes using zero-based indexes.",
        "Use only supplied accepted Music Map anchor IDs.",
        "For each passage define dramatic purpose, current picture/narrative/character/performance/world/motif state, application of Creative Language, camera/motion intent, editing rhythm, transitions and visual intensity.",
        "Do not specify individual shots, lenses, image prompts or video prompts; Storyboard and Shot Specifications do that later."
      ]
    },null,2)
  };
}
