export function createWordlLayout() {
    const height = 30;
    let worldLayout = [];
    let tab_width = [];
    let tab_lettre = ["A","B","C","D","E","F","G","H","I","J","K","L","M","N","O","P","Q","R","S","T","U","V","W","X","Y","Z"];
    for (let i = 0; i < height; i++) {
        let number = Math.random();
        if (number < 0.1) tab_width.push(2);
        else if (number < 0.2) tab_width.push(4);
        else tab_width.push(3);
    }
    let tab_decalage = [];
    for (let i = 0; i < tab_width.length; i++) {
        if (tab_width[i] > 2) {
            let temp1 = -Math.floor(Math.random() * (tab_width[i] - 1))
            tab_decalage.push(temp1);
        } else {
            tab_decalage.push(0);
        }
    }

    let test = 0;
    for (let y = 0; y < tab_width.length; y++) {
        if (y % 2 === 0) test += 1;
        for (let x = 0; x < tab_width[y]; x++) {
            let min_decal= 0;
            let genere_leter = tab_lettre[Math.floor(Math.random() * 26)];
            if (y % 2 === 1) min_decal = 0.5;
            worldLayout.push({
                id: `${x + min_decal + test + tab_decalage[y]}-${-y}`,
                x: x + min_decal + test + tab_decalage[y],
                y: -y,
                letter: genere_leter,
                isPressed: false,
            });
        }
    }
    return worldLayout;
}

export const WORLD_LAYOUT = createWordlLayout();
