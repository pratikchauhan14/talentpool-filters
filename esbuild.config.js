import esbuild from 'esbuild';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ensure dist directory exists
const distDir = path.join(__dirname, 'dist');
if (!fs.existsSync(distDir)) {
  fs.mkdirSync(distDir, { recursive: true });
}

// Copy style.css to dist
const styleSrcPath = path.join(__dirname, 'src', 'style.css');
const styleDestPath = path.join(distDir, 'style.css');

if (fs.existsSync(styleSrcPath)) {
  fs.copyFileSync(styleSrcPath, styleDestPath);
  console.log('Copied style.css to dist directory');
} else {
  console.warn('Warning: style.css not found in src directory');
}

// Build configuration
const buildOptions = {
  entryPoints: ['src/index.js'],
  bundle: true,
  outfile: 'dist/bundle.talentpool.js',
  minify: true,
  sourcemap: true,
  target: ['es2015'],
  drop: ['console', 'debugger'],
  loader: {
    '.js': 'jsx',
  },
};

// Build function
async function build() {
  try {
    await esbuild.build(buildOptions);
    console.log('Build completed successfully!');
  } catch (e) {
    console.error('Build failed:', e);
    process.exit(1);
  }
}

// Watch mode
async function watch() {
  try {
    const ctx = await esbuild.context(buildOptions);
    await ctx.watch();
    console.log('Watching for changes...');
  } catch (e) {
    console.error('Watch mode failed to start:', e);
    process.exit(1);
  }
}

// Run build or watch
if (process.argv.includes('--watch')) {
  watch();
} else {
  build();
}
