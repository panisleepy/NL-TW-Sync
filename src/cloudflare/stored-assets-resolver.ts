import { getCloudflareContext } from "@opennextjs/cloudflare";
import type { InternalEvent, InternalResult } from "@opennextjs/aws/types/open-next.js";
import type { AssetResolver } from "@opennextjs/aws/types/overrides.js";

/**
 * Same as @opennextjs/cloudflare default asset resolver, but reads `env.STORED_ASSETS`
 * so Wrangler can use a non-reserved binding name on Cloudflare Pages.
 */
const resolver: AssetResolver = {
  name: "cloudflare-stored-assets-resolver",
  async maybeGetAssetResult(event: InternalEvent): Promise<InternalResult | undefined> {
    const env = getCloudflareContext().env as {
      STORED_ASSETS?: { fetch(input: string | URL, init?: RequestInit): Promise<Response> };
    };
    const assets = env.STORED_ASSETS;
    const runWorkerFirst = (globalThis as unknown as Record<string, boolean | string[] | undefined>)
      .__ASSETS_RUN_WORKER_FIRST__;
    if (!assets || !isUserWorkerFirst(runWorkerFirst, event.rawPath)) {
      return undefined;
    }
    const { method, headers } = event;
    if (method !== "GET" && method !== "HEAD") {
      return undefined;
    }
    const url = new URL(event.rawPath, "https://assets.local");
    const response = await assets.fetch(url, {
      headers,
      method,
    });
    if (response.status === 404) {
      await response.body?.cancel();
      return undefined;
    }
    const body = getResponseBody(method, response);
    return {
      type: "core",
      statusCode: response.status,
      headers: Object.fromEntries(response.headers.entries()),
      body: body as InternalResult["body"],
      isBase64Encoded: false,
    };
  },
};

function getResponseBody(method: string, response: Response): ReadableStream {
  if (method === "HEAD") {
    return new ReadableStream();
  }
  return (response.body ?? new ReadableStream()) as ReadableStream;
}

function isUserWorkerFirst(
  runWorkerFirst: boolean | string[] | undefined,
  pathname: string,
): boolean {
  if (!Array.isArray(runWorkerFirst)) {
    return runWorkerFirst ?? false;
  }
  let hasPositiveMatch = false;
  for (let rule of runWorkerFirst) {
    let isPositiveRule = true;
    if (rule.startsWith("!")) {
      rule = rule.slice(1);
      isPositiveRule = false;
    } else if (hasPositiveMatch) {
      continue;
    }
    const match = new RegExp(
      `^${rule.replace(/([[\]().*+?^$|{}\\])/g, "\\$1").replace("\\*", ".*")}$`,
    ).test(pathname);
    if (match) {
      if (isPositiveRule) {
        hasPositiveMatch = true;
      } else {
        return false;
      }
    }
  }
  return hasPositiveMatch;
}

export default resolver;
