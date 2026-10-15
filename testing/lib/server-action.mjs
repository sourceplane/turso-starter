#!/usr/bin/env node
// Call one of the site's server actions over HTTP, as the page's own client
// does: the action's id comes from the build's server-reference manifest, and
// its argument (one FormData) is encoded with React's own reply encoder — the
// copy Next ships — so the wire format is never hand-written here.
//
// Run from the built app's directory (apps/web), so `next` resolves:
//   node server-action.mjs <base-url> <exportedName> key=value [key=value …]
// Prints the HTTP status; exits non-zero on anything but 200.
import * as fs from "node:fs";
import { createRequire } from "node:module";

const [base, name, ...pairs] = process.argv.slice(2);
if (!base || !name) {
  console.error("usage: server-action.mjs <base-url> <exportedName> key=value …");
  process.exit(2);
}
const manifest = JSON.parse(fs.readFileSync(".next/server/server-reference-manifest.json", "utf8"));
const id = Object.entries(manifest.node ?? {}).find(([, v]) => v.exportedName === name)?.[0];
if (!id) {
  console.error(`server-action: no action named ${name} in the build's manifest`);
  process.exit(1);
}
const require = createRequire(`${process.cwd()}/package.json`);
const { encodeReply } = require("next/dist/compiled/react-server-dom-turbopack/client.node");
const form = new FormData();
for (const pair of pairs) {
  const i = pair.indexOf("=");
  form.set(pair.slice(0, i), pair.slice(i + 1));
}
const response = await fetch(`${base}/`, {
  method: "POST",
  headers: { "Next-Action": id, Accept: "text/x-component" },
  body: await encodeReply([form]),
});
console.log(response.status);
process.exit(response.status === 200 ? 0 : 1);
