const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, 'frontend/src');

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

const allJsFiles = getFiles(srcDir);

for (const file of allJsFiles) {
    const content = fs.readFileSync(file, 'utf8');
    const lines = content.split('\n');
    lines.forEach((line, index) => {
        if (line.includes('FlashMessageManager.show') && !line.includes('LanguageManager.t') && !line.includes('error.message')) {
            if (!line.includes('function') && !line.includes('export class')) {
                console.log(`${path.basename(file)}:${index + 1}: ${line.trim()}`);
            }
        }
    });
}
