import puppeteer from 'puppeteer-extra'
import StealthPlugin from 'puppeteer-extra-plugin-stealth'
import { writeFile } from 'fs/promises'
import { setTimeout } from 'node:timers/promises'
import { spawn } from 'child_process'
import fetch from 'node-fetch'

puppeteer.use(StealthPlugin())

const browser = await puppeteer.launch({
  headless: true,
  args: [
    '--no-sandbox',
    '--disable-setuid-sandbox',
    '--window-size=1280,1024',
    process.env.PROXY_SERVER ? `--proxy-server=${process.env.PROXY_SERVER}` : ''
  ].filter(Boolean),
  defaultViewport: { width: 1280, height: 1024 }
})

const [page] = await browser.pages()

// User-Agentの書き換え
const ua = await browser.userAgent()
await page.setUserAgent(ua.replace('Headless', ''))

// 録画開始（ffmpeg）
const ffmpeg = spawn('ffmpeg', [
  '-y',
  '-f', 'x11grab',
  '-video_size', '1280x1024',
  '-i', ':99.0',
  '-vcodec', 'libx264',
  '-preset', 'ultrafast',
  '-pix_fmt', 'yuv420p',
  'output.mp4'
])

try {
  if (process.env.PROXY_SERVER?.includes('@')) {
    const { username, password } = new URL(process.env.PROXY_SERVER)
    await page.authenticate({ username, password })
  }

  await page.goto('https://secure.xserver.ne.jp/xapanel/login/xvps/', { waitUntil: 'domcontentloaded' })
  await page.type('#memberid', process.env.EMAIL)
  await page.type('#user_password', process.env.PASSWORD)
  await page.click('button:has-text("ログインする")')
  await page.waitForNavigation({ waitUntil: 'networkidle2' })

  // VPS詳細ページへ
  await page.click('a[href^="/xapanel/xvps/server/detail?id="]')
  await page.waitForNavigation({ waitUntil: 'domcontentloaded' })

  await page.click('text=更新する')
  await page.click('text=引き続き無料VPSの利用を継続する')
  await page.waitForNavigation({ waitUntil: 'domcontentloaded' })

  // CAPTCHA画像の取得
  const captchaSrc = await page.$eval('img[src^="data:"]', el => el.src)
  const code = await fetch('https://captcha-120546510085.asia-northeast1.run.app', {
    method: 'POST',
    body: captchaSrc
  }).then(res => res.text())

  await page.type('[placeholder="上の画像の数字を入力"]', code)
  await page.click('text=無料VPSの利用を継続する')

  // Cloudflare対策待ち時間
  await setTimeout(5000)

} catch (e) {
  console.error('[Error]', e)
} finally {
  ffmpeg.kill('SIGINT')
  await browser.close()
}