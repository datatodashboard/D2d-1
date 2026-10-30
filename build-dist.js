import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const distDir = path.join(__dirname, 'dist');

// Clear existing dist directory
if (fs.existsSync(distDir)) {
  fs.rmSync(distDir, { recursive: true, force: true });
}
fs.mkdirSync(distDir, { recursive: true });

// Copy essential runtime files and folders
const runtimeEntries = [
  'index.html',
  'admin.html',
  'verify.html',
  'styles.css',
  'sw.js',
  'manifest.json',
  'metadata.json',
  'd2d-logo.svg',
  'apple-touch-icon.png',
  'favicon-64.png',
  'favicon.ico',
  'icon-192.png',
  'icon-512.png',
  'icon-maskable-512.png',
  'thinking-chime.mp3',
  'js',
  'data',
  'public',
  'vendor'
];

function copyRecursive(src, dest) {
  const stat = fs.statSync(src);
  if (stat.isDirectory()) {
    fs.mkdirSync(dest, { recursive: true });
    for (const file of fs.readdirSync(src)) {
      copyRecursive(path.join(src, file), path.join(dest, file));
    }
  } else {
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.copyFileSync(src, dest);
  }
}

for (const entry of runtimeEntries) {
  const srcPath = path.join(__dirname, entry);
  const destPath = path.join(distDir, entry);
  if (fs.existsSync(srcPath)) {
    copyRecursive(srcPath, destPath);
  } else {
    console.warn(`[Build] Warning: ${entry} not found on disk.`);
  }
}

console.log('Build completed successfully. Dist directory populated at dist/.');
