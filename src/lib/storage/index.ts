import { getEnvironment, type AppEnvironment } from "@/lib/env";
import { LocalAssetStorage } from "./local";
import { S3AssetStorage } from "./s3";
import type { AssetStorage } from "./types";

export function createAssetStorage(
  env: AppEnvironment = getEnvironment()
): AssetStorage {
  if (env.ASSET_STORAGE_DRIVER === "local") {
    return new LocalAssetStorage(
      env.ASSET_STORAGE_LOCAL_ROOT,
      env.BETTER_AUTH_URL,
      env.BETTER_AUTH_SECRET
    );
  }

  return new S3AssetStorage({
    bucket: env.ASSET_STORAGE_BUCKET,
    region: env.ASSET_STORAGE_REGION,
    endpoint: env.ASSET_STORAGE_ENDPOINT || undefined,
    forcePathStyle: env.ASSET_STORAGE_FORCE_PATH_STYLE,
    accessKeyId: env.ASSET_STORAGE_ACCESS_KEY_ID || undefined,
    secretAccessKey: env.ASSET_STORAGE_SECRET_ACCESS_KEY || undefined
  });
}

export type { AssetKey, AssetStorage, PutAssetInput, StoredAsset } from "./types";
