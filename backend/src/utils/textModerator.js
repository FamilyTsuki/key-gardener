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
     * Squashs the text.
 * @param {any} text - The text.
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
     * Checks the local self harm.
 * @param {any} squashedText - The squashedText.
 * @param {any} originalText - The originalText.
     */
    checkLocalSelfHarm(squashedText, originalText) {
        const lower = originalText.toLowerCase();
        if (lower.includes("corde") && (lower.includes("gravit") || lower.includes("pendre"))) {
            return true;
        }
        return this.selfHarmRegex.test(squashedText);
    }

    /**
     * Has the inappropriate content.
 * @param {any} text - The text.
     */
    async hasInappropriateContent(text) {
        if (!text) return false;

        const squashed = this.squashText(text);

        if (this.forbiddenRegex.test(squashed) || this.checkLocalSelfHarm(squashed, text)) {
            return true;
        }

        const apiKey = process.env.OPENAI_API_KEY;
        if (apiKey) {
            return await this.checkWithOpenAILLM(text);
        }

        return false;
    }

    /**
     * Checks the with open a i l l m.
 * @param {any} text - The text.
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
                            content: "Tu es un modérateur de chat très strict. D'abord, corrige mentalement l'orthographe, la grammaire et décode les abréviations de la phrase (ex: 'tg boufon' devient 'ta gueule bouffon', 'fdp' devient 'fils de pute'). Ensuite, analyse la phrase corrigée. Réponds uniquement par le mot 'BLOCKED' si le texte contient de la vulgarité, des insultes (même légères, camouflées ou abrégées), de la haine, du contenu sexuel ou inapproprié. Sinon, réponds 'OK'. Ne fais aucune phrase additionnelle." 
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
            console.error("OpenAI LLM check failed:", error);
        }
        return false;
    }
}

module.exports = new TextModerator();