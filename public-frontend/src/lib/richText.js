const ALLOWED_TAGS = new Set([
  'P',
  'BR',
  'STRONG',
  'EM',
  'S',
  'H2',
  'H3',
  'UL',
  'OL',
  'LI',
  'BLOCKQUOTE',
  'PRE',
  'CODE',
  'HR'
]);

export function sanitizeRichText(html) {
  if (!html || typeof html !== 'string') return '';
  if (typeof DOMParser === 'undefined') return '';

  const document = new DOMParser().parseFromString(html, 'text/html');
  const elements = [...document.body.querySelectorAll('*')];

  for (const element of elements) {
    if (!ALLOWED_TAGS.has(element.tagName)) {
      element.replaceWith(...element.childNodes);
      continue;
    }

    for (const attribute of [...element.attributes]) {
      element.removeAttribute(attribute.name);
    }
  }

  return document.body.innerHTML;
}
