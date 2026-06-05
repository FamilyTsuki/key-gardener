const fs = require('fs');
const path = require('path');
const { minify } = require('terser');
const CleanCSS = require('clean-css');

const distDir = path.join(__dirname, '../dist');
const frontendDir = path.join(__dirname, '../frontend');

if (fs.existsSync(distDir)) {
    fs.rmSync(distDir, { recursive: true, force: true });
}
fs.mkdirSync(distDir, { recursive: true });
fs.cpSync(frontendDir, distDir, { recursive: true });

async function processDirectory(dir) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const fullPath = path.join(dir, file);
        if (fs.statSync(fullPath).isDirectory()) {
            await processDirectory(fullPath);
        } else if (file.endsWith('.js')) {
            const content = fs.readFileSync(fullPath, 'utf8');
            try {
                const result = await minify(content);
                if (result.code) {
                    fs.writeFileSync(fullPath, result.code);
                    console.log(`Minified: ${fullPath}`);
                }
            } catch (e) {
                console.error(`Error minifying ${fullPath}:`, e);
            }
        } else if (file.endsWith('.css')) {
            const content = fs.readFileSync(fullPath, 'utf8');
            const result = new CleanCSS().minify(content);
            if (result.styles) {
                fs.writeFileSync(fullPath, result.styles);
                console.log(`Minified CSS: ${fullPath}`);
            }
        }
    }
}

async function build() {
    console.log('Starting build process...');
    await processDirectory(distDir);
    console.log('Build complete! Output in /dist');
}

build();
