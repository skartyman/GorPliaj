const fs = require('fs');
const path = require('path');
const https = require('https');

const fontsDir = path.join(__dirname, '..', 'src', 'fonts');

// Ensure directory exists
if (!fs.existsSync(fontsDir)) {
  fs.mkdirSync(fontsDir, { recursive: true });
}

const fonts = [
  {
    name: 'Roboto-Regular.ttf',
    urls: [
      'https://raw.githubusercontent.com/google/fonts/main/ofl/roboto/static/Roboto-Regular.ttf',
      'https://raw.githubusercontent.com/googlefonts/roboto/main/src/hinted/Roboto-Regular.ttf',
      'https://raw.githubusercontent.com/google/fonts/main/ofl/roboto/Roboto-Regular.ttf'
    ]
  },
  {
    name: 'Roboto-Bold.ttf',
    urls: [
      'https://raw.githubusercontent.com/google/fonts/main/ofl/roboto/static/Roboto-Bold.ttf',
      'https://raw.githubusercontent.com/googlefonts/roboto/main/src/hinted/Roboto-Bold.ttf',
      'https://raw.githubusercontent.com/google/fonts/main/ofl/roboto/Roboto-Bold.ttf'
    ]
  }
];

function downloadFile(url, dest) {
  return new Promise((resolve, reject) => {
    console.log(`Downloading ${url} -> ${dest}...`);
    const file = fs.createWriteStream(dest);
    
    https.get(url, (response) => {
      if (response.statusCode === 302 || response.statusCode === 301) {
        // Handle redirect
        downloadFile(response.headers.location, dest).then(resolve).catch(reject);
        return;
      }
      
      if (response.statusCode !== 200) {
        reject(new Error(`Failed to download: ${response.statusCode}`));
        return;
      }
      
      response.pipe(file);
      file.on('finish', () => {
        file.close();
        console.log(`Downloaded ${path.basename(dest)} successfully.`);
        resolve();
      });
    }).on('error', (err) => {
      fs.unlink(dest, () => {});
      reject(err);
    });
  });
}

async function run() {
  try {
    for (const font of fonts) {
      const destPath = path.join(fontsDir, font.name);
      let success = false;
      let lastError = null;
      
      for (const url of font.urls) {
        try {
          await downloadFile(url, destPath);
          success = true;
          break; // Stop trying other URLs for this font
        } catch (err) {
          console.warn(`Failed to download from ${url}: ${err.message}`);
          lastError = err;
        }
      }
      
      if (!success) {
        throw lastError || new Error(`Failed to download ${font.name} from all sources.`);
      }
    }
    console.log('All fonts downloaded successfully!');
  } catch (err) {
    console.error('Error downloading fonts:', err);
    process.exit(1);
  }
}

run();
