import { NextRequest, NextResponse } from 'next/server';
import chromium from 'chrome-aws-lambda';
import puppeteer from 'puppeteer-core';
import { PuppeteerBlocker } from '@cliqz/adblocker-puppeteer';
import fetch from 'cross-fetch';
import axios from 'axios';

const TINYPNG_API_KEY = process.env.TINYPNG_API_KEY!;

export async function POST(req: NextRequest) {
  const body = await req.json();
  const url = body.url;

  if (!url || typeof url !== 'string') {
    return NextResponse.json({ error: 'Invalid URL' }, { status: 400 });
  }

  try {
    const executablePath = await chromium.executablePath;

    const browser = await puppeteer.launch({
      args: chromium.args,
      defaultViewport: { width: 1920, height: 1080, deviceScaleFactor: 2 },
      executablePath,
      headless: chromium.headless,
    });

    const page = await browser.newPage();

    // Enable ad & cookie blocking
    const blocker = await PuppeteerBlocker.fromLists(fetch, [
      'https://easylist.to/easylist/easylist.txt',
      'https://easylist.to/easylist/easyprivacy.txt',
      'https://secure.fanboy.co.nz/fanboy-cookiemonster.txt',
    ]);
    await blocker.enableBlockingInPage(page);

    await page.goto(/^https?:\/\//.test(url) ? url : `https://${url}`, {
      waitUntil: ['load', 'domcontentloaded', 'networkidle0'],
    });

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

    const compressedImage = await axios.get(uploadRes.data.output.url, {
      responseType: 'arraybuffer',
    });

    const base64Compressed = Buffer.from(compressedImage.data).toString('base64');

    return NextResponse.json({ screenshot: base64Compressed });
  } catch (err: any) {
    console.error(err);
    return NextResponse.json(
      { error: 'Screenshot or compression failed', details: err.message },
      { status: 500 }
    );
  }
}
