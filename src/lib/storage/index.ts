import type { AssetStorage } from "./types";

/**
 * Provider-neutral storage seam.
 *
 * Media assets will become large and long-lived. Product code must depend on
 * this contract rather than a particular cloud SDK so local development,
 * object storage, migrations, and future multi-region strategies remain
 * replaceable without rewriting domain logic.
 */
export function createAssetStorage(): AssetStorage {
  throw new Error(
    "Asset storage provider is not configured yet. Provider implementation belongs in the storage integration milestone."
  );
}

export type { AssetKey, AssetStorage, PutAssetInput, StoredAsset } from "./types";
