import type { GameState, ItemDefinition, UpgradeDefinition } from "./types";

export const COST_MULTIPLIER = 1.15;
export const LEVEL_BONUS_PER_LEVEL = 0.15;
export const ACTIVE_SLOT_COUNT = 4;
export const ITEM_COST_MULTIPLIER = 1.2;
export const SECONDS_PER_TICK = 10;
export const TICKS_PER_DAY = 48;
export const TICKS_PER_REWARD = 12;
export const COOKIES_PER_TICK_REWARD = 1000;
export const DAYS_PER_SEASON = 30;
const SEASONS = ["Spring", "Summer", "Fall", "Winter"] as const;

export function createInitialState(): GameState {
  return {
    cookies: 0,
    lifetimeCookies: 0,
    totalTicks: 0,
    tickProgressSeconds: 0,
    upgrades: {},
    upgradeLevels: {},
    upgradeLevelProgress: {},
    activeSlots: Array.from({ length: ACTIVE_SLOT_COUNT }, () => null),
    inventoryItems: {},
  };
}

export function getOwnedCount(state: GameState, upgradeId: string): number {
  return state.upgrades[upgradeId] ?? 0;
}

export function getUpgradeCost(upgrade: UpgradeDefinition, ownedCount: number): number {
  return Math.floor(upgrade.baseCost * COST_MULTIPLIER ** ownedCount);
}

export function getOwnedItemCount(state: GameState, itemId: string): number {
  return state.inventoryItems[itemId] ?? 0;
}

export function getCurrentDay(state: GameState): number {
  return Math.floor(state.totalTicks / TICKS_PER_DAY) + 1;
}

export function getCurrentSeason(state: GameState): (typeof SEASONS)[number] {
  const dayIndex = getCurrentDay(state) - 1;
  const seasonIndex = Math.floor(dayIndex / DAYS_PER_SEASON) % SEASONS.length;
  return SEASONS[seasonIndex];
}

export function getItemCost(item: ItemDefinition, ownedCount: number): number {
  return Math.floor(item.baseCost * ITEM_COST_MULTIPLIER ** ownedCount);
}

export function canBuyItem(state: GameState, item: ItemDefinition): boolean {
  return state.cookies >= getItemCost(item, getOwnedItemCount(state, item.id));
}

export function buyItem(state: GameState, item: ItemDefinition): GameState {
  const ownedCount = getOwnedItemCount(state, item.id);
  const cost = getItemCost(item, ownedCount);
  if (state.cookies < cost) {
    return state;
  }

  return {
    ...state,
    cookies: state.cookies - cost,
    inventoryItems: {
      ...state.inventoryItems,
      [item.id]: ownedCount + 1,
    },
  };
}

export function isUpgradeSlotted(state: GameState, upgradeId: string): boolean {
  return state.activeSlots.includes(upgradeId);
}

export function assignUpgradeToSlot(
  state: GameState,
  upgradeId: string,
  slotIndex: number,
): GameState {
  if (slotIndex < 0 || slotIndex >= ACTIVE_SLOT_COUNT) {
    return state;
  }
  if (getOwnedCount(state, upgradeId) <= 0) {
    return state;
  }

  const nextSlots = state.activeSlots.map((slotId) => (slotId === upgradeId ? null : slotId));
  nextSlots[slotIndex] = upgradeId;

  if (nextSlots.join("|") === state.activeSlots.join("|")) {
    return state;
  }

  return {
    ...state,
    activeSlots: nextSlots,
  };
}

export function removeUpgradeFromSlot(state: GameState, slotIndex: number): GameState {
  if (slotIndex < 0 || slotIndex >= ACTIVE_SLOT_COUNT) {
    return state;
  }
  if (!state.activeSlots[slotIndex]) {
    return state;
  }

  const nextSlots = [...state.activeSlots];
  nextSlots[slotIndex] = null;
  return {
    ...state,
    activeSlots: nextSlots,
  };
}

export function getUpgradeLevel(state: GameState, upgradeId: string): number {
  return state.upgradeLevels[upgradeId] ?? 0;
}

export function getUpgradePowerMultiplier(state: GameState, upgradeId: string): number {
  return 1 + getUpgradeLevel(state, upgradeId) * LEVEL_BONUS_PER_LEVEL;
}

export function getUpgradeProgressRatio(state: GameState, upgrade: UpgradeDefinition): number {
  if (getOwnedCount(state, upgrade.id) <= 0) {
    return 0;
  }
  const progressSec = state.upgradeLevelProgress[upgrade.id] ?? 0;
  return Math.max(0, Math.min(1, progressSec / upgrade.levelDurationSec));
}

