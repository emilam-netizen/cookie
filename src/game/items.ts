import type { ItemDefinition } from "./types";

function makeItemImage(fill: string, label: string): string {
  const svg = `
<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 48 48">
  <rect x="3" y="3" width="42" height="42" rx="10" fill="${fill}" />
  <circle cx="24" cy="24" r="11" fill="#fff3e3" />
  <text x="24" y="29" text-anchor="middle" font-size="12" font-family="Arial" fill="#4a2c14">${label}</text>
</svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

export const ITEM_DEFINITIONS: ItemDefinition[] = [
  {
    id: "sugar-charm",
    name: "Sugar Charm",
    image: makeItemImage("#d48b4e", "SC"),
    baseCost: 45,
    rarity: "common",
    tooltip: "A sweet trinket that smells like fresh dough.",
  },
  {
    id: "flour-badge",
    name: "Flour Badge",
    image: makeItemImage("#af7b5b", "FB"),
    baseCost: 85,
    rarity: "uncommon",
    tooltip: "Awarded to bakers who finish 100 loaves.",
  },
  {
    id: "butter-seal",
    name: "Butter Seal",
    image: makeItemImage("#c7a34f", "BS"),
    baseCost: 140,
    rarity: "rare",
    tooltip: "Stamped with the mark of the royal pantry.",
  },
  {
    id: "royal-crest",
    name: "Royal Crest",
    image: makeItemImage("#9f6c43", "RC"),
    baseCost: 220,
    rarity: "legendary",
    tooltip: "A crest reserved for masters of cookie kingdoms.",
  },
];
