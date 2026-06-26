import { el, clear } from "../../../core/utils/DOMBuilder.js";
import { LanguageManager } from "../../../core/utils/LanguageManager.js";
import { gsap } from "/node_modules/gsap/index.js";

export class DuelUI {
    constructor(phase) {
        this.phase = phase;
        this.spellsUI = null;
        this.defensesUI = null;
        this.hpUI = null;
        this.jailUI = null;
        this.stunUI = null;
        this.endOverlay = null;
    }

    buildUI(localData, remoteData) {
        const hud = document.getElementById("player-hud");
        if (hud) hud.classList.remove("hidden");

        const bossUI = document.getElementById("boss-ui");
        if (bossUI) bossUI.classList.add("hidden");

        this.hpUI = el("div", { id: "duel-hp-ui", className: "duel-hp-ui" },
            el("div", { className: "duel-hud-panel" },
                el("span", { className: "duel-hud-name duel-hud-name-local" }, localData.username),
                el("div", { className: "duel-hud-bar" },
                    el("div", { id: "hp-local-fill", className: "duel-hud-fill duel-hud-fill-local" })
                ),
                el("span", { className: "duel-hud-hp" },
                    el("span", { id: "hp-local" }, localData.hp), " HP"
                )
            ),
            el("div", { className: "duel-hud-panel duel-hud-panel-right" },
                el("span", { className: "duel-hud-name duel-hud-name-remote" }, remoteData.username),
                el("div", { className: "duel-hud-bar" },
                    el("div", { id: "hp-remote-fill", className: "duel-hud-fill duel-hud-fill-remote" })
                ),
                el("span", { className: "duel-hud-hp" },
                    el("span", { id: "hp-remote" }, remoteData.hp), " HP"
                )
            )
        );
        document.body.appendChild(this.hpUI);

        this.spellsUI = document.getElementById("spell-list-container");
        if (this.spellsUI) {
            this.spellsUI.className = "duel-spells-ui";
            this.spellsUI.innerHTML = "";
        }

        this.defensesUI = el("div", { className: "duel-defenses-ui" });
        document.body.appendChild(this.defensesUI);

        document.body.appendChild(el("div", { id: "duel-announcer-container" }));
    }

    updateSpellsUI(availableSpells, currentTypedSpell) {
        if (!this.spellsUI) return;
        clear(this.spellsUI);

        const h4 = el("h4", { className: "duel-spells-title" }, LanguageManager.t("duel.spellsTitle"));
        const ul = el("ul", { className: "duel-spells-list" });

        availableSpells.forEach(s => {
            const li = el("li", { className: "duel-spell-item" });
            
            let icon = s.type === 'heavy' ? "🔥" : s.type === 'random' ? "🎲" : "⚡";
            let label = s.type === 'heavy' ? LanguageManager.t("duel.labelHeavy") : s.type === 'random' ? LanguageManager.t("duel.labelRandom") : LanguageManager.t("duel.labelLight");

            if (s.cooldownRemaining > 0) {
                const secs = (s.cooldownRemaining / 1000).toFixed(1);
                li.appendChild(el("span", { className: "duel-spell-cooldown" }, `${icon} [${label}] (${secs}s)`));
            } else {
                li.appendChild(document.createTextNode(`${icon} [${label}] `));
                let match = true;
                for (let i = 0; i < s.word.length; i++) {
                    if (i < currentTypedSpell.length && match) {
                        if (s.word[i].toLowerCase() === currentTypedSpell[i].toLowerCase()) {
                            li.appendChild(el("span", { className: "duel-spell-char-match" }, s.word[i]));
                        } else {
                            li.appendChild(el("span", { className: "duel-spell-char-error" }, s.word[i]));
                            match = false;
                        }
                    } else {
                        li.appendChild(el("span", { className: "duel-spell-char-normal" }, s.word[i]));
                    }
                }
            }
            ul.appendChild(li);
        });

        this.spellsUI.appendChild(h4);
        this.spellsUI.appendChild(ul);
    }

