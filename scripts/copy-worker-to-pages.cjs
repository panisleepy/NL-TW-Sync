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
fs.copyFileSync(worker, dest);
console.log("Pages: copied worker to", dest);
