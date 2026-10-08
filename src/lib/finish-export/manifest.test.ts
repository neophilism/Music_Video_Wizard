import { describe,expect,it } from "vitest";
import {
  compileRenderManifest,
  type CompileRenderManifestInput
} from "./manifest";

function input():CompileRenderManifestInput{
  return {
    projectVersionId:"project-version",
    sourceTimelineVersionId:"timeline-version",
    sourceTimelineNodeId:"timeline-node",
    audioMasterAssetVersionId:"audio-version",
    audioMasterNodeId:"audio-node",
    audioContentType:"audio/wav",
    audioDurationMs:2000,
    width:1920,
    height:1080,
    frameRate:24,
    aspectRatio:"16:9",
    items:[
      {
        position:0,
        shotVersionId:"shot-0",
        clipAssetVersionId:"clip-0",
        clipNodeId:"clip-node-0",
        contentType:"video/mp4",
        timelineStartMs:0,
        timelineEndMs:1000,
        sourceStartMs:0,
        sourceEndMs:1000,
        clipDurationMs:1600
      },
      {
        position:1,
        shotVersionId:"shot-1",
        clipAssetVersionId:"clip-1",
        clipNodeId:"clip-node-1",
        contentType:"video/mp4",
        timelineStartMs:1000,
        timelineEndMs:2000,
        sourceStartMs:0,
        sourceEndMs:1000,
        clipDurationMs:1600
      }
    ],
    transitions:[{
      fromPosition:0,
      toPosition:1,
      kind:"DISSOLVE",
      durationMs:400,
      parameters:{}
    }]
  };
}

describe("Finish & Export render manifest",()=>{
  it("compiles reproducible output and source ranges",()=>{
    const manifest=compileRenderManifest(input());
    expect(manifest.output).toMatchObject({
      width:1920,
      height:1080,
      frameRate:24,
      container:"mp4",
      pixelFormat:"yuv420p"
    });
    expect(manifest.durationMs).toBe(2000);
    expect(manifest.expectedFrameCount).toBe(48);
  });

  it("rejects timeline gaps",()=>{
    const value=input();
    value.items[1]!.timelineStartMs=1100;
    expect(()=>compileRenderManifest(value)).toThrow(/continuously/);
  });

  it("rejects transitions without enough outgoing source tail",()=>{
    const value=input();
    value.items[0]!.clipDurationMs=1200;
    expect(()=>compileRenderManifest(value)).toThrow(/outgoing clip tail/);
  });

  it("allows small audio container timing tolerance but rejects drift",()=>{
    const value=input();
    value.audioDurationMs=2030;
    expect(()=>compileRenderManifest(value)).not.toThrow();
    value.audioDurationMs=2200;
    expect(()=>compileRenderManifest(value)).toThrow(/audio master/);
  });

  it("rejects odd yuv420p dimensions",()=>{
    const value=input();
    value.width=1919;
    expect(()=>compileRenderManifest(value)).toThrow(/even integers/);
  });
});
