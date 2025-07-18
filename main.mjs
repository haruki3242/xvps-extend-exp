import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

const browser = await chromium.launch({ headless: true });

const context = await browser.newContext({
  recordVideo: { dir: 'videos/' }
});

const page = await context.newPage();
await page.goto('https://secure.xserver.ne.jp/xapanel/login/xvps/');

const loginId = process.env.XSERVER_ID;
const password = process.env.XSERVER_PASSWORD;

await page.fill('#xid', loginId);
await page.fill('#passwd', password);
await Promise.all([
  page.waitForNavigation({ waitUntil: 'networkidle' }),
  page.click('button[type="submit"]'),
]);

console.log('Login attempted.');

await page.waitForTimeout(2000); // ログイン後の画面安定待ち

await context.close(); // ← 録画ファイルが保存されるのは close 時
await browser.close();
