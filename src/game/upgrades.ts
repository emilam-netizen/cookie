import type { UpgradeDefinition } from "./types";

export const UPGRADE_DEFINITIONS: UpgradeDefinition[] = [
  {
    id: "oak-rolling-pin",
    name: "Oak Rolling Pin",
    description: "+1 cookie per click",
    type: "click",
    amount: 1,
    baseCost: 15,
  },
  {
    id: "royal-chef",
    name: "Royal Chef",
    description: "+6 cookies per click",
    type: "click",
    amount: 6,
    baseCost: 100,
  },
  {
    id: "village-bakery",
    name: "Village Bakery",
    description: "+1.0 cookies per second",
    type: "cps",
    amount: 1,
    baseCost: 40,
  },
  {
    id: "clockwork-oven",
    name: "Clockwork Oven",
    description: "+5.0 cookies per second",
    type: "cps",
    amount: 5,
    baseCost: 280,
  },
];
