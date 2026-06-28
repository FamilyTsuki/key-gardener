class TextModerator {
    constructor() {
        const squashedForbidden = [
            "merde", "merdike", "emerde", "putain", "pute", "filsdepute", "fdp", 
            "salope", "salopard", "conard", "conase", "con", "conerie", "encule", 
            "ancule", "chier", "chiant", "chiasse", "enfoire", "branleur", "branlete", 
            "branler", "petasse", "poufiasse", "grogniasse", "trouduc", "troudubuc", 
            "pd", "pede", "tapete", "tarlouze", "gouine", "chibre", "foutre", 
            "godemiche", "suceur", "sueuse", "broteur", "fuk", "motherfuk", "shit", 
            "bulshit", "ashole", "bich", "bastard", "cunt", "dik", "dikhead", "cok", 
            "pusy", "sex", "gangbang", "blowjob", "handjob", "cum", "jiz", "slut", 
            "wore", "hoker", "twat", "wanker", "prik", "dildo", "bite", "couile", 
            "chate", "nique", "ntm", "clito", "nude", "porn", "nsfw", "xnxx", "pornhub"
        ];

        const squashedSelfHarm = [
            "setuer", "suicide", "sependre", "metrefinasasjours", "scarifier", 
            "secouperlesveines", "kilmyself", "endmylife", "cutmywrists", "commitsuicide"
        ];

        this.forbiddenRegex = new RegExp(squashedForbidden.join('|'), 'i');
        this.selfHarmRegex = new RegExp(squashedSelfHarm.join('|'), 'i');
    }

    /**
     * Normalizes and squashes text to make bypass attempts (such as repeating letters or substituting characters) harder.
     * @param {string} text - The input text to process.
     * @returns {string} The normalized and squashed text string.
     */
    squashText(text) {
        if (!text) return "";

        return text
            .toLowerCase()
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .replace(/0/g, "o").replace(/1/g, "i").replace(/3/g, "e")
            .replace(/4/g, "a").replace(/5/g, "s").replace(/8/g, "b")
            .replace(/@/g, "a").replace(/\$/g, "s")
            .replace(/[^a-z0-9]/g, "")
            .replace(/(.)\1+/g, "$1");
    }


    /**
     * Checks for ASCII Art patterns (e.g. braille characters, repeated special characters) to detect visual spam or bypasses.
     * @param {string} text - The text to check.
     * @returns {boolean} True if ASCII art patterns are detected, false otherwise.
     */
    checkAsciiArt(text) {
        if (!text) return false;
        
        const brailleRegex = /[\u2800-\u28FF]/g;
        const brailleMatches = text.match(brailleRegex);
        if (brailleMatches && brailleMatches.length > 5) {
            return true;
        }

        const specialArtRegex = /[\u0F00-\u0FFF\u3000-\u30FF\u2000-\u206F\u2500-\u257F]/g;
        const specialMatches = text.match(specialArtRegex);
        if (specialMatches && specialMatches.length > 10) {
            return true;
        }

        const repeatedSymbolRegex = /([^a-zA-Z0-9\s\.,!?'"-])\1{5,}/g;
        if (repeatedSymbolRegex.test(text)) {
            return true;
        }

        return false;
    }

    /**
     * Analyzes text for self-harm keywords and patterns.
     * @param {string} squashedText - The squashed version of the text.
     * @param {string} originalText - The original text before squashing.
     * @returns {boolean} True if self-harm indicators are detected, false otherwise.
     */
    checkLocalSelfHarm(squashedText, originalText) {
        const lower = originalText.toLowerCase();
        if (lower.includes("corde") && (lower.includes("gravit") || lower.includes("pendre"))) {
            return true;
        }
        return this.selfHarmRegex.test(squashedText);
    }

    /**
     * Main moderation entrance: checks text locally, then falls back to OpenAI Moderation API if configured.
     * @param {string} text - The user content to moderate.
     * @returns {Promise<boolean>} Resolves to true if inappropriate content is detected, false otherwise.
     */
    async hasInappropriateContent(text) {
        if (!text) return false;

        const squashed = this.squashText(text);

        if (this.forbiddenRegex.test(squashed) || this.checkLocalSelfHarm(squashed, text) || this.checkAsciiArt(text)) {
            return true;
        }

        const apiKey = process.env.OPENAI_API_KEY;
        if (apiKey) {
            return await this.checkWithOpenAILLM(text);
        }

        return false;
    }

    /**
     * Checks user content with OpenAI Chat Completion API to evaluate appropriateness.
     * @param {string} text - The text content to analyze.
     * @returns {Promise<boolean>} Resolves to true if OpenAI flags the content, false otherwise.
     */
        async checkWithOpenAILLM(text) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 3000);

        try {
            const response = await fetch("https://api.openai.com/v1/chat/completions", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`
                },
                body: JSON.stringify({
                    model: "gpt-4o-mini",
                    messages: [
                        { 
                            role: "system", 
                            content: "You are a strict, multilingual chat moderator (expert in English and French). Analyze the user's text and detect: 1. Obfuscated or camouflaged bad words (e.g., 'm3rde', 'f.u.c.k', 'p u t e', leetspeak). 2. Profanity, insults, toxicity, harassment, or hate speech (racism, homophobia, etc.). 3. Explicit sexual content, NSFW descriptions, or inappropriate roleplay. 4. Encouragement of self-harm, suicide, or real-world violence. 5. ASCII art representing inappropriate shapes. 6. Inappropriate emojis or emoji combinations (e.g., sexual implications with eggplant 🍆, peach 🍑, or sweat drops 💦). If the text contains ANY of the above, reply ONLY with the exact word 'BLOCKED'. If the text is safe, benign, or harmless gaming banter, reply ONLY with the exact word 'OK'. Do not provide any explanations, punctuation, or additional text." 
                        },
                        { role: "user", content: text }
                    ],
                    max_tokens: 2,
                    temperature: 0
                }),
                signal: controller.signal
            });

            clearTimeout(timeoutId);

            if (response.ok) {
                const data = await response.json();
                const reply = data.choices?.[0]?.message?.content?.trim().toUpperCase();
                return reply === "BLOCKED";
            }
        } catch (error) {
            console.error("OpenAI moderation error:", error);
        }
        return false;
    }
}

module.exports = new TextModerator();
