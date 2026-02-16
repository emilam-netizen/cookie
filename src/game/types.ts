export type UpgradeType = "click" | "cps";

export type ItemDefinition = {
  id: string;
  name: string;
  image: string;
  baseCost: number;
  rarity: "common" | "uncommon" | "rare" | "legendary";
  tooltip: string;
};

export type UpgradeDefinition = {
  id: string;
  name: string;
  icon: string;
  description: string;
  type: UpgradeType;
  amount: number;
  baseCost: number;
  levelDurationSec: number;
};

export type GameState = {
  cookies: number;
  lifetimeCookies: number;
  totalTicks: number;
  tickProgressSeconds: number;
  upgrades: Record<string, number>;
  upgradeLevels: Record<string, number>;
  upgradeLevelProgress: Record<string, number>;
  activeSlots: Array<string | null>;
  inventoryItems: Record<string, number>;
};
