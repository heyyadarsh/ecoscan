/**
 * Downscale + re-encode as JPEG so classify payloads stay under Vercel body limits
 * and Gemini responds faster. Camera photos are often 5–15MB as base64.
 */
export async function compressImageDataUrl(
  dataUrl: string,
  maxSide = 1280,
  quality = 0.82,
): Promise<{ dataUrl: string; mimeType: string }> {
  if (typeof document === 'undefined') {
    return { dataUrl, mimeType: 'image/jpeg' };
  }

  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      try {
        let w = img.naturalWidth || img.width;
        let h = img.naturalHeight || img.height;
        if (w < 1 || h < 1) {
          resolve({ dataUrl, mimeType: 'image/jpeg' });
          return;
        }
        if (w > maxSide || h > maxSide) {
          if (w > h) {
            h = Math.round((h * maxSide) / w);
            w = maxSide;
          } else {
            w = Math.round((w * maxSide) / h);
            h = maxSide;
          }
        }
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve({ dataUrl, mimeType: 'image/jpeg' });
          return;
        }
        ctx.drawImage(img, 0, 0, w, h);
        const out = canvas.toDataURL('image/jpeg', quality);
        resolve({ dataUrl: out, mimeType: 'image/jpeg' });
      } catch (e) {
        reject(e);
      }
    };
    img.onerror = () => reject(new Error('Image decode failed'));
    img.src = dataUrl;
  });
}
