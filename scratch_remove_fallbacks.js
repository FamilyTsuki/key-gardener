const fs = require('fs');
const path = require('path');
function walk(dir) {
    let results = [];
    const list = fs.readdirSync(dir);
    list.forEach(file => {
        file = path.join(dir, file);
        const stat = fs.statSync(file);
        if (stat && stat.isDirectory()) {
            results = results.concat(walk(file));
        } else if (file.endsWith('.js') || file.endsWith('.ts')) {
            results.push(file);
        }
    });
    return results;
}
const files = walk('C:/Users/bidou/Documents/perso/projet/Final-Project/frontend/src');
let changedFiles = 0;
files.forEach(file => {
    let content = fs.readFileSync(file, 'utf8');
    let original = content;
    
    // Replace LanguageManager.t(...) || "Fallback"
    // Handles double and single quotes
    content = content.replace(/(LanguageManager\.t\([^)]+\))\s*\|\|\s*(["'])[^"']*?\2/g, '$1');
    
    // Handles LanguageManager.t(key, {...}) || "Fallback"
    content = content.replace(/(LanguageManager\.t\([^)]+,\s*\{[^}]+\}\))\s*\|\|\s*(["'])[^"']*?\2/g, '$1');
    
    // Sometimes people write data.message || LanguageManager.t(...) || "Fallback"
    // Let's do a broader replace for any || "..." or || '...' after LanguageManager.t
    // To be safe, just run it a few times if there are multiple.
    content = content.replace(/(LanguageManager\.t\([^)]+\))\s*\|\|\s*(["'])[^"']*?\2/g, '$1');
    
    // What if it's `data.message || LanguageManager.t("profile.userNotFound") || "User not found"`?
    // In that case, the first replace handles `LanguageManager.t("profile.userNotFound") || "User not found"` -> `LanguageManager.t("profile.userNotFound")`
    
    if (original !== content) {
        fs.writeFileSync(file, content);
        changedFiles++;
        console.log('Updated', file);
    }
});
console.log('Total files updated:', changedFiles);
