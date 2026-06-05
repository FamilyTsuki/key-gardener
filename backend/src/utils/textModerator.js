class TextModerator {
    constructor() {
        this.forbiddenPatterns = [
            /\bmerde[s]?\b/i,
            /\bmerdique[s]?\b/i,
            /\bemmerd(e|é|er|es|ement)[s]?\b/i,
            /\bputain[s]?\b/i,
            /\bpute[s]?\b/i,
            /\bfils\s*de\s*pute\b/i,
            /\bfdp\b/i,
            /\bsalo[p]{1,2}e[s]?\b/i,
            /\bsalop(ard)?[s]?\b/i,
            /\bconnard[s]?\b/i,
            /\bconna[s]{1,2}e[s]?\b/i,
            /\bcon[s]?\b/i,
            /\bconnerie[s]?\b/i,
            /\bencul(e|é|er|es|és|ées|eur|eurs)?\b/i,
            /\bancul(e|é|er|es|és|ées|eur|eurs)?\b/i,
            /\bchier\b/i,
            /\bchi(ant|asse)[s]?\b/i,
            /\benfoir(e|é)[s]?\b/i,
            /\bbranl(eur|ette|er)[s]?\b/i,
            /\bp[eé]tasse[s]?\b/i,
            /\bpouffiasse[s]?\b/i,
            /\bgrognasse[s]?\b/i,
            /\btrouduc\b/i,
            /\btrou\s*du\s*cul\b/i,
            /\bpd\b/i,
            /\bp[eé]d[eé][s]?\b/i,
            /\btapette[s]?\b/i,
            /\btarlouze[s]?\b/i,
            /\bgouine[s]?\b/i,
            /\bchibre[s]?\b/i,
            /\bfoutre\b/i,
            /\bgodemiche[t]?[s]?\b/i,
            /\bsuce(ur|use)?[s]?\b/i,
            /\bbrouteur[s]?\b/i,
            /\bfuck(ing|er|ers|ed)?\b/i,
            /\bmotherfucker[s]?\b/i,
            /\bshit[s]?\b/i,
            /\bbullshit\b/i,
            /\basshole[s]?\b/i,
            /\bbitch(es)?\b/i,
            /\bbastard[s]?\b/i,
            /\bcunt[s]?\b/i,
            /\bdick[s]?\b/i,
            /\bdickhead[s]?\b/i,
            /\bcock[s]?\b/i,
            /\bpussy\b/i,
            /\bsex[e]?[s]?\b/i,
            /\bgangbang[s]?\b/i,
            /\bblowjob[s]?\b/i,
            /\bhandjob[s]?\b/i,
            /\bcum[s]?\b/i,
            /\bjizz\b/i,
            /\bslut[s]?\b/i,
            /\bwhore[s]?\b/i,
            /\bhooker[s]?\b/i,
            /\btwat[s]?\b/i,
            /\bwanker[s]?\b/i,
            /\bprick[s]?\b/i,
            /\bdildo[s]?\b/i,
            /\bbite[s]?\b/i,
            /\bcouille[s]?\b/i,
            /\bchatte[s]?\b/i,
            /\bnique[r]?[s]?\b/i,
            /\bntm\b/i,
            /\bclito[s]?\b/i,
            /\bnude[s]?\b/i,
            /\bporn[o]?[s]?\b/i,
            /\bnsfw\b/i,
            /\bxnxx\b/i,
            /\bpornhub\b/i
        ];
        
        this.selfHarmPatterns = [
            /\bse\s+tuer\b/i,
            /\bsuicide[r]?[s]?\b/i,
            /\bse\s+pendre\b/i,
            /\bsuicider\b/i,
            /\bmettre\s+fin\s+a\s+ses\s+jours\b/i,
            /\bscarifier\b/i,
            /\bse\s+couper\s+les\s+veines\b/i,
            /\bkill\s+myself\b/i,
            /\bend\s+my\s+life\b/i,
            /\bcut\s+my\s+wrists\b/i,
            /\bcommit\s+suicide\b/i
        ];
    }

    normalizeText(text) {
        if (!text) {
            return "";
        }

        let normalized = text.toLowerCase();
        normalized = normalized.replace(/[\.\-\_\,\;\:\!\?\*\+\=\#\/\\]/g, "");
        normalized = normalized
            .replace(/0/g, "o")
            .replace(/1/g, "i")
            .replace(/3/g, "e")
            .replace(/4/g, "a")
            .replace(/5/g, "s")
            .replace(/8/g, "b")
            .replace(/@/g, "a")
            .replace(/\$/g, "s");

        return normalized;
    }

    checkLocalSelfHarm(text) {
        const lower = text.toLowerCase();
        
        if (lower.includes("corde") && (lower.includes("gravit") || lower.includes("pendre"))) {
            return true;
        }

        return this.selfHarmPatterns.some(pattern => pattern.test(text));
    }

    isLocallyFlagged(text) {
        return this.forbiddenPatterns.some(pattern => pattern.test(text));
    }

    async hasInappropriateContent(text) {
        if (!text) {
            return false;
        }

        const normalized = this.normalizeText(text);

        const isFlagged =
            this.isLocallyFlagged(text) ||
            this.isLocallyFlagged(normalized) ||
            this.checkLocalSelfHarm(text) ||
            this.checkLocalSelfHarm(normalized);

        if (isFlagged) {
            return true;
        }

        const apiKey = process.env.OPENAI_API_KEY;
        if (apiKey) {
            try {
                const response = await fetch("https://api.openai.com/v1/moderations", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "Authorization": `Bearer ${apiKey}`
                    },
                    body: JSON.stringify({ input: [text, normalized] })
                });

                if (response.ok) {
                    const data = await response.json();
                    if (data.results) {
                        return data.results.some(result => result.flagged);
                    }
                }
            } catch (error) {
                console.error("OpenAI moderation check failed:", error);
            }
        }

        return false;
    }
}

module.exports = new TextModerator();