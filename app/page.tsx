// pages/index.tsx
'use client';
import { useState } from 'react';

export default function Home() {
  const [url, setUrl] = useState('');
  const [image, setImage] = useState('');
  const [loading, setLoading] = useState('');

  const handleCapture = async () => {
    setLoading('Capturing screenshot...');
    setImage('');
    try {
      const res = await fetch('/api/screenshot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      });

      const reader = res.body?.getReader();
      const decoder = new TextDecoder('utf-8');
      let screenshotData = '';

      if (reader) {
        let isDone = false;
        while (!isDone) {
          const { done, value } = await reader.read();
          if (done) {
            isDone = true;
          } else {
            screenshotData += decoder.decode(value);
          }
        }
      }

      const data = JSON.parse(screenshotData);

      if (data.screenshot) {
        setLoading('Optimizing image with TinyPNG...');
        setImage(data.screenshot);
        setLoading('');
      } else {
        setLoading('Failed to capture screenshot.');
      }
    } catch (err) {
      setLoading('An error occurred.');
    }
  };

  const downloadImage = () => {
    const link = document.createElement('a');
    const hostname = new URL(url.startsWith('http') ? url : `https://${url}`).hostname.split('.')[0];
    link.download = `${hostname}.png`;
    link.href = `data:image/png;base64,${image}`;
    link.click();
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-purple-500 to-indigo-600 text-white px-4 py-10">
      <h1 className="text-4xl font-bold mb-2">Generate screenshots</h1>
      <p className="mb-6 text-center text-white/90 text-sm">Capture high-quality screenshots of any website</p>

      <div className="w-full max-w-3xl flex flex-col gap-6">
        {/* Top section: Input and button */}
        <div className="bg-white p-6 rounded-lg shadow-lg text-black flex flex-col justify-between">
          <div>
            <div className="flex gap-2 items-center mb-2">
              <input
                type="text"
                placeholder="Enter website URL (e.g. google.com)"
                className="border border-gray-300 p-2 rounded w-full"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
              />
              <button
                onClick={handleCapture}
                className="bg-black text-white px-4 py-2 rounded whitespace-nowrap cursor-pointer"
              >
                Capture
              </button>
            </div>
            {loading && (
              <div className="mt-4 flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-gray-300 border-t-black rounded-full animate-spin"></div>
                <p className="text-sm text-gray-600">{loading}</p>
              </div>
            )}
          </div>
        </div>

        {/* Bottom section: Screenshot preview */}
        <div className="bg-white p-6 rounded-lg shadow-lg text-black flex flex-col items-center justify-center min-h-[200px]">
          {image ? (
            <>
              <div className="w-full flex items-center justify-center bg-gray-100 p-4 rounded">
                <img
                  src={`data:image/png;base64,${image}`}
                  alt="Screenshot"
                  className="object-contain rounded shadow-sm"
                />
              </div>
              <button
                onClick={downloadImage}
                className="mt-4 bg-black text-white px-4 py-2 rounded shadow cursor-pointer"
              >
                Download Screenshot
              </button>
            </>
          ) : (
            <p className="text-gray-400 text-center">Enter a URL and capture to preview the screenshot here</p>
          )}
        </div>
      </div>
    </main>
  );
}