    updateDefensesUI(projectiles, localData, currentTypedDefense) {
        if (!this.defensesUI) return;
        clear(this.defensesUI);

        this.defensesUI.appendChild(el("h3", { className: "duel-defenses-title" }, LanguageManager.t("duel.defensesTitle")));

        const incoming = projectiles.filter(p => p.targetId == localData.id);
        if (incoming.length === 0) {
            this.defensesUI.appendChild(el("p", { className: "duel-no-incoming" }, LanguageManager.t("duel.noProjectiles")));
            return;
        }

        incoming.forEach(p => {
            const div = el("div", { className: "duel-defense-block" });
            div.appendChild(document.createTextNode("🛡️ "));

            let match = true;
            for (let i = 0; i < p.defenseWord.length; i++) {
                if (i < currentTypedDefense.length && match) {
                    if (p.defenseWord[i].toLowerCase() === currentTypedDefense[i].toLowerCase()) {
                        div.appendChild(el("span", { className: "duel-spell-char-match" }, p.defenseWord[i]));
                    } else {
                        div.appendChild(el("span", { className: "duel-spell-char-error" }, p.defenseWord[i]));
                        match = false;
                    }
                } else {
                    div.appendChild(el("span", { className: "duel-spell-char-normal" }, p.defenseWord[i]));
                }
            }
            this.defensesUI.appendChild(div);
        });
    }

    activateJailUI() {
        this.jailUI = el("div", { id: "jail-ui", className: "jail-ui" },
            el("div", { className: "status-overlay-jail" }),
            el("div", { className: "status-message-box jail-message" },
                el("span", { className: "status-icon" }, "🔒"),
                el("div", { id: "jail-content-box" })
            )
        );
        document.body.appendChild(this.jailUI);
    }

    updateJailUI(jailEscapeWord, currentTypedJail) {
        const contentBox = document.getElementById("jail-content-box");
        if (!contentBox) return;
        clear(contentBox);

        contentBox.appendChild(el("span", { className: "status-title" }, LanguageManager.t("duel.jailedTitle")));
        contentBox.appendChild(el("br"));
        contentBox.appendChild(el("span", { className: "jail-subtitle" }, LanguageManager.t("duel.jailedSubtitle")));
        contentBox.appendChild(el("br"));
        contentBox.appendChild(el("br"));

        const wordSpan = el("span", { className: "jail-word" });
        for (let i = 0; i < jailEscapeWord.length; i++) {
            if (i < currentTypedJail.length) {
                wordSpan.appendChild(el("span", { className: "duel-spell-char-match" }, jailEscapeWord[i]));
            } else {
                wordSpan.appendChild(el("span", { className: "duel-spell-char-normal" }, jailEscapeWord[i]));
            }
        }
        contentBox.appendChild(wordSpan);
    }

    removeJailUI() {
        if (this.jailUI) {
            this.jailUI.remove();
            this.jailUI = null;
        }
    }

    updateStunUI(isStunned) {
        if (isStunned) {
            if (!this.stunUI) {
                this.stunUI = el("div", { id: "stun-ui", className: "stun-ui" },
                    el("div", { className: "status-overlay-stun" }),
                    el("div", { className: "status-message-box stun-message" },
                        el("span", { className: "status-icon" }, "⚡"),
                        el("span", { className: "status-text" }, LanguageManager.t("duel.stunnedMessage"))
                    )
                );
                document.body.appendChild(this.stunUI);
            }
        } else {
            if (this.stunUI) {
                this.stunUI.remove();
                this.stunUI = null;
            }
        }
    }

    showEndOverlay(won, wpm, durationSecs, successfulStrokesCount) {
        const overlayClass = won ? "duel-end-victory" : "duel-end-defeat";
        const titleText = won ? (LanguageManager.t("duel.victoryTitle")) : (LanguageManager.t("duel.defeatTitle"));
        const subtitleText = won ? (LanguageManager.t("duel.victorySubtitle") || "Vous avez triomphé dans l'arène !") : (LanguageManager.t("duel.defeatSubtitle"));
        const icon = won ? "🏆" : "💀";
        const durationText = `${Math.floor(durationSecs / 60)}m ${durationSecs % 60}s`;

        this.endOverlay = el("div", { className: `duel-end-overlay ${overlayClass}` },
            el("div", { className: "duel-end-box" },
                el("div", { className: "duel-end-badge" }, icon),
                el("h1", { className: "duel-end-title" }, titleText),
                el("p", { className: "duel-end-subtitle" }, subtitleText),
                el("div", { className: "duel-end-stats" },
                    el("div", { className: "duel-end-stat-item" }, el("span", { className: "duel-end-stat-label" }, "Mots par Minute (WPM)"), el("span", { className: "duel-end-stat-val" }, wpm)),
                    el("div", { className: "duel-end-stat-item" }, el("span", { className: "duel-end-stat-label" }, "Frappes Réussies"), el("span", { className: "duel-end-stat-val" }, successfulStrokesCount)),
                    el("div", { className: "duel-end-stat-item" }, el("span", { className: "duel-end-stat-label" }, "Durée du Combat"), el("span", { className: "duel-end-stat-val" }, durationText))
                ),
                el("button", { 
                    className: "btn-primary duel-end-btn",
                    onclick: () => {
                        this.endOverlay.remove();
                        this.endOverlay = null;
                        window.appRouter.navigateTo("/social");
                    }
                }, LanguageManager.t("social.closeBtn"))
            )
        );
        document.body.appendChild(this.endOverlay);
    }

