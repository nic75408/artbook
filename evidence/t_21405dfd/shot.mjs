import { chromium } from 'playwright';

const b = await chromium.launch();
const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
const p = await ctx.newPage();
const errs = [];
p.on('pageerror', (e) => errs.push('pageerror: ' + e.message));
p.on('response', (r) => { if (r.status() >= 400) errs.push(`${r.status()} ${r.url()}`); });
await p.goto('http://localhost:8888/index.html', { waitUntil: 'networkidle' });
await p.waitForSelector('.learn-inline');
await p.waitForTimeout(1500);
console.log('errors:', errs.length ? errs : 'none');
console.log('learn-btn present:', await p.$('.learn-btn') !== null);
await p.screenshot({ path: 'evidence/t_21405dfd/home-390x844.png' });
await b.close();
