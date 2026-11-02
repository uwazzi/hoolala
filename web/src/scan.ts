// Table QR scanning: the built-in BarcodeDetector where available, a small
// JS QR library otherwise. Reads the /r/<token> URL off a phone on the table.

/** The token out of a scanned table URL, or null when it is not one. */
export function parseTableTokenText(text: string): string | null {
  const match = /\/r\/([^/?#]+)/.exec(text.trim());
  if (!match) return null;
  const token = match[1];
  return token.includes(".") ? token : null;
}

interface Detector {
  detect(source: HTMLVideoElement): Promise<{ rawValue?: string }[]>;
}

async function detectNative(video: HTMLVideoElement): Promise<string | null> {
  const ctor = (window as unknown as { BarcodeDetector?: new (opts: { formats: string[] }) => Detector }).BarcodeDetector;
  if (!ctor) return null;
  try {
    const codes = await new ctor({ formats: ["qr_code"] }).detect(video);
    return codes[0]?.rawValue ?? null;
  } catch {
    return null;
  }
}

async function detectJs(video: HTMLVideoElement, canvas: HTMLCanvasElement): Promise<string | null> {
  if (video.videoWidth === 0) return null;
  const size = Math.min(video.videoWidth, video.videoHeight, 640);
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return null;
  const sx = (video.videoWidth - size) / 2;
  const sy = (video.videoHeight - size) / 2;
  ctx.drawImage(video, sx, sy, size, size, 0, 0, size, size);
  const frame = ctx.getImageData(0, 0, size, size);
  const { default: jsQR } = await import("jsqr");
  return jsQR(frame.data, size, size)?.data ?? null;
}

/** One detection pass over the live frame: native first, jsqr when needed. */
export async function detectTableQr(video: HTMLVideoElement, canvas: HTMLCanvasElement): Promise<string | null> {
  return (await detectNative(video)) ?? (await detectJs(video, canvas).catch(() => null));
}
