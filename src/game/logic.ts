import type { GameState, UpgradeDefinition } from "./types";

export const COST_MULTIPLIER = 1.15;

export function createInitialState(): GameState {
  return {
    cookies: 0,
    lifetimeCookies: 0,
    upgrades: {},
  };
}

export function getOwnedCount(state: GameState, upgradeId: string): number {
  return state.upgrades[upgradeId] ?? 0;
}

export function getUpgradeCost(upgrade: UpgradeDefinition, ownedCount: number): number {
  return Math.floor(upgrade.baseCost * COST_MULTIPLIER ** ownedCount);
}

export function getCookiesPerClick(state: GameState, definitions: UpgradeDefinition[]): number {
  let perClick = 1;

  for (const upgrade of definitions) {
    if (upgrade.type !== "click") {
      continue;
    }
    perClick += upgrade.amount * getOwnedCount(state, upgrade.id);
  }

  return perClick;
}

export function getCookiesPerSecond(state: GameState, definitions: UpgradeDefinition[]): number {
  let cps = 0;

  for (const upgrade of definitions) {
    if (upgrade.type !== "cps") {
      continue;
    }
    cps += upgrade.amount * getOwnedCount(state, upgrade.id);
  }

  return cps;
}

export function applyClick(state: GameState, definitions: UpgradeDefinition[]): GameState {
  const earned = getCookiesPerClick(state, definitions);
  return {
    ...state,
    cookies: state.cookies + earned,
    lifetimeCookies: state.lifetimeCookies + earned,
  };
}

export function applyPassiveIncome(
  state: GameState,
  definitions: UpgradeDefinition[],
  deltaSeconds: number,
): GameState {
  const earned = getCookiesPerSecond(state, definitions) * deltaSeconds;
  if (earned <= 0) {
    return state;
  }

  return {
    ...state,
    cookies: state.cookies + earned,
    lifetimeCookies: state.lifetimeCookies + earned,
  };
}

export function canBuyUpgrade(state: GameState, upgrade: UpgradeDefinition): boolean {
  return state.cookies >= getUpgradeCost(upgrade, getOwnedCount(state, upgrade.id));
}

export function buyUpgrade(state: GameState, upgrade: UpgradeDefinition): GameState {
  const ownedCount = getOwnedCount(state, upgrade.id);
  const cost = getUpgradeCost(upgrade, ownedCount);
  if (state.cookies < cost) {
    return state;
  }

  return {
    ...state,
    cookies: state.cookies - cost,
    upgrades: {
      ...state.upgrades,
      [upgrade.id]: ownedCount + 1,
    },
  };
}

export function toSerializableState(state: GameState): GameState {
  return {
    cookies: Number(state.cookies) || 0,
    lifetimeCookies: Number(state.lifetimeCookies) || 0,
    upgrades: { ...state.upgrades },
  };
}
