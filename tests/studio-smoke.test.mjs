import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const html = readFileSync("index.html", "utf8");
const studio = readFileSync("studio.js", "utf8");
const app = readFileSync("script.js", "utf8");

assert.match(html, /id="studio-page"/, "Studio route shell should exist in index.html");
assert.match(html, /id="enter-studio"/, "Cover page should include an Editorial Studio entry");
assert.match(html, /id="map"/, "Existing Memory Atlas map must remain in the page");
assert.match(studio, /const studioDefaultPages = \[/, "Studio should define default pages");
assert.match(studio, /AMSTERDAM/, "Default project should include Amsterdam cover copy");
assert.match(studio, /The Hoxton Amsterdam/, "Default project should include hotel page copy");
assert.match(studio, /makeZip/, "Studio should include all-page ZIP export support");
assert.match(studio, /renderExportCanvas/, "Studio should include deterministic canvas export rendering");
assert.match(studio, /validateStudioProject/, "Studio should validate imported project data");
assert.match(app, /openStudioPage/, "Existing navigation should be able to open Studio");

console.log("Studio smoke checks passed");
