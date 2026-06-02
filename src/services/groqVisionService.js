const { GROQ_API_KEY } = require('../config/env');

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function getRetryDelayMs(message, fallbackMs) {
  const match = String(message || '').match(/try again in\s+(\d+)s/i);
  return match ? (Number(match[1]) + 1) * 1000 : fallbackMs;
}

async function groqChat(messages, options = {}) {
  const model = options.model || 'meta-llama/llama-4-scout-17b-16e-instruct';
  const temperature = options.temperature ?? 0.1;
  const maxTokens = options.maxTokens || 4096;

  let lastError;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      const body = { model, messages, temperature, max_tokens: maxTokens };
      if (options.responseFormat) body.response_format = options.responseFormat;
      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${GROQ_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.error?.message || `Groq request failed with ${response.status}`);
      }

      const content = data.choices?.[0]?.message?.content;
      if (!content) throw new Error('Empty response from Groq');
      return content;
    } catch (error) {
      lastError = error;
      const message = error?.message || '';
      const canRetry = /rate limit|429|temporarily|timeout/i.test(message);
      if (!canRetry || attempt === 2) break;
      await sleep(getRetryDelayMs(message, 3000 * (attempt + 1)));
    }
  }
  throw lastError || new Error('Groq request failed');
}

async function imageToBuffer(fileUrl) {
  const resp = await fetch(fileUrl);
  if (!resp.ok) throw new Error(`Failed to fetch image: ${resp.status}`);
  return Buffer.from(await resp.arrayBuffer());
}

async function decodeBarcode(imageSource) {
  const buf = typeof imageSource === 'string' && !imageSource.startsWith('data:')
    ? await imageToBuffer(imageSource)
    : typeof imageSource === 'string'
      ? Buffer.from(imageSource.split(',')[1], 'base64')
      : imageSource;

  // Try jsQR first (QR codes)
  try {
    const sharp = require('sharp');
    const jsQR = require('jsqr');
    const { data, info } = await sharp(buf).raw().ensureAlpha().toBuffer({ resolveWithObject: true });
    const code = jsQR(new Uint8ClampedArray(data), info.width, info.height);
    if (code && code.data) return code.data;
  } catch (_) { /* jsQR failed, fall back to Groq */ }

  // Fall back to Groq Vision
  const imageDataUrl = await toDataUrl(buf);

  const prompt = 'На фото — акцизна марка на алкоголь. Знайди на ній штрихкод (DataMatrix або QR код) або номер акцизної марки надрукований на самій марці. Поверни ТІЛЬКИ номер (цифри та літери разом, без пробілів), без пояснень. Якщо не бачиш — поверни "ERROR: no barcode".';

  const content = await groqChat([
    { role: 'user', content: [{ type: 'text', text: prompt }, { type: 'image_url', image_url: { url: imageDataUrl } }] }
  ], { maxTokens: 1024 });

  if (content.startsWith('ERROR:')) throw new Error(content);
  const cleaned = content.replace(/[^A-Za-zА-Яа-я0-9]/g, '');
  if (!cleaned) throw new Error('No barcode found');
  return cleaned;
}

async function toDataUrl(buf) {
  const sharp = require('sharp');
  const meta = await sharp(buf).metadata();
  let img = sharp(buf);
  if ((meta.width || 0) > 2000 || (meta.height || 0) > 2000) {
    img = img.resize(2000, 2000, { fit: 'inside', withoutEnlargement: true });
  }
  const mime = `image/${meta.format || 'jpeg'}`;
  return `data:${mime};base64,${(await img.jpeg({ quality: 80 }).toBuffer()).toString('base64')}`;
}

async function extractInvoiceData(imageSource) {
  const buf = typeof imageSource === 'string' && !imageSource.startsWith('data:')
    ? await imageToBuffer(imageSource)
    : typeof imageSource === 'string'
      ? Buffer.from(imageSource.split(',')[1], 'base64')
      : imageSource;
  const imageDataUrl = await toDataUrl(buf);

  const prompt = `Ти — помічник бухгалтера. На фото — накладна (видаткова накладна) на алкогольні напої.

ВАЖЛИВО: Копіюй назви товарів ТОЧНО як написано в накладній, буква в букву. НЕ скорочуй, НЕ перефразовуй, НЕ змінюй регістр.

Прочитай накладну і поверни ТІЛЬКИ JSON без пояснень:
{
  "supplier": "назва постачальника",
  "venue": "назва закладу-отримувача (наприклад, кафе Отрада або кафе Горпляж)",
  "invoice_number": "номер накладної (наприклад, РН-12345 або накладна від 29.05.2026)",
  "items": [
    { "name": "назва товару ТОЧНО як у накладній", "quantity": число, "unit": "шт" }
  ]
}

Кількість — лише цифра. Unit завжди "шт".
Якщо не вдається розібрати — поверни {"error": "причина"}. Не додавай нічого крім JSON.`;

  const content = await groqChat([
    { role: 'user', content: [{ type: 'text', text: prompt }, { type: 'image_url', image_url: { url: imageDataUrl } }] }
  ], { responseFormat: { type: 'json_object' } });

  try {
    return JSON.parse(content);
  } catch {
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('No JSON in Groq response');
    return JSON.parse(jsonMatch[0]);
  }
}

module.exports = { extractInvoiceData, decodeBarcode, imageToBuffer, groqChat };
