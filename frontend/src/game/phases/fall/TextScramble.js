export class TextScramble {
    constructor(el) {
        if (el.textScrambleInstance) {
            el.textScrambleInstance.destroy();
        }
        el.textScrambleInstance = this;

        this.el = el;
        this.charSets = {
            tech1: '!<>-_\\/[]{}—=+*^?#_',
            tech2: '!<>-_\\/[]{}—=+*^?#$%&()~',
            math: '01︎10︎101︎01︎+=-×÷',
            cryptic: '¥¤§Ω∑∆√∞≈≠≤≥',
            mixed: 'あ㐀明る日¥£€$¢₽₹₿',
            alphabet: 'abcdefghijklmnopqrstuvwxyz',
            matrix1: 'ラドクリフマラソンわたしワタシんょンョたばこタバコとうきょうトウキョウ',
            matrix2: '日ﾊﾐﾋｰｳｼﾅﾓﾆｻﾜﾂｵﾘｱﾎﾃﾏｹﾒｴｶｷﾑﾕﾗｾﾈｽﾀﾇﾍ',
            matrix3: '字型大小女巧偉周年',
            matrix4: '九七二人入八力十下三千上口土夕大女子小山川五天中六円手文日月木水火犬王正出本右四左玉生田白目石立百年休先名字早気竹糸耳虫村男町花見貝赤足車学林空金雨青草音',
            emoji1: Array.from('😀😁😂🤣😃😄😅😆😉😊😋😎😍😘🥰😗😙😚🤗🤔😐😑😶🙄😏😮😯😲😴🤤🤤😪😵🤯🤪🤩🥳🥺🥵🥴🥺'),
            emoji2: Array.from('🏠🏢🏥🏦🏨🏫🏬🏭🏯🏰🏟️🎡🎢🎠⛲🎪🗼🗽🗿🌉'),
            emoji3: Array.from('🍎🍊🍋🍌🍉🍇🍓🍈🍒🍑🥭🍍🥥🥝🥑🍆🥕🌽🌶️🍄🌰🍞')
        };
        
        this.chars = this.charSets.tech1;
        this.revealSpeed = 1;
        this.baseChangeFrequency = 0;
        this.changeFrequency = this.baseChangeFrequency;
        this.highlightColor = '#00ff88';
        this.glowIntensity = 8;
        this.activeGlowIntensity = 12;
        this.queue = [];
        this.frame = 0;
        this.frameRequest = null;
        this.resolve = null;
        this.matchedCount = 0;

        this.update = this.update.bind(this);
    }

    /**
     * Updates the intensity.
 * @param {any} deep - The deep.
     */
    updateIntensity(deep) {
        const startThreshold = 1500;
        const maxDepth = 20000;

        if (deep < startThreshold) {
            this.changeFrequency = 0;
        } else {
            const factor = Math.min((deep - startThreshold) / (maxDepth - startThreshold), 1);
            const minFrequency = 0.02;
            const maxFrequency = 0.9;
            this.changeFrequency = minFrequency + (factor * (maxFrequency - minFrequency));
        }
        
        this.revealSpeed = 5; 
    }

    /**
     * Set the char set.
 * @param {any} setName - The setName.
     */
    setCharSet(setName) {
        if (this.charSets[setName]) {
            this.chars = this.charSets[setName];
            return true;
        }
        return false;
    }

    /**
     * Set the text.
 * @param {any} newText - The newText.
     */
    setText(newText) {
        const oldText = this.el.innerText;
        const length = Math.max(oldText.length, newText.length);
        const promise = new Promise(resolve => this.resolve = resolve);
        this.queue = [];

        for (let i = 0; i < length; i++) {
            const from = oldText[i] || '';
            const to = newText[i] || '';
            const start = Math.floor(Math.random() * (40 / this.revealSpeed));
            const end = start + Math.floor(Math.random() * (40 / this.revealSpeed));
            this.queue.push({ from, to, start, end });
        }

        cancelAnimationFrame(this.frameRequest);
        this.frame = 0;
        this.update();
        return promise;
    }

    /**
     * Updates.
     */
    update() {
        let output = '';
        const matched = this.matchedCount || 0;

        for (let i = 0, n = this.queue.length; i < n; i++) {
            let { from, to, start, end, char } = this.queue[i];

            if (i < matched) {
                output += `<span style="color: #abff44ff;">${to.toUpperCase()}</span>`;
            } else if (this.frame >= end) {
                if (Math.random() < this.changeFrequency) {
                    char = this.chars[Math.floor(Math.random() * this.chars.length)];
                    output += `<span class="scrambling" style="color: ${this.highlightColor}; text-shadow: 0 0 ${this.activeGlowIntensity}px currentColor;">${char}</span>`;
                } else {
                    output += to.toUpperCase();
                }
            } 
            else if (this.frame >= start) {
                if (this.changeFrequency > 0) {
                    if (!char || Math.random() < this.changeFrequency) {
                        char = this.chars[Math.floor(Math.random() * this.chars.length)];
                        this.queue[i].char = char;
                    }
                    output += `<span class="scrambling" style="color: ${this.highlightColor}; text-shadow: 0 0 ${this.activeGlowIntensity}px currentColor;">${char}</span>`;
                } else {
                    output += to.toUpperCase();
                }
            } else {
                output += from.toUpperCase();
            }
        }

        this.el.innerHTML = output;

        this.frameRequest = requestAnimationFrame(this.update);
        this.frame++;
    }

    /**
     * Destroies.
     */
    destroy() {
        cancelAnimationFrame(this.frameRequest);
        if (this.el) {
            this.el.textScrambleInstance = null;
        }
    }
}
