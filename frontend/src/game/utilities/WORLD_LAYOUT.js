/**
 * Creates and returns the layout of the world map.
 * Generates an array of tile objects with coordinates, letters, and properties.
 *
 * @returns {Array<Object>} An array of tile objects representing the world layout.
 */
export function createWordlLayout(introType = "none", height = 30) {
    let worldLayout = [];

    if (introType === "skyfall") {
        worldLayout.push({ id: "intro-s-1", x: 0.5, y: 3, letter: null, isPressed: false });
        worldLayout.push({ id: "intro-s-2", x: 1.5, y: 3, letter: null, isPressed: false });
        worldLayout.push({ id: "intro-s-3", x: 0, y: 2, letter: null, isPressed: false });
        worldLayout.push({ id: "intro-s-4", x: 1, y: 2, letter: null, isPressed: false, role: "spawn" });
        worldLayout.push({ id: "intro-s-5", x: 2, y: 2, letter: null, isPressed: false });
        worldLayout.push({ id: "intro-s-6", x: 0.5, y: 1, letter: null, isPressed: false });
        worldLayout.push({ id: "intro-s-7", x: 1.5, y: 1, letter: null, isPressed: false });
    } else if (introType === "staircase") {
        worldLayout.push({ id: "intro-st-1", x: 1.5, y: 5, letter: null, isPressed: false, role: "spawn", baseY: 6.0 });
        worldLayout.push({ id: "intro-st-2", x: 1.0, y: 4, letter: null, isPressed: false, role: "stairs", baseY: 4.5 });
        worldLayout.push({ id: "intro-st-3", x: 1.5, y: 3, letter: null, isPressed: false, role: "stairs", baseY: 3.0 });
        worldLayout.push({ id: "intro-st-4", x: 1.0, y: 2, letter: null, isPressed: false, role: "stairs", baseY: 1.5 });
        worldLayout.push({ id: "intro-st-5", x: 1.5, y: 1, letter: null, isPressed: false, role: "stairs", baseY: 0.5 });
    }

    let tab_width = [];
    let tab_lettre = [
        "A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L", "M",
        "N", "O", "P", "Q", "R", "S", "T", "U", "V", "W", "X", "Y", "Z",
    ];
    for (let i = 0; i < height; i++) {
        let number = Math.random();
        if (number < 0.1) tab_width.push(2);
        else if (number < 0.2) tab_width.push(4);
        else tab_width.push(3);
    }
    let offsetArray = [];
    for (let i = 0; i < tab_width.length; i++) {
        if (i >= 15 && i < 20) {
            tab_width[i] = tab_width[14];
        }

        if (tab_width[i] > 2) {
            let temp1 = -Math.floor(Math.random() * (tab_width[i] - 1));
            offsetArray.push(temp1);
        } else {
            offsetArray.push(0);
        }

        if (i >= 15 && i < 20) {
            offsetArray[i] = offsetArray[14];
        }
    }

    let offsetAdjustment = 0;
    let recentlyUsed = [];
    let lastCenterIndex = 0;
    for (let y = 0; y < tab_width.length; y++) {
        if (y % 2 === 0) offsetAdjustment += 1;

        for (let x = 0; x < tab_width[y]; x++) {
            let minOffset = 0;
            if (y % 2 === 1) minOffset = 0.5;

            let availableLetters = tab_lettre.filter(l => !recentlyUsed.includes(l));
            if (availableLetters.length === 0) { 
                availableLetters = tab_lettre; 
                recentlyUsed = []; 
            }
            let genere_leter = availableLetters[Math.floor(Math.random() * availableLetters.length)];
            recentlyUsed.push(genere_leter);
            if (recentlyUsed.length > 24) {
                recentlyUsed.shift();
            }

            let posX = x + minOffset + offsetAdjustment + offsetArray[y];

            if (x === Math.floor(tab_width[y] / 2)) {
                lastCenterIndex = x + offsetArray[y];
            }

            worldLayout.push({
                id: `${posX}-${-y}`,
                x: posX,
                y: -y,
                letter: genere_leter,
                isPressed: false,
            });
        }
    }

    let y_start = height;
    let island_widths = [2, 3, 5, 7, 7, 5, 3];
    for (let i = 0; i < island_widths.length; i++) {
        let y = y_start + i;
        if (y % 2 === 0) offsetAdjustment += 1;
        let actualWidth = island_widths[i];

        let minOffset = -Math.floor(actualWidth / 2);
        let totalOffset = lastCenterIndex - Math.floor(actualWidth / 2);

        for (let x = 0; x < actualWidth; x++) {
            let posX = x + minOffset + offsetAdjustment + totalOffset;

            let letterValue = null;
            if (x === Math.floor(actualWidth / 2) && i <= 4) {
                letterValue = (i + 1).toString();
            }

            worldLayout.push({
                id: `island-${posX}-${-y}`,
                x: posX,
                y: -y,
                letter: letterValue,
                isPressed: false,
                isIsland: true 
            });
        }
    }

    return worldLayout;
}

export const WORLD_LAYOUT = createWordlLayout();