    announceSpell(attackerName, spellType) {
        const spellNames = {
            light: LanguageManager.t("duel.spellLight"), heavy: LanguageManager.t("duel.spellHeavy"),
            stun: LanguageManager.t("duel.spellStun"), heal: LanguageManager.t("duel.spellHeal"),
            jail: LanguageManager.t("duel.spellJail"), slow: LanguageManager.t("duel.spellSlow")
        };
        const spellColors = { light: "#ffff00", heavy: "#ff3333", stun: "#00ffff", heal: "#00ff66", jail: "#ffaa00", slow: "#00aaff" };

        const container = document.getElementById("duel-announcer-container");
        if (!container) return;

        const announcement = el("div", { className: "spell-announcement", style: `color: ${spellColors[spellType] || "#ffffff"}` }, `${attackerName} : ${spellNames[spellType] || LanguageManager.t("duel.spellDefault")}`);
        container.appendChild(announcement);

        gsap.fromTo(announcement, { opacity: 0, y: -20 }, { opacity: 1, y: 0, duration: 0.4 });
        gsap.to(announcement, { opacity: 0, y: -30, duration: 0.5, delay: 1.8, onComplete: () => announcement.remove() });
    }

    startCountdown(onCompleteCallback) {
        const countdownOverlay = el("div", { id: "duel-countdown-overlay", className: "duel-countdown-overlay" });
        const countdownText = el("div", { className: "duel-countdown-text" });
        countdownOverlay.appendChild(countdownText);
        document.body.appendChild(countdownOverlay);

        const steps = ["3", "2", "1", LanguageManager.t("duel.go")];
        const timeline = gsap.timeline({
            onComplete: () => {
                countdownOverlay.remove();
                onCompleteCallback();
            }
        });

        timeline.fromTo(countdownOverlay, { opacity: 0 }, { opacity: 1, duration: 0.3 });
        steps.forEach((text) => {
            timeline.call(() => countdownText.textContent = text);
            timeline.fromTo(countdownText, { scale: 0.5, opacity: 0 }, { scale: 1.2, opacity: 1, duration: 0.4, ease: "back.out(2)" });
            timeline.to(countdownText, { scale: 1.5, opacity: 0, duration: 0.4, delay: 0.2, ease: "power2.in" });
        });
        timeline.to(countdownOverlay, { opacity: 0, duration: 0.3 }, "-=0.3");
    }

    cleanup() {
        const announcerContainer = document.getElementById("duel-announcer-container");
        if (announcerContainer) announcerContainer.remove();

        const countdownOverlay = document.getElementById("duel-countdown-overlay");
        if (countdownOverlay) countdownOverlay.remove();

        if (this.spellsUI) {
            this.spellsUI.style.position = ""; this.spellsUI.style.bottom = ""; this.spellsUI.style.right = ""; this.spellsUI.style.top = ""; this.spellsUI.style.left = "";
            this.spellsUI.classList.add("none");
        }
        if (this.defensesUI) this.defensesUI.remove();
        const hpUI = document.getElementById("duel-hp-ui");
        if (hpUI) hpUI.remove();
        if (this.hpUI) { this.hpUI.remove(); this.hpUI = null; }

        this.removeJailUI();
        this.updateStunUI(false);
        if (this.endOverlay) { this.endOverlay.remove(); this.endOverlay = null; }
    }
}
