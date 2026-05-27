/**
 * Creates and returns the layout of the world map.
 * Generates an array of tile objects with coordinates, letters, and properties.
 *
 * @returns {Array<Object>} An array of tile objects representing the world layout.
 */
export function createWordlLayout(hasBridgeEvent = false) {
    const height = 30;
    let worldLayout = [];
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
    let tab_decalage = [];
    for (let i = 0; i < tab_width.length; i++) {
        if (i >= 15 && i < 20) {
            tab_width[i] = tab_width[14];
        }

        if (tab_width[i] > 2) {
            let temp1 = -Math.floor(Math.random() * (tab_width[i] - 1));
            tab_decalage.push(temp1);
        } else {
            tab_decalage.push(0);
        }

        if (i >= 15 && i < 20) {
            tab_decalage[i] = tab_decalage[14];
        }
    }

    let test = 0;
    let lastCenterIndex = 0;
    for (let y = 0; y < tab_width.length; y++) {
        if (y % 2 === 0) test += 1;
        
        let isRavine = false;
        if (hasBridgeEvent && y >= 15 && y < 20) {
            isRavine = true;
        }

        for (let x = 0; x < tab_width[y]; x++) {
            let min_decal = 0;
            let genere_leter = isRavine ? null : tab_lettre[Math.floor(Math.random() * 26)];
            if (y % 2 === 1) min_decal = 0.5;

            let posX = x + min_decal + test + tab_decalage[y];

            if (x === Math.floor(tab_width[y] / 2)) {
                lastCenterIndex = x + tab_decalage[y];
            }

            let isTrigger = false;
            if (hasBridgeEvent && y === 14) {
                isTrigger = true;
            }

            worldLayout.push({
                id: `${posX}-${-y}`,
                x: posX,
                y: -y,
                letter: genere_leter,
                isPressed: false,
                isBridgeTrigger: isTrigger,
                isRavine: isRavine,
            });
        }
    }

    let y_start = height;
    let island_widths = [2, 3, 5, 7, 7, 5, 3];
    for (let i = 0; i < island_widths.length; i++) {
        let y = y_start + i;
        if (y % 2 === 0) test += 1;
        let w = island_widths[i];

        let min_decal = y % 2 === 1 ? 0.5 : 0;
        let decalage = lastCenterIndex - Math.floor(w / 2);

        for (let x = 0; x < w; x++) {
            let posX = x + min_decal + test + decalage;
            let isDoorCenter = i === 4 && x === Math.floor(w / 2);

            let letterValue = null;
            if (x === Math.floor(w / 2) && i <= 4) {
                letterValue = (i + 1).toString();
            }

            worldLayout.push({
                id: `island-${posX}-${-y}`,
                x: posX,
                y: -y,
                letter: letterValue,
                isPressed: false,
                isDoorTile: isDoorCenter,
            });
        }
    }

    return worldLayout;
}

export const WORLD_LAYOUT = createWordlLayout();
