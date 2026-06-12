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
