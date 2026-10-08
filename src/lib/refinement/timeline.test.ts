import { describe,expect,it } from "vitest";
import {
  replaceClip,
  retimeBoundary,
  updateTransition,
  validateWorkingTimeline,
  type WorkingTimelineSnapshot
} from "./timeline";

function snapshot():WorkingTimelineSnapshot{
  return {
    items:[
      {
        position:0,
        shotVersionId:"shot-0",
        assetVersionId:"clip-0",
        assetNodeId:"node-0",
        timelineStartMs:0,
        timelineEndMs:1000,
        sourceStartMs:0,
        sourceEndMs:1000,
        manualOverride:false,
        parameters:{},
        availableDurationMs:1800
      },
      {
        position:1,
        shotVersionId:"shot-1",
        assetVersionId:"clip-1",
        assetNodeId:"node-1",
        timelineStartMs:1000,
        timelineEndMs:2000,
        sourceStartMs:0,
        sourceEndMs:1000,
        manualOverride:false,
        parameters:{},
        availableDurationMs:1800
      }
    ],
    transitions:[{
      fromPosition:0,
      toPosition:1,
      kind:"CUT",
      durationMs:0,
      parameters:{}
    }]
  };
}

describe("Refinement timeline operations",()=>{
  it("moves one cut boundary while keeping total coverage continuous",()=>{
    const result=retimeBoundary(snapshot(),0,1200);
    expect(result.items[0]).toMatchObject({
      timelineStartMs:0,
      timelineEndMs:1200,
      sourceEndMs:1200,
      manualOverride:true
    });
    expect(result.items[1]).toMatchObject({
      timelineStartMs:1200,
      timelineEndMs:2000,
      sourceEndMs:800,
      manualOverride:true
    });
    expect(()=>validateWorkingTimeline(result)).not.toThrow();
  });

  it("rejects retiming beyond available source media",()=>{
    const value=snapshot();
    value.items[0]!.availableDurationMs=1050;
    expect(()=>retimeBoundary(value,0,1200)).toThrow(/source duration/);
  });

  it("replaces a clip without mutating timing",()=>{
    const result=replaceClip(snapshot(),0,{
      assetVersionId:"clip-alt",
      assetNodeId:"node-alt",
      availableDurationMs:1500
    });
    expect(result.items[0]).toMatchObject({
      assetVersionId:"clip-alt",
      timelineStartMs:0,
      timelineEndMs:1000,
      manualOverride:true
    });
  });

  it("updates transition intent non-destructively",()=>{
    const result=updateTransition(snapshot(),{
      fromPosition:0,
      kind:"cross dissolve",
      durationMs:300,
      note:"Softer emotional handoff."
    });
    expect(result.transitions[0]).toMatchObject({
      kind:"CROSS_DISSOLVE",
      durationMs:300
    });
    expect(result.transitions[0]!.parameters).toMatchObject({
      origin:"MANUAL"
    });
  });
});
