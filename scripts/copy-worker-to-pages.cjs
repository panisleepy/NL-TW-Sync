const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const worker = path.join(root, ".open-next", "worker.js");
const dest = path.join(root, ".open-next", "assets", "_worker.js");

if (!fs.existsSync(worker)) {
  console.error("OpenNext worker not found:", worker);
  process.exit(1);
}
fs.mkdirSync(path.dirname(dest), { recursive: true });
// Pages only uploads `pages_build_output_dir` (`.open-next/assets`). That must match
// Workers `assets.directory` so `env.ASSETS` resolves `/_next/static/...` for CSS/JS.
// A stub re-export lets esbuild bundle from `../worker.js` (correct ./cloudflare/ paths).
fs.writeFileSync(
  dest,
  [
    'export * from "../worker.js";',
    // `export *` does not re-export `default` in ES modules; include if present.
    'export { default } from "../worker.js";',
    "",
  ].join("\n"),
  "utf8",
);
console.log("Pages: wrote", dest);
