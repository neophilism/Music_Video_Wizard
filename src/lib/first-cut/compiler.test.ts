import { describe,expect,it } from "vitest";
import { compileFirstCutPlan,type FirstCutSource } from "./compiler";

function source(
  position:number,
  overrides:Partial<FirstCutSource>={}
):FirstCutSource{
  const start=position*1000;
  return {
    sequencePosition:0,
    shotPosition:position,
    label:"Shot "+(position+1),
    shotSpecificationVersionId:"spec-"+position,
    shotSpecificationNodeId:"spec-node-"+position,
    clipAssetVersionId:"clip-"+position,
    clipNodeId:"clip-node-"+position,
    timelineStartMs:start,
    timelineEndMs:start+1000,
    generatedDurationMs:1500,
    transitionIn:"",
    transitionOut:"",
    ...overrides
  };
}

describe("Automatic First Cut compiler",()=>{
  it("builds exact continuous video items",()=>{
    const plan=compileFirstCutPlan([source(0),source(1)]);
    expect(plan.durationMs).toBe(2000);
    expect(plan.items.map(item=>({
      start:item.timelineStartMs,
      end:item.timelineEndMs,
      sourceStart:item.sourceStartMs,
      sourceEnd:item.sourceEndMs
    }))).toEqual([
      {start:0,end:1000,sourceStart:0,sourceEnd:1000},
      {start:1000,end:2000,sourceStart:0,sourceEnd:1000}
    ]);
  });

  it("preserves transition intent and only assigns explicit duration",()=>{
    const plan=compileFirstCutPlan([
      source(0,{transitionOut:"500 ms cross dissolve"}),
      source(1,{transitionIn:"continue the dissolve"})
    ]);
    expect(plan.transitions[0]).toMatchObject({
      kind:"DISSOLVE",
      durationMs:500,
      durationSpecified:true,
      outgoingIntent:"500 ms cross dissolve"
    });

    const unspecified=compileFirstCutPlan([
      source(0,{transitionOut:"slow dissolve"}),
      source(1)
    ]);
    expect(unspecified.transitions[0]).toMatchObject({
      kind:"DISSOLVE",
      durationMs:0,
      durationSpecified:false
    });
  });

  it("rejects timing gaps instead of silently moving clips",()=>{
    expect(()=>compileFirstCutPlan([
      source(0),
      source(1,{timelineStartMs:1100,timelineEndMs:2100})
    ])).toThrow(/continuously/);
  });

  it("rejects a generated clip shorter than locked editorial timing",()=>{
    expect(()=>compileFirstCutPlan([
      source(0,{generatedDurationMs:800})
    ])).toThrow(/shorter/);
  });
});
