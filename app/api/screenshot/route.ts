import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  const body = await req.json();
  const url = body.url;

  if (!url || typeof url !== 'string') {
    return NextResponse.json({ error: 'Invalid URL' }, { status: 400 });
  }

  try {
    const { captureScreenshot } = await import('@/lib/puppeteer');
    const base64Compressed = await captureScreenshot(url);

    return NextResponse.json({ screenshot: base64Compressed });
  } catch (err: any) {
    console.error(err);
    return NextResponse.json(
      { error: 'Screenshot or compression failed', details: err.message },
      { status: 500 }
    );
  }
}
