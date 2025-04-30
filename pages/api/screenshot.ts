import type { NextApiRequest, NextApiResponse } from 'next';
import chromium from 'chrome-aws-lambda';
import { PuppeteerBlocker } from '@cliqz/adblocker-puppeteer';
import fetch from 'cross-fetch';
import axios from 'axios';

const TINYPNG_API_KEY = process.env.TINYPNG_API_KEY!;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).end('Method Not Allowed');
  }

  const { url } = req.body;
  if (!url || typeof url !== 'string') {
    return res.status(400).json({ error: 'Invalid URL' });
  }

  try {
    const browser = await chromium.puppeteer.launch({
      args: chromium.args,
      defaultViewport: { width: 1920, height: 1080, deviceScaleFactor: 2 },
      executablePath: await chromium.executablePath,
      headless: chromium.headless,
    });

    const page = await browser.newPage();

    const blocker = await PuppeteerBlocker.fromLists(fetch, [
      'https://secure.fanboy.co.nz/fanboy-cookiemonster.txt',
    ]);
    await blocker.enableBlockingInPage(page as any);

    await page.goto(/^https?:\/\//.test(url) ? url : `https://${url}`, {
      waitUntil: ['load', 'domcontentloaded', 'networkidle0'],
    });

    const screenshotBuffer = await page.screenshot({ type: 'png', fullPage: false });
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

    const optimizedRes = await axios.get(uploadRes.data.output.url, {
      responseType: 'arraybuffer',
    });

    const base64Image = Buffer.from(optimizedRes.data).toString('base64');
    return res.status(200).json({ screenshot: base64Image });
  } catch (err: any) {
    console.error(err);
    return res.status(500).json({ error: 'Screenshot failed', details: err.message });
  }
}
