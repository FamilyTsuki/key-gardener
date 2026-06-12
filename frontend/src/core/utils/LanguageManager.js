import { en } from "../locales/en.js";
import { fr } from "../locales/fr.js";

export class LanguageManager {
    static locales = { en, fr };
    
    /**
     * Set the current language and reload the page to apply changes.
     * @param {string} lang - The language code ('en' or 'fr').
     */
    static setLanguage(lang) {
        if (this.locales[lang]) {
            localStorage.setItem("app_lang", lang);
            window.location.reload();
        }
    }

    /**
     * Get the current language code.
     * @returns {string} The current language code.
     */
    static getLanguage() {
        return localStorage.getItem("app_lang") || "en";
    }

    /**
     * Tries to translate a raw English string (usually from backend) 
     * by looking it up in the 'backendErrors' locale dictionary.
     * @param {string} msg - The raw message to translate.
     * @returns {string} The translated message or original if not found.
     */
    static translateMessage(msg) {
        if (!msg) return "";
        const lang = this.getLanguage();
        if (this.locales[lang] && this.locales[lang].backendErrors && this.locales[lang].backendErrors[msg]) {
            return this.locales[lang].backendErrors[msg];
        }
        return msg;
    }

    /**
     * Get a translated string by its key path (e.g., 'home.title').
     * @param {string} key - The translation key path.
     * @param {Object} [params] - Optional parameters to replace in the string (e.g. { slot: 1 }).
     * @returns {string} The translated string or the key itself if not found.
     */
    static t(key, params = {}) {
        const lang = this.getLanguage();
        const keys = key.split('.');
        let val = this.locales[lang];
        
        for (const k of keys) {
            if (val && typeof val === 'object' && k in val) {
                val = val[k];
            } else {
                return key;
            }
        }
        
        if (typeof val === 'string') {
            const gameName = window.GAME_NAME || "Keyboard Survivor";
            val = val.replace(/{gameName}/g, gameName);
            
            if (Object.keys(params).length > 0) {
                for (const [paramKey, paramVal] of Object.entries(params)) {
                    val = val.replace(new RegExp(`{${paramKey}}`, 'g'), paramVal);
                }
            }
        }
        
        return val;
    }
}

document.documentElement.lang = LanguageManager.getLanguage();
