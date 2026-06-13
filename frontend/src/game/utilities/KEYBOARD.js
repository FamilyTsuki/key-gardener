/**
 * Configuration for the keyboard layout, representing keys and their coordinates.
 * @constant {Array<Object>}
 */
export const AZERTY_LAYOUT = [
  { key: "A", x: 0, y: 0, isPressed: false },
  { key: "Z", x: 1, y: 0, isPressed: false },
  { key: "E", x: 2, y: 0, isPressed: false },
  { key: "R", x: 3, y: 0, isPressed: false },
  { key: "T", x: 4, y: 0, isPressed: false },
  { key: "Y", x: 5, y: 0, isPressed: false },
  { key: "U", x: 6, y: 0, isPressed: false },
  { key: "I", x: 7, y: 0, isPressed: false },
  { key: "O", x: 8, y: 0, isPressed: false },
  { key: "P", x: 9, y: 0, isPressed: false },
  { key: "Q", x: 0.5, y: 1, isPressed: false },
  { key: "S", x: 1.5, y: 1, isPressed: false },
  { key: "D", x: 2.5, y: 1, isPressed: false },
  { key: "F", x: 3.5, y: 1, isPressed: false },
  { key: "G", x: 4.5, y: 1, isPressed: false },
  { key: "H", x: 5.5, y: 1, isPressed: false },
  { key: "J", x: 6.5, y: 1, isPressed: false },
  { key: "K", x: 7.5, y: 1, isPressed: false },
  { key: "L", x: 8.5, y: 1, isPressed: false },
  { key: "M", x: 9.5, y: 1, isPressed: false },
  { key: "W", x: 1, y: 2, isPressed: false },
  { key: "X", x: 2, y: 2, isPressed: false },
  { key: "C", x: 3, y: 2, isPressed: false },
  { key: "V", x: 4, y: 2, isPressed: false },
  { key: "B", x: 5, y: 2, isPressed: false },
  { key: "N", x: 6, y: 2, isPressed: false },
];

export const QWERTY_LAYOUT = [
  { key: "Q", x: 0, y: 0, isPressed: false },
  { key: "W", x: 1, y: 0, isPressed: false },
  { key: "E", x: 2, y: 0, isPressed: false },
  { key: "R", x: 3, y: 0, isPressed: false },
  { key: "T", x: 4, y: 0, isPressed: false },
  { key: "Y", x: 5, y: 0, isPressed: false },
  { key: "U", x: 6, y: 0, isPressed: false },
  { key: "I", x: 7, y: 0, isPressed: false },
  { key: "O", x: 8, y: 0, isPressed: false },
  { key: "P", x: 9, y: 0, isPressed: false },
  { key: "A", x: 0.5, y: 1, isPressed: false },
  { key: "S", x: 1.5, y: 1, isPressed: false },
  { key: "D", x: 2.5, y: 1, isPressed: false },
  { key: "F", x: 3.5, y: 1, isPressed: false },
  { key: "G", x: 4.5, y: 1, isPressed: false },
  { key: "H", x: 5.5, y: 1, isPressed: false },
  { key: "J", x: 6.5, y: 1, isPressed: false },
  { key: "K", x: 7.5, y: 1, isPressed: false },
  { key: "L", x: 8.5, y: 1, isPressed: false },
  { key: "Z", x: 1, y: 2, isPressed: false },
  { key: "X", x: 2, y: 2, isPressed: false },
  { key: "C", x: 3, y: 2, isPressed: false },
  { key: "V", x: 4, y: 2, isPressed: false },
  { key: "B", x: 5, y: 2, isPressed: false },
  { key: "N", x: 6, y: 2, isPressed: false },
  { key: "M", x: 7, y: 2, isPressed: false },
];

export function getKeyboardLayout() {
  const settingsStr = localStorage.getItem("game_settings");
  let layoutType = "AZERTY";
  if (settingsStr) {
      try {
          const settings = JSON.parse(settingsStr);
          if (settings.keyboardLayout) {
              layoutType = settings.keyboardLayout;
          }
      } catch (e) {
          console.error(e);
      }
  }
  
  const baseLayout = layoutType === "QWERTY" ? QWERTY_LAYOUT : AZERTY_LAYOUT;
  return baseLayout.map(key => ({ ...key }));
}

/**
 * Returns the keyboard layout extended with ground tiles for enemies to spawn and walk on.
 * @param {number} paddingSides - Number of extra columns to the left and right.
 * @param {number} paddingTopBottom - Number of extra rows above and below.
 * @returns {Array<Object>} The extended map layout.
 */
export function getExtendedMapLayout(paddingSides = 3, paddingTopBottom = 5) {
  const baseKeys = getKeyboardLayout();
  
  let minY = 0;
  let maxY = 2;
  let minX = 0;
  let maxX = 9.5; 

  const extendedMap = [...baseKeys];

  for (let y = minY - paddingTopBottom; y <= maxY + paddingTopBottom; y++) {
      const offset = (Math.abs(y % 2) === 1) ? 0.5 : 0;
      
      const startI = Math.floor(minX - paddingSides);
      const endI = Math.ceil(maxX + paddingSides);

      for (let i = startI; i <= endI; i++) {
          const x = i + offset;
          
          const exists = baseKeys.find(k => k.x === x && k.y === y);
          
          if (!exists) {
              extendedMap.push({
                  key: `ground_${x}_${y}`,
                  x: x,
                  y: y,
                  isPressed: false,
                  isGround: true
              });
          }
      }
  }

  return extendedMap;
}
