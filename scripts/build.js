const fs = require('fs');
const path = require('path');
const { minify } = require('terser');
const CleanCSS = require('clean-css');

const distDir = path.join(__dirname, '../dist');
const frontendDir = path.join(__dirname, '../frontend');

const BUILD_ID = Date.now().toString(36);

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
            let content = fs.readFileSync(fullPath, 'utf8');
            content = content.replace(/(from\s*['"])([^'"]+\.js)(['"])/g, `$1$2?v=${BUILD_ID}$3`);
            content = content.replace(/(import\s*\(\s*['"])([^'"]+\.js)(['"]\s*\))/g, `$1$2?v=${BUILD_ID}$3`);
            content = content.replace(/(\.(?:webp|png|jpg|svg))(['"])/g, `$1?v=${BUILD_ID}$2`);
            try {
                const result = await minify(content);
                if (result.code) {
                    fs.writeFileSync(fullPath, result.code);
                    console.log(`Minified & Versioned: ${fullPath}`);
                }
            } catch (e) {
                console.error(`Error minifying ${fullPath}:`, e);
            }
        } else if (file.endsWith('.css')) {
            let content = fs.readFileSync(fullPath, 'utf8');
            content = content.replace(/(url\(['"]?)([^'"\)]+\.(?:webp|png|jpg|svg))(['"]?\))/g, `$1$2?v=${BUILD_ID}$3`);
            const result = new CleanCSS().minify(content);
            if (result.styles) {
                fs.writeFileSync(fullPath, result.styles);
                console.log(`Minified CSS: ${fullPath}`);
            }
        } else if (file.endsWith('.html')) {
            let content = fs.readFileSync(fullPath, 'utf8');
            content = content.replace(/(\.(?:css|js|webp|png|jpg|svg))(["'])/g, `$1?v=${BUILD_ID}$2`);
            fs.writeFileSync(fullPath, content);
            console.log(`Versioned HTML: ${fullPath}`);
        }
    }
}

async function build() {
    console.log('Starting build process...');
    await processDirectory(distDir);
    console.log('Build complete! Output in /dist');
}

build();
