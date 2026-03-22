import { defineCloudflareConfig, type OpenNextConfig } from "@opennextjs/cloudflare";
import storedAssetsResolver from "./src/cloudflare/stored-assets-resolver";

const base = defineCloudflareConfig() as OpenNextConfig;

const config: OpenNextConfig = {
  ...base,
  middleware: {
    ...base.middleware!,
    assetResolver: () => storedAssetsResolver,
  },
};

export default config;
