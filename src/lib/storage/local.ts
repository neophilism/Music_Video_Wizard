import { createHmac, timingSafeEqual } from "node:crypto";
import { access, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import type { AssetStorage, PutAssetInput, StoredAsset } from "./types";

function resolvedAssetPath(root: string, key: string): string {
  const cleanKey = key.replace(/\\/g, "/").replace(/^\/+/, "");
  const rootPath = path.resolve(root);
  const targetPath = path.resolve(rootPath, ...cleanKey.split("/"));

  if (
    targetPath !== rootPath &&
    !targetPath.startsWith(rootPath + path.sep)
  ) {
    throw new Error("Asset key escapes the configured storage root");
  }

  return targetPath;
}

export class LocalAssetStorage implements AssetStorage {
  constructor(
    private readonly root: string,
    private readonly publicBaseUrl: string,
    private readonly signingSecret: string
  ) {}

  async put(input: PutAssetInput): Promise<StoredAsset> {
    const targetPath = resolvedAssetPath(this.root, input.key);
    await mkdir(path.dirname(targetPath), { recursive: true });

    // Asset versions are immutable. Never overwrite an existing object.
    await writeFile(targetPath, input.body, { flag: "wx" });

    return {
      key: input.key,
      size: input.body.byteLength,
      contentType: input.contentType
    };
  }

  async delete(key: string): Promise<void> {
    await rm(resolvedAssetPath(this.root, key), { force: true });
  }

  async exists(key: string): Promise<boolean> {
    try {
      await access(resolvedAssetPath(this.root, key));
      return true;
    } catch {
      return false;
    }
  }

  async getSignedReadUrl(
    key: string,
    expiresInSeconds: number
  ): Promise<string> {
    const expires = Math.floor(Date.now() / 1000) + expiresInSeconds;
    const signature = signLocalAsset(key, expires, this.signingSecret);
    const url = new URL("/api/storage/local", this.publicBaseUrl);
    url.searchParams.set("key", key);
    url.searchParams.set("expires", String(expires));
    url.searchParams.set("signature", signature);
    return url.toString();
  }
}

export async function readLocalAsset(
  root: string,
  key: string
): Promise<Uint8Array> {
  return new Uint8Array(await readFile(resolvedAssetPath(root, key)));
}

function signLocalAsset(
  key: string,
  expires: number,
  secret: string
): string {
  return createHmac("sha256", secret)
    .update(`${key}:${expires}`)
    .digest("hex");
}

export function verifyLocalAssetSignature(
  key: string,
  expires: number,
  signature: string,
  secret: string
): boolean {
  if (!Number.isSafeInteger(expires) || expires < Math.floor(Date.now() / 1000)) {
    return false;
  }

  const expected = Buffer.from(signLocalAsset(key, expires, secret), "hex");
  let actual: Buffer;
  try {
    actual = Buffer.from(signature, "hex");
  } catch {
    return false;
  }

  return expected.length === actual.length && timingSafeEqual(expected, actual);
}
