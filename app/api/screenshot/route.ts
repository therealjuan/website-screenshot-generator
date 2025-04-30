import { NextRequest, NextResponse } from 'next/server';
import puppeteer from 'puppeteer';
import { PuppeteerBlocker } from '@cliqz/adblocker-puppeteer';
import fetch from 'cross-fetch';
import axios from 'axios';

const TINYPNG_API_KEY = process.env.TINYPNG_API_KEY!;

export async function POST(req: NextRequest) {
  const body = await req.json();
  const blocker = await PuppeteerBlocker.fromLists(fetch, [
    'https://secure.fanboy.co.nz/fanboy-cookiemonster.txt'
]);
  const url = body.url;

  if (!url || typeof url !== 'string') {
    return NextResponse.json({ error: 'Invalid URL' }, { status: 400 });
  }

  try {
    const browser = await puppeteer.launch({ 
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
        headless: 'shell'
    });
    
    const page = await browser.newPage();
    await blocker.enableBlockingInPage(page);

    await page.setViewport({ width: 1920, height: 1080, deviceScaleFactor: 2 });
    await page.goto(/^https?:\/\//.test(url) ? url : `https://${url}`, { waitUntil: ['load', 'domcontentloaded', 'networkidle0'] });
    await page.screenshot({ type: 'png', path: 'screenshot.png' });
    
    const screenshotBuffer = await page.screenshot({
        type: 'png',
        fullPage: false,
    });
    
    await browser.close();

    // Upload to TinyPNG
    const auth = Buffer.from(`api:${TINYPNG_API_KEY}`).toString('base64');
    const uploadRes = await axios.post(
      'https://api.tinify.com/shrink',
      screenshotBuffer,
      {
        headers: {
          'Authorization': `Basic ${auth}`,
          'Content-Type': 'application/octet-stream',
        },
        responseType: 'json',
      }
    );

    // Get optimized image
    const compressedImage = await axios.get(uploadRes.data.output.url, {
      responseType: 'arraybuffer',
    });

    const base64Compressed = Buffer.from(compressedImage.data).toString('base64');

    return NextResponse.json({ screenshot: base64Compressed });
  } catch (err: any) {
    console.error(err);
    return NextResponse.json({ error: 'Screenshot or compression failed', details: err.message }, { status: 500 });
  }
}
