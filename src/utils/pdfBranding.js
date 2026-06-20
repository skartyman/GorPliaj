const fs = require('fs');
const path = require('path');

function findFirstExistingPath(candidates) {
  return candidates.find((candidate) => candidate && fs.existsSync(candidate)) || null;
}

function getFontPaths() {
  const regular = findFirstExistingPath([
    process.env.PDF_FONT_REGULAR,
    'C:\\Windows\\Fonts\\arial.ttf',
    'C:\\Windows\\Fonts\\segoeui.ttf',
    '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf',
    '/usr/share/fonts/truetype/liberation2/LiberationSans-Regular.ttf'
  ]);

  const bold = findFirstExistingPath([
    process.env.PDF_FONT_BOLD,
    'C:\\Windows\\Fonts\\arialbd.ttf',
    'C:\\Windows\\Fonts\\segoeuib.ttf',
    '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf',
    '/usr/share/fonts/truetype/liberation2/LiberationSans-Bold.ttf'
  ]);

  return { regular, bold: bold || regular };
}

function registerPdfFonts(doc) {
  const fonts = getFontPaths();
  if (fonts.regular) {
    doc.registerFont('BrandSans', fonts.regular);
  }
  if (fonts.bold) {
    doc.registerFont('BrandSansBold', fonts.bold);
  }

  return {
    regular: fonts.regular ? 'BrandSans' : 'Helvetica',
    bold: fonts.bold ? 'BrandSansBold' : 'Helvetica-Bold'
  };
}

function getLogoPath() {
  return findFirstExistingPath([
    path.join(process.cwd(), 'public', 'icons', 'Logo.png'),
    path.join(process.cwd(), 'public', 'icons', 'Logo.jpg'),
    path.join(process.cwd(), 'public', 'icons', 'logo1.png')
  ]);
}

async function loadImageBuffer(source) {
  if (!source) return null;

  try {
    if (/^https?:\/\//i.test(source)) {
      const response = await fetch(source);
      if (!response.ok) return null;
      const arrayBuffer = await response.arrayBuffer();
      return Buffer.from(arrayBuffer);
    }

    const absolute = path.isAbsolute(source) ? source : path.join(process.cwd(), source);
    if (!fs.existsSync(absolute)) return null;
    return fs.readFileSync(absolute);
  } catch {
    return null;
  }
}

module.exports = {
  getLogoPath,
  loadImageBuffer,
  registerPdfFonts
};
