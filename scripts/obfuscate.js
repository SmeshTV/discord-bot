/**
 * Post-build обфускация JS файлов в dist/assets
 * Запускается автоматически после `npm run build:full`
 */
import JavaScriptObfuscator from 'javascript-obfuscator';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DIST_ASSETS = path.join(__dirname, '..', 'dist', 'assets');

function obfuscateFiles() {
  if (!fs.existsSync(DIST_ASSETS)) {
    console.log('❌ dist/assets не найден. Сначала запустите build.');
    process.exit(1);
  }

  const files = fs.readdirSync(DIST_ASSETS).filter(f => f.endsWith('.js'));
  console.log(`🔒 Обфускация ${files.length} файлов...`);

  files.forEach((file, i) => {
    const filePath = path.join(DIST_ASSETS, file);
    const original = fs.readFileSync(filePath, 'utf-8');
    const originalSize = Buffer.byteLength(original);

    try {
      const obfuscated = JavaScriptObfuscator.obfuscate(original, {
        compact: true,
        controlFlowFlattening: true,
        controlFlowFlatteningThreshold: 0.75,
        deadCodeInjection: true,
        deadCodeInjectionThreshold: 0.3,
        debugProtection: false,
        disableConsoleOutput: true,
        identifierNamesGenerator: 'hexadecimal',
        numbersToExpressions: true,
        renameGlobals: false,
        selfDefending: true,
        simplify: true,
        splitStrings: true,
        splitStringsChunkLength: 5,
        stringArray: true,
        stringArrayCallsTransform: true,
        stringArrayEncoding: ['rc4'],
        stringArrayThreshold: 0.75,
        transformObjectKeys: true,
      });

      const obfuscatedCode = obfuscated.getObfuscatedCode();
      fs.writeFileSync(filePath, obfuscatedCode);

      const newSize = Buffer.byteLength(obfuscatedCode);
      const percent = ((newSize / originalSize - 1) * 100).toFixed(0);
      console.log(`  ✅ ${file} (${(originalSize / 1024).toFixed(1)}KB → ${(newSize / 1024).toFixed(1)}KB, +${percent}%)`);
    } catch (err) {
      console.log(`  ⚠️  ${file} — пропущен (${err.message})`);
    }
  });

  console.log('✅ Обфускация завершена!');
}

obfuscateFiles();
