import { chromium } from 'playwright';
import fetch from 'node-fetch';

(async () => {
  const browser = await chromium.launch({ headless: true });

  const context = await browser.newContext({
    viewport: { width: 1080, height: 1024 },
    recordVideo: { dir: 'videos/' }
  });

  const page = await context.newPage();

  // プロキシ認証（必要なら）
  if (process.env.PROXY_SERVER) {
    const proxyUrl = new URL(process.env.PROXY_SERVER);
    if (proxyUrl.username && proxyUrl.password) {
      await context.setHTTPCredentials({
        username: proxyUrl.username,
        password: proxyUrl.password,
      });
    }
  }

  try {
    await page.goto('https://secure.xserver.ne.jp/xapanel/login/xvps/', { waitUntil: 'networkidle' });

    await page.fill('#memberid', process.env.EMAIL);
    await page.fill('#user_password', process.env.PASSWORD);
    await page.click('text=ログインする');

    await page.waitForNavigation({ waitUntil: 'networkidle' });

    await page.click('a[href^="/xapanel/xvps/server/detail?id="]');
    await page.click('text=更新する');
    await page.click('text=引き続き無料VPSの利用を継続する');

    await page.waitForNavigation({ waitUntil: 'networkidle' });

    // キャプチャ画像取得
    const imgSrc = await page.$eval('img[src^="data:"]', el => el.src);
    const base64Data = imgSrc.split(',')[1];

    const response = await fetch('https://captcha-120546510085.asia-northeast1.run.app', {
      method: 'POST',
      body: base64Data,
      headers: { 'Content-Type': 'text/plain' },
    });
    const code = await response.text();

    await page.fill('[placeholder="上の画像の数字を入力"]', code);
    await page.click('text=無料VPSの利用を継続する');

  } catch (e) {
    console.error(e);
  } finally {
    await page.waitForTimeout(5000);
    await context.close();
    await browser.close();
  }
})();
