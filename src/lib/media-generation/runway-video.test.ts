import { afterEach,describe,expect,it,vi } from "vitest";
import type { CompiledGenerationRequest } from "@/lib/prompt-compiler/schema";
import { RunwayVideoAdapter } from "./runway-video";

const request:CompiledGenerationRequest={
  schemaVersion:1,
  mediaKind:"VIDEO",
  sourceShotSpecificationVersionId:"11111111-1111-4111-8111-111111111111",
  sourceStoryboardShotVersionId:"22222222-2222-4222-8222-222222222222",
  editorialDurationMs:1200,
  generationDurationMs:1700,
  aspectRatio:"16:9",
  frameRate:24,
  prompt:"Slow lateral dolly while the subject turns toward camera.",
  negativeConstraints:["No extra people"],
  referenceRequirements:[{
    role:"FIRST_FRAME",
    required:true,
    description:"Approved Initial Frame"
  }],
  capabilityRequirements:{
    textToImage:false,
    imageEditing:false,
    imageToVideo:true,
    referenceImages:true,
    firstFrame:true,
    lastFrame:false,
    minDurationMs:1700,
    maxDurationMs:1700
  },
  requestFingerprintInput:{
    sourceShotSpecificationVersionId:"11111111-1111-4111-8111-111111111111",
    sourceStoryboardShotVersionId:"22222222-2222-4222-8222-222222222222",
    mediaKind:"VIDEO",
    editorialDurationMs:1200,
    generationDurationMs:1700,
    aspectRatio:"16:9",
    frameRate:24,
    prompt:"Slow lateral dolly while the subject turns toward camera.",
    negativeConstraints:["No extra people"]
  }
};

afterEach(()=>vi.restoreAllMocks());

describe("Runway video adapter",()=>{
  it("submits image-to-video with an approved first frame",async()=>{
    const fetchMock=vi.spyOn(globalThis,"fetch").mockResolvedValue(
      new Response(JSON.stringify({id:"task-123"}),{
        status:200,
        headers:{"content-type":"application/json"}
      })
    );
    const adapter=new RunwayVideoAdapter(
      "secret",
      "https://api.dev.runwayml.com",
      "2024-11-06"
    );
    const model=(await adapter.listModels())[0]!;
    const result=await adapter.submit({
      model,
      request,
      references:[{
        role:"FIRST_FRAME",
        contentType:"image/png",
        dataUri:"data:image/png;base64,aW1hZ2U="
      }]
    });

    expect(result.externalJobId).toBe("task-123");
    const [url,options]=fetchMock.mock.calls[0]!;
    expect(url).toBe("https://api.dev.runwayml.com/v1/image_to_video");
    const body=JSON.parse(String(options?.body));
    expect(body.model).toBe("gen4.5");
    expect(body.promptImage).toBe("data:image/png;base64,aW1hZ2U=");
    expect(body.ratio).toBe("1280:720");
    expect(body.duration).toBe(2);
    expect(body.promptText).toContain("No extra people");
  });

  it("maps a successful task to an expiring remote video output",async()=>{
    vi.spyOn(globalThis,"fetch").mockResolvedValue(
      new Response(JSON.stringify({
        id:"task-123",
        status:"SUCCEEDED",
        output:["https://cdn.example/video.mp4"]
      }),{
        status:200,
        headers:{"content-type":"application/json"}
      })
    );
    const adapter=new RunwayVideoAdapter(
      "secret",
      "https://api.dev.runwayml.com",
      "2024-11-06"
    );
    const model=(await adapter.listModels())[0]!;
    const result=await adapter.poll({
      model,
      externalJobId:"task-123"
    });

    expect(result.status).toBe("SUCCEEDED");
    expect(result.outputs[0]).toMatchObject({
      kind:"REMOTE_URL",
      contentType:"video/mp4",
      url:"https://cdn.example/video.mp4"
    });
  });

  it("treats rate limits as retryable",async()=>{
    vi.spyOn(globalThis,"fetch").mockResolvedValue(
      new Response("rate limited",{status:429})
    );
    const adapter=new RunwayVideoAdapter(
      "secret",
      "https://api.dev.runwayml.com",
      "2024-11-06"
    );
    const model=(await adapter.listModels())[0]!;
    await expect(adapter.submit({
      model,
      request,
      references:[{
        role:"FIRST_FRAME",
        url:"https://example.com/frame.png"
      }]
    })).rejects.toMatchObject({
      permanent:false,
      status:429
    });
  });
});
