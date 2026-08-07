import assert from "node:assert/strict";
import test from "node:test";

async function render() {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);
  return worker.fetch(new Request("http://localhost/", { headers: { accept: "text/html" } }), {
    ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) },
  }, { waitUntil() {}, passThroughOnException() {} });
}

test("server-renders SFIP using synchronized platform data", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);

  const html = await response.text();
  assert.match(html, /<title>IT-SFIP/);
  assert.match(html, /98<!-- --> calls|98 calls/);
  assert.match(html, /20<!-- --> perfis internos|20 perfis internos/);
  assert.match(html, /98.*rela.*matching/i);
  assert.match(html, /SFIP Canonical Model/);
  assert.match(html, /Oportunidades/);
  assert.match(html, /Descobrir/);
  assert.match(html, /Comunicar/);
  assert.doesNotMatch(html, /Your site is taking shape|Codex is working/);
});
