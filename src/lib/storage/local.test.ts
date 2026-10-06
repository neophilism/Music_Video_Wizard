import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  LocalAssetStorage,
  readLocalAsset,
  verifyLocalAssetSignature
} from "./local";

const createdRoots: string[] = [];

afterEach(async () => {
  await Promise.all(
    createdRoots.splice(0).map((root) => rm(root, { recursive: true, force: true }))
  );
});

describe("LocalAssetStorage", () => {
  it("writes immutable objects and produces verifiable signed URLs", async () => {
    const root = await mkdtemp(path.join(tmpdir(), "mvw-storage-"));
    createdRoots.push(root);
    const secret = "0123456789abcdef0123456789abcdef";
    const storage = new LocalAssetStorage(
      root,
      "http://localhost:3000",
      secret
    );

    const body = new Uint8Array([1, 2, 3, 4]);
    await storage.put({
      key: "workspace/project/master.wav",
      body,
      contentType: "audio/wav"
    });

    expect(await storage.exists("workspace/project/master.wav")).toBe(true);
    expect(
      Array.from(await readLocalAsset(root, "workspace/project/master.wav"))
    ).toEqual([1, 2, 3, 4]);

    await expect(
      storage.put({
        key: "workspace/project/master.wav",
        body,
        contentType: "audio/wav"
      })
    ).rejects.toThrow();

    const signed = new URL(
      await storage.getSignedReadUrl("workspace/project/master.wav", 60)
    );
    const key = signed.searchParams.get("key");
    const expires = Number(signed.searchParams.get("expires"));
    const signature = signed.searchParams.get("signature");

    expect(key).toBe("workspace/project/master.wav");
    expect(signature).toBeTruthy();
    expect(
      verifyLocalAssetSignature(key!, expires, signature!, secret)
    ).toBe(true);
  });

  it("prevents path traversal", async () => {
    const root = await mkdtemp(path.join(tmpdir(), "mvw-storage-"));
    createdRoots.push(root);
    const storage = new LocalAssetStorage(
      root,
      "http://localhost:3000",
      "0123456789abcdef0123456789abcdef"
    );

    await expect(
      storage.put({
        key: "../../escape.wav",
        body: new Uint8Array([1]),
        contentType: "audio/wav"
      })
    ).rejects.toThrow(/escapes/);
  });
});
