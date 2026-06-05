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
  const timeoutMs = options.timeoutMs || 60_000;

  let lastError;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const body = { model, messages, temperature, max_tokens: maxTokens };
      if (options.responseFormat) body.response_format = options.responseFormat;

      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${GROQ_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(body),
        signal: controller.signal
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
      const message = error?.name === 'AbortError' ? 'Groq request timeout' : (error?.message || '');
      const canRetry = /rate limit|429|temporarily|timeout/i.test(message);
      if (!canRetry || attempt === 2) break;
      await sleep(getRetryDelayMs(message, 3000 * (attempt + 1)));
    } finally {
      clearTimeout(timeout);
    }
  }

  throw lastError || new Error('Groq request failed');
}

async function imageToBuffer(fileUrl) {
  const resp = await fetch(fileUrl);
  if (!resp.ok) throw new Error(`Failed to fetch image: ${resp.status}`);
  return Buffer.from(await resp.arrayBuffer());
}

async function toDataUrl(buf) {
  const sharp = require('sharp');
  const meta = await sharp(buf).metadata();
  let img = sharp(buf).rotate();

  if ((meta.width || 0) > 1600 || (meta.height || 0) > 1600) {
    img = img.resize(1600, 1600, { fit: 'inside', withoutEnlargement: true });
  }

  const jpeg = await img.jpeg({ quality: 72, mozjpeg: true }).toBuffer();
  return `data:image/jpeg;base64,${jpeg.toString('base64')}`;
}

function normalizeQuantity(value) {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  const match = String(value || '')
    .replace(/\s+/g, '')
    .replace(',', '.')
    .match(/\d+(?:\.\d+)?/u);
  return match ? Number(match[0]) : 0;
}

function normalizeInvoiceData(data) {
  const source = data && typeof data === 'object' ? data : {};
  const rawItems = Array.isArray(source.items) ? source.items : [];
  const items = rawItems
    .map((item) => ({
      name: String(item?.name || item?.title || '').trim(),
      quantity: normalizeQuantity(item?.quantity ?? item?.qty ?? item?.count),
      unit: String(item?.unit || 'шт').trim() || 'шт'
    }))
    .filter((item) => item.name && item.quantity > 0);

  return {
    supplier: String(source.supplier || '').trim(),
    venue: String(source.venue || source.recipient || '').trim(),
    invoice_number: String(source.invoice_number || source.invoiceNumber || source.number || '').trim(),
    items,
    error: source.error
  };
}

async function decodeBarcode(imageSource) {
  const buf = typeof imageSource === 'string' && !imageSource.startsWith('data:')
    ? await imageToBuffer(imageSource)
    : typeof imageSource === 'string'
      ? Buffer.from(imageSource.split(',')[1], 'base64')
      : imageSource;

  try {
    const sharp = require('sharp');
    const jsQR = require('jsqr');
    const { data, info } = await sharp(buf).raw().ensureAlpha().toBuffer({ resolveWithObject: true });
    const code = jsQR(new Uint8ClampedArray(data), info.width, info.height);
    if (code && code.data) return code.data;
  } catch (_) {
    // Fall back to vision OCR below.
  }

  const imageDataUrl = await toDataUrl(buf);
  const prompt = [
    'На фото акцизная марка на алкоголь.',
    'Найди DataMatrix/QR код или напечатанный номер акцизной марки.',
    'Верни только номер: буквы и цифры без пробелов. Если не видишь код, верни "ERROR: no barcode".'
  ].join('\n');

  const content = await groqChat([
    { role: 'user', content: [{ type: 'text', text: prompt }, { type: 'image_url', image_url: { url: imageDataUrl } }] }
  ], { maxTokens: 1024 });

  if (content.startsWith('ERROR:')) throw new Error(content);
  const cleaned = content.replace(/[^A-Za-zА-Яа-я0-9]/g, '');
  if (!cleaned) throw new Error('No barcode found');
  return cleaned;
}

async function extractInvoiceData(imageSource) {
  const buf = typeof imageSource === 'string' && !imageSource.startsWith('data:')
    ? await imageToBuffer(imageSource)
    : typeof imageSource === 'string'
      ? Buffer.from(imageSource.split(',')[1], 'base64')
      : imageSource;
  const imageDataUrl = await toDataUrl(buf);

  const prompt = `Ти бухгалтерський OCR-парсер. На зображенні видаткова накладна / товарна накладна на алкогольні напої.

Потрібно прочитати таблицю товарів. Повертай тільки валідний JSON без markdown і пояснень.

Правила:
- Копіюй назви товарів точно як у накладній: не скорочуй, не перекладай, не перефразовуй.
- Витягни тільки рядки товарів, не додавай підсумки, ПДВ, тару, послуги доставки, заголовки таблиці.
- Кількість бери з колонки "К-ть", "Кількість", "Кол-во", "Qty" або схожої.
- Якщо кількість дробова, поверни число з крапкою.
- unit завжди "шт", якщо в документі немає іншої одиниці.
- Якщо фото повернуте, розмите або частково обрізане, прочитай усе, що видно.

Формат відповіді:
{
  "supplier": "назва постачальника",
  "venue": "назва отримувача / закладу",
  "invoice_number": "номер накладної або дата+номер",
  "items": [
    { "name": "точна назва товару", "quantity": 1, "unit": "шт" }
  ]
}

Якщо не бачиш жодного товарного рядка, поверни:
{ "error": "не знайдено товарні позиції", "items": [] }`;

  const content = await groqChat([
    { role: 'user', content: [{ type: 'text', text: prompt }, { type: 'image_url', image_url: { url: imageDataUrl } }] }
  ], { responseFormat: { type: 'json_object' }, maxTokens: 4096 });

  try {
    return normalizeInvoiceData(JSON.parse(content));
  } catch {
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('No JSON in Groq response');
    return normalizeInvoiceData(JSON.parse(jsonMatch[0]));
  }
}

module.exports = {
  decodeBarcode,
  extractInvoiceData,
  groqChat,
  imageToBuffer,
  normalizeInvoiceData
};
