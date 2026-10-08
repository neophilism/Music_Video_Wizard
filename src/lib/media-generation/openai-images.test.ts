import { afterEach,describe,expect,it,vi } from "vitest";
import type { CompiledGenerationRequest } from "@/lib/prompt-compiler/schema";
import { OpenAIImageAdapter,openAIImageSizeForAspectRatio } from "./openai-images";

const request:CompiledGenerationRequest={
  schemaVersion:1,
  mediaKind:"IMAGE",
  sourceShotSpecificationVersionId:"11111111-1111-4111-8111-111111111111",
  sourceStoryboardShotVersionId:"22222222-2222-4222-8222-222222222222",
  editorialDurationMs:1000,
  generationDurationMs:1000,
  aspectRatio:"16:9",
  frameRate:24,
  prompt:"A precise locked opening frame.",
  negativeConstraints:["No extra people"],
  referenceRequirements:[],
  capabilityRequirements:{
    textToImage:true,
    imageEditing:false,
    imageToVideo:false,
    referenceImages:false,
    firstFrame:false,
    lastFrame:false,
    minDurationMs:1000,
    maxDurationMs:1000
  },
  requestFingerprintInput:{
    sourceShotSpecificationVersionId:"11111111-1111-4111-8111-111111111111",
    sourceStoryboardShotVersionId:"22222222-2222-4222-8222-222222222222",
    mediaKind:"IMAGE",
    editorialDurationMs:1000,
    generationDurationMs:1000,
    aspectRatio:"16:9",
    frameRate:24,
    prompt:"A precise locked opening frame.",
    negativeConstraints:["No extra people"]
  }
};

afterEach(()=>vi.restoreAllMocks());

describe("OpenAI image adapter",()=>{
  it("maps common music-video aspect ratios to valid divisible-by-16 sizes",()=>{
    expect(openAIImageSizeForAspectRatio("16:9")).toBe("1536x864");
    expect(openAIImageSizeForAspectRatio("9:16")).toBe("864x1536");
    expect(openAIImageSizeForAspectRatio("1:1")).toBe("1024x1024");
  });

  it("submits a synchronous GPT Image generation request",async()=>{
    const fetchMock=vi.spyOn(globalThis,"fetch").mockResolvedValue(
      new Response(JSON.stringify({
        created:123,
        data:[{b64_json:"aW1hZ2U="}]
      }),{status:200,headers:{"content-type":"application/json"}})
    );
    const adapter=new OpenAIImageAdapter("test-key","https://api.openai.com");
    const model=(await adapter.listModels())[0]!;
    const result=await adapter.submit({model,request});

    expect(result.externalJobId).toBeNull();
    expect(result.immediateResult?.status).toBe("SUCCEEDED");
    expect(result.immediateResult?.outputs[0]).toMatchObject({
      kind:"INLINE_BASE64",
      contentType:"image/png",
      base64:"aW1hZ2U="
    });

    const [,options]=fetchMock.mock.calls[0]!;
    const body=JSON.parse(String(options?.body));
    expect(body.model).toBe("gpt-image-2.5-sunburst");
    expect(body.size).toBe("1536x864");
    expect(body.prompt).toContain("Hard exclusions");
    expect(body.prompt).toContain("No extra people");
  });

  it("treats rate limits as retryable",async()=>{
    vi.spyOn(globalThis,"fetch").mockResolvedValue(
      new Response("rate limited",{status:429})
    );
    const adapter=new OpenAIImageAdapter("test-key","https://api.openai.com");
    const model=(await adapter.listModels())[0]!;
    await expect(adapter.submit({model,request})).rejects.toMatchObject({
      permanent:false,
      status:429
    });
  });
});
