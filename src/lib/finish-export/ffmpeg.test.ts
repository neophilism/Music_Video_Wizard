import { describe,expect,it } from "vitest";
import type { RenderManifest } from "./manifest";
import { buildFfmpegRenderCommand } from "./ffmpeg";

function manifest():RenderManifest{
  return {
    schemaVersion:1,
    projectVersionId:"project",
    sourceTimelineVersionId:"timeline",
    sourceTimelineNodeId:"timeline-node",
    audioMasterAssetVersionId:"audio",
    audioMasterNodeId:"audio-node",
    output:{
      width:1920,
      height:1080,
      frameRate:24,
      aspectRatio:"16:9",
      container:"mp4",
      videoCodec:"h264",
      audioCodec:"aac",
      pixelFormat:"yuv420p"
    },
    durationMs:2000,
    expectedFrameCount:48,
    items:[
      {
        position:0,
        shotVersionId:"shot-0",
        clipAssetVersionId:"clip-0",
        clipNodeId:"clip-node-0",
        timelineStartMs:0,
        timelineEndMs:1000,
        sourceStartMs:0,
        sourceEndMs:1000
      },
      {
        position:1,
        shotVersionId:"shot-1",
        clipAssetVersionId:"clip-1",
        clipNodeId:"clip-node-1",
        timelineStartMs:1000,
        timelineEndMs:2000,
        sourceStartMs:0,
        sourceEndMs:1000
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

describe("FFmpeg master render command",()=>{
  it("uses only the outgoing transition tail as extra source media",()=>{
    const command=buildFfmpegRenderCommand({
      executable:"ffmpeg",
      manifest:manifest(),
      clipPaths:["/tmp/0.mp4","/tmp/1.mp4"],
      audioPath:"/tmp/audio.wav",
      outputPath:"/tmp/master.mp4"
    });
    expect(command.filterComplex).toContain(
      "[0:v]trim=start=0:end=1.4"
    );
    expect(command.filterComplex).toContain(
      "[1:v]trim=start=0:end=1"
    );
  });

  it("places xfade at the exact locked cut boundary",()=>{
    const command=buildFfmpegRenderCommand({
      executable:"ffmpeg",
      manifest:manifest(),
      clipPaths:["0.mp4","1.mp4"],
      audioPath:"audio.wav",
      outputPath:"master.mp4"
    });
    expect(command.filterComplex).toContain(
      "xfade=transition=dissolve:duration=0.4:offset=1"
    );
  });

  it("uses concat for a zero-duration transition",()=>{
    const value=manifest();
    value.transitions[0]!.durationMs=0;
    const command=buildFfmpegRenderCommand({
      executable:"ffmpeg",
      manifest:value,
      clipPaths:["0.mp4","1.mp4"],
      audioPath:"audio.wav",
      outputPath:"master.mp4"
    });
    expect(command.filterComplex).toContain("concat=n=2:v=1:a=0");
    expect(command.filterComplex).not.toContain("xfade=");
  });

  it("maps normalized video and trimmed immutable audio to H.264/AAC MP4",()=>{
    const command=buildFfmpegRenderCommand({
      executable:"/usr/bin/ffmpeg",
      manifest:manifest(),
      clipPaths:["0.mp4","1.mp4"],
      audioPath:"audio.wav",
      outputPath:"master.mp4"
    });
    expect(command.executable).toBe("/usr/bin/ffmpeg");
    expect(command.args).toContain("libx264");
    expect(command.args).toContain("aac");
    expect(command.args).toContain("+faststart");
    expect(command.filterComplex).toContain(
      "[2:a]atrim=start=0:end=2,asetpts=PTS-STARTPTS[aout]"
    );
  });

  it("requires one local clip path per manifest item",()=>{
    expect(()=>buildFfmpegRenderCommand({
      executable:"ffmpeg",
      manifest:manifest(),
      clipPaths:["0.mp4"],
      audioPath:"audio.wav",
      outputPath:"master.mp4"
    })).toThrow(/one local clip path/);
  });
});
