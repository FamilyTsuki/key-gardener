const fs = require('fs');
const path = require('path');

const viewsDir = path.join(__dirname, 'frontend/src/website/views');
const componentsDir = path.join(__dirname, 'frontend/src/website/components');
const enFile = path.join(__dirname, 'frontend/src/core/locales/en.js');
const frFile = path.join(__dirname, 'frontend/src/core/locales/fr.js');

function getFiles(dir, filesList = []) {
    if (!fs.existsSync(dir)) return filesList;
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const filePath = path.join(dir, file);
        if (fs.statSync(filePath).isDirectory()) {
            getFiles(filePath, filesList);
        } else if (filePath.endsWith('.js')) {
            filesList.push(filePath);
        }
    }
    return filesList;
}

const allJsFiles = [...getFiles(viewsDir), ...getFiles(componentsDir)];

let enContent = fs.readFileSync(enFile, 'utf8');
let frContent = fs.readFileSync(frFile, 'utf8');

// Regex to extract all LanguageManager.t('key') or "key"
const tRegex = /LanguageManager\.t\(\s*['"`]([^'"`]+)['"`]\s*\)/g;
const usedKeys = new Set();

for (const file of allJsFiles) {
    const content = fs.readFileSync(file, 'utf8');
    let match;
    while ((match = tRegex.exec(content)) !== null) {
        usedKeys.add(match[1]);
    }
}

console.log("=== Used translation keys not found in en.js ===");
for (const key of usedKeys) {
    const keyPart = key.split('.').pop();
    if (!enContent.includes(keyPart)) {
        console.log(key);
    }
}

console.log("\n=== Potential hardcoded text in el() ===");
// Find el("tag", {...}, "Hardcoded text")
const hardcodedRegex = /el\(\s*['"][a-zA-Z0-9_-]+['"]\s*,\s*\{[^}]*\}\s*,\s*['"`]([^'"`]+)['"`]/g;
for (const file of allJsFiles) {
    const content = fs.readFileSync(file, 'utf8');
    let match;
    while ((match = hardcodedRegex.exec(content)) !== null) {
        const text = match[1].trim();
        // Ignore single characters, empty strings, and known non-text
        if (text.length > 1 && !text.startsWith('url(') && !text.includes('px') && !text.includes('100%') && !text.includes('var(') && text !== 'div' && text !== 'span') {
            console.log(`${path.basename(file)}: "${text}"`);
        }
    }
}

// Find raw strings that are not part of el attributes but are child elements: 
// Example: el("a", { ... }, "GitHub")
// The hardcodedRegex above catches only if there's exactly 3 arguments and the third is a string.

// Let's also find fallback strings like: LanguageManager.t("...") || "Fallback"
const fallbackRegex = /LanguageManager\.t\(\s*['"`][^'"`]+['"`]\s*\)\s*\|\|\s*['"`]([^'"`]+)['"`]/g;
console.log("\n=== Fallback strings (LanguageManager.t(...) || 'Fallback') ===");
for (const file of allJsFiles) {
    const content = fs.readFileSync(file, 'utf8');
    let match;
    while ((match = fallbackRegex.exec(content)) !== null) {
        console.log(`${path.basename(file)}: "${match[1]}"`);
    }
}
