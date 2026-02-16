import type { UpgradeDefinition } from "./types";

export const UPGRADE_DEFINITIONS: UpgradeDefinition[] = [
  {
    id: "oak-rolling-pin",
    name: "Oak Rolling Pin",
    icon: "🪵",
    description: "+1 cookie per click",
    type: "click",
    amount: 1,
    baseCost: 15,
    levelDurationSec: 20,
  },
  {
    id: "royal-chef",
    name: "Royal Chef",
    icon: "👩‍🍳",
    description: "+6 cookies per click",
    type: "click",
    amount: 6,
    baseCost: 100,
    levelDurationSec: 35,
  },
  {
    id: "village-bakery",
    name: "Village Bakery",
    icon: "🏠",
    description: "+1.0 cookies per second",
    type: "cps",
    amount: 1,
    baseCost: 40,
    levelDurationSec: 25,
  },
  {
    id: "clockwork-oven",
    name: "Clockwork Oven",
    icon: "⚙️",
    description: "+5.0 cookies per second",
    type: "cps",
    amount: 5,
    baseCost: 280,
    levelDurationSec: 45,
  },
];
