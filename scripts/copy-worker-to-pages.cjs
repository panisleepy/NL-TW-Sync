const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const worker = path.join(root, ".open-next", "worker.js");
// Must live next to `worker.js` (same relative imports: ./cloudflare/, ./middleware/, …).
// Putting `_worker.js` under `assets/` breaks Pages' esbuild (cannot resolve those paths).
const dest = path.join(root, ".open-next", "_worker.js");

if (!fs.existsSync(worker)) {
  console.error("OpenNext worker not found:", worker);
  process.exit(1);
}
fs.copyFileSync(worker, dest);
console.log("Pages: wrote", dest);
