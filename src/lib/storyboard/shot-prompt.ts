import type { StoryboardShot } from "./schema";

export function buildStoryboardShotRegenerationPrompt(input:{
  projectTitle:string;
  sequence:{
    title:string;
    startMs:number;
    endMs:number;
    purpose:string|null;
    sourceContext:unknown;
  };
  current:StoryboardShot;
  previous:StoryboardShot|null;
  next:StoryboardShot|null;
  direction:string;
}){
  return {
    system:[
      "You are revising one storyboard shot inside an already structured professional music video.",
      "Preserve the shot's exact startMs and endMs. Do not change duration or sequence timing.",
      "Revise only the selected shot; maintain continuity with the supplied previous and next shots.",
      "Respect the locked sequence purpose and source creative context.",
      "This is storyboard-level planning, not a provider-specific image/video prompt.",
      "Return strict JSON matching the supplied shot schema."
    ].join("\n"),
    prompt:JSON.stringify({
      projectTitle:input.projectTitle,
      sequence:input.sequence,
      currentShot:input.current,
      previousShot:input.previous,
      nextShot:input.next,
      additionalDirection:input.direction||null,
      requirements:[
        "startMs and endMs must be identical to currentShot.",
        "Keep visual continuity coherent with adjacent shots.",
        "Make the requested revision without redesigning the rest of the sequence.",
        "Return all storyboard shot fields."
      ]
    },null,2)
  };
}
