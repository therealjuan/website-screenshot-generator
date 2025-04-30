// lib/puppeteer.ts
import puppeteer from 'puppeteer';
import { PuppeteerBlocker } from '@cliqz/adblocker-puppeteer';
import fetch from 'cross-fetch';
import axios from 'axios';

const TINYPNG_API_KEY = process.env.TINYPNG_API_KEY!;

export async function captureScreenshot(url: string): Promise<string> {
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
    defaultViewport: {
      width: 1920,
      height: 1080,
      deviceScaleFactor: 2,
    },
  });

  const page = await browser.newPage();

  const blocker = await PuppeteerBlocker.fromLists(fetch, [
    'https://easylist.to/easylist/easylist.txt',
    'https://secure.fanboy.co.nz/fanboy-cookiemonster.txt',
  ]);
  await blocker.enableBlockingInPage(page);

  await page.goto(/^https?:\/\//.test(url) ? url : `https://${url}`, {
    waitUntil: 'networkidle2',
  });

  const screenshotBuffer = await page.screenshot({ type: 'png' });

  await browser.close();

  const auth = Buffer.from(`api:${TINYPNG_API_KEY}`).toString('base64');
  const uploadRes = await axios.post(
    'https://api.tinify.com/shrink',
    screenshotBuffer,
    {
      headers: {
        Authorization: `Basic ${auth}`,
        'Content-Type': 'application/octet-stream',
      },
      responseType: 'json',
    }
  );

  const compressedImage = await axios.get(uploadRes.data.output.url, {
    responseType: 'arraybuffer',
  });

  return Buffer.from(compressedImage.data).toString('base64');
}
