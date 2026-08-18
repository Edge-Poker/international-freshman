import puppeteer from "puppeteer";

async function medir(arquivo, taxa) {
  const b = await puppeteer.launch({ headless: "new" });
  const p = await b.newPage();
  await p.setViewport({ width: 1440, height: 900, deviceScaleFactor: 2 });
  const cdp = await p.createCDPSession();
  await cdp.send("Emulation.setCPUThrottlingRate", { rate: taxa });
  await p.goto("file://" + arquivo, { waitUntil: "networkidle0" });
  await new Promise(r => setTimeout(r, 1200));

  const fps = await p.evaluate(() => new Promise(res => {
    let n = 0; const t0 = performance.now();
    const el = document.querySelector('.arrival'); const r = el.getBoundingClientRect();
    let i = 0;
    const mv = setInterval(() => { i++;
      el.dispatchEvent(new PointerEvent('pointermove', {
        clientX: r.left + r.width * (0.5 + 0.4 * Math.sin(i/6)),
        clientY: r.top + r.height * (0.5 + 0.4 * Math.cos(i/7)),
        bubbles: true, pointerType: 'mouse' })); }, 32);
    function tick(){ n++; if (performance.now()-t0 < 4000) requestAnimationFrame(tick);
      else { clearInterval(mv); res(+(n/((performance.now()-t0)/1000)).toFixed(1)); } }
    requestAnimationFrame(tick);
  }));
  await b.close();
  return fps;
}

const alvo = process.argv[2];
for (const taxa of [1, 4, 6, 8]) {
  console.log(`CPU ${taxa}x mais lenta -> ${await medir(alvo, taxa)} FPS`);
}
