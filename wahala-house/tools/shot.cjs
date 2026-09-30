// usage: node shot.cjs out.jpg "<query>" W H   (served from http://localhost:8811/tools/view.html)
const { chromium } = require("playwright");
(async () => {
  const [out, query, w, h] = process.argv.slice(2);
  const b = await chromium.launch({ args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
  const p = await b.newPage({ viewport: { width: +w, height: +h } });
  p.on("pageerror", (e) => console.log("ERR", e.message));
  await p.goto("http://localhost:8811/tools/view.html?" + query);
  await p.waitForFunction("window.done", null, { timeout: 100000 });
  await p.screenshot({ path: out, type: "jpeg", quality: 60 });
  await b.close();
})();