export function getCookiesPerClick(state: GameState, definitions: UpgradeDefinition[]): number {
  let perClick = 0;

  for (const upgrade of definitions) {
    if (upgrade.type !== "click") {
      continue;
    }
    if (!isUpgradeSlotted(state, upgrade.id)) {
      continue;
    }
    const owned = getOwnedCount(state, upgrade.id);
    const scaledAmount = upgrade.amount * getUpgradePowerMultiplier(state, upgrade.id);
    perClick += scaledAmount * owned;
  }

  return perClick;
}

export function getCookiesPerSecond(state: GameState, definitions: UpgradeDefinition[]): number {
  let cps = 0;

  for (const upgrade of definitions) {
    if (upgrade.type !== "cps") {
      continue;
    }
    if (!isUpgradeSlotted(state, upgrade.id)) {
      continue;
    }
    const owned = getOwnedCount(state, upgrade.id);
    const scaledAmount = upgrade.amount * getUpgradePowerMultiplier(state, upgrade.id);
    cps += scaledAmount * owned;
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

export function advanceWorldTime(state: GameState, deltaSeconds: number): GameState {
  if (deltaSeconds <= 0) {
    return state;
  }

  let progressSeconds = state.tickProgressSeconds + deltaSeconds;
  let ticksGained = 0;

  while (progressSeconds >= SECONDS_PER_TICK) {
    progressSeconds -= SECONDS_PER_TICK;
    ticksGained += 1;
  }

  if (ticksGained === 0) {
    return {
      ...state,
      tickProgressSeconds: progressSeconds,
    };
  }

  const previousRewards = Math.floor(state.totalTicks / TICKS_PER_REWARD);
  const newTotalTicks = state.totalTicks + ticksGained;
  const nextRewards = Math.floor(newTotalTicks / TICKS_PER_REWARD);
  const rewardsGained = nextRewards - previousRewards;
  const bonusCookies = rewardsGained * COOKIES_PER_TICK_REWARD;

  return {
    ...state,
    totalTicks: newTotalTicks,
    tickProgressSeconds: progressSeconds,
    cookies: state.cookies + bonusCookies,
    lifetimeCookies: state.lifetimeCookies + bonusCookies,
  };
}

export function advanceUpgradeProgress(
  state: GameState,
  definitions: UpgradeDefinition[],
  deltaSeconds: number,
): GameState {
  if (deltaSeconds <= 0) {
    return state;
  }

  const nextLevels = { ...state.upgradeLevels };
  const nextProgress = { ...state.upgradeLevelProgress };
  let changed = false;

  for (const upgrade of definitions) {
    const owned = getOwnedCount(state, upgrade.id);
    if (owned <= 0 || !isUpgradeSlotted(state, upgrade.id)) {
      continue;
    }

    let progressSec = (nextProgress[upgrade.id] ?? 0) + deltaSeconds;
    let level = nextLevels[upgrade.id] ?? 0;

    while (progressSec >= upgrade.levelDurationSec) {
      progressSec -= upgrade.levelDurationSec;
      level += 1;
      changed = true;
    }

    if ((nextProgress[upgrade.id] ?? 0) !== progressSec) {
      changed = true;
    }

    nextProgress[upgrade.id] = progressSec;
    nextLevels[upgrade.id] = level;
  }

  if (!changed) {
    return state;
  }

  return {
    ...state,
    upgradeLevels: nextLevels,
    upgradeLevelProgress: nextProgress,
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

export function toSerializableState(state: Partial<GameState>): GameState {
  const slots = Array.from({ length: ACTIVE_SLOT_COUNT }, (_, index) => {
    const value = state.activeSlots?.[index];
    return typeof value === "string" ? value : null;
  });

  return {
    cookies: Number(state.cookies) || 0,
    lifetimeCookies: Number(state.lifetimeCookies) || 0,
    totalTicks: Number(state.totalTicks) || 0,
    tickProgressSeconds: Number(state.tickProgressSeconds) || 0,
    upgrades: { ...(state.upgrades ?? {}) },
    upgradeLevels: { ...(state.upgradeLevels ?? {}) },
    upgradeLevelProgress: { ...(state.upgradeLevelProgress ?? {}) },
    activeSlots: slots,
    inventoryItems: { ...(state.inventoryItems ?? {}) },
  };
}
