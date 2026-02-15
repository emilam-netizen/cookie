export type UpgradeType = "click" | "cps";

export type UpgradeDefinition = {
  id: string;
  name: string;
  description: string;
  type: UpgradeType;
  amount: number;
  baseCost: number;
};

export type GameState = {
  cookies: number;
  lifetimeCookies: number;
  upgrades: Record<string, number>;
};
