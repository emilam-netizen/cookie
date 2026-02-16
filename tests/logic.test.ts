import { describe, expect, it } from "vitest";
import {
  assignUpgradeToSlot,
  advanceWorldTime,
  advanceUpgradeProgress,
  applyClick,
  applyPassiveIncome,
  buyItem,
  buyUpgrade,
  canBuyItem,
  canBuyUpgrade,
  createInitialState,
  getCurrentDay,
  getCurrentSeason,
  getItemCost,
  getOwnedItemCount,
  getCookiesPerClick,
  getCookiesPerSecond,
  getUpgradeCost,
  removeUpgradeFromSlot,
} from "../src/game/logic";
import type { ItemDefinition, UpgradeDefinition } from "../src/game/types";

const defs: UpgradeDefinition[] = [
  {
    id: "clicker",
    name: "Clicker",
    icon: "A",
    description: "",
    type: "click",
    amount: 2,
    baseCost: 20,
    levelDurationSec: 10,
  },
  {
    id: "bakery",
    name: "Bakery",
    icon: "B",
    description: "",
    type: "cps",
    amount: 1.5,
    baseCost: 30,
    levelDurationSec: 8,
  },
];

const itemDefs: ItemDefinition[] = [
  {
    id: "item-1",
    name: "Item 1",
    image: "img",
    baseCost: 50,
    rarity: "common",
    tooltip: "Test item",
  },
];

describe("game logic", () => {
  it("click math adds base click and click-upgrade bonus", () => {
    const withoutSlot = {
      ...createInitialState(),
      upgrades: { clicker: 2 },
    };
    expect(getCookiesPerClick(withoutSlot, defs)).toBe(0);

    const state = assignUpgradeToSlot(withoutSlot, "clicker", 0);

    expect(getCookiesPerClick(state, defs)).toBe(4);
    const next = applyClick(state, defs);
    expect(next.cookies).toBe(4);
    expect(next.lifetimeCookies).toBe(4);
  });

  it("passive income adds cookies based on cps over time", () => {
    const state = assignUpgradeToSlot(
      {
        ...createInitialState(),
        upgrades: { bakery: 2 },
      },
      "bakery",
      1,
    );
    expect(getCookiesPerSecond(state, defs)).toBe(3);

    const next = applyPassiveIncome(state, defs, 2.5);
    expect(next.cookies).toBe(7.5);
    expect(next.lifetimeCookies).toBe(7.5);
  });

  it("upgrade purchase checks affordability and applies scaled costs", () => {
    const state = {
      ...createInitialState(),
      cookies: 100,
      upgrades: { clicker: 1 },
    };
    const upgrade = defs[0];
    const cost = getUpgradeCost(upgrade, 1);
    expect(cost).toBe(23);
    expect(canBuyUpgrade(state, upgrade)).toBe(true);

    const bought = buyUpgrade(state, upgrade);
    expect(bought.cookies).toBe(77);
    expect(bought.upgrades.clicker).toBe(2);
  });

  it("buyUpgrade returns unchanged state when unaffordable", () => {
    const state = {
      ...createInitialState(),
      cookies: 0,
    };
    const upgrade = defs[1];
    expect(canBuyUpgrade(state, upgrade)).toBe(false);
    expect(buyUpgrade(state, upgrade)).toBe(state);
  });

  it("upgrade timers level up owned upgrades and carry progress remainder", () => {
    const state = assignUpgradeToSlot(
      {
        ...createInitialState(),
        upgrades: { clicker: 1 },
      },
      "clicker",
      0,
    );

    const next = advanceUpgradeProgress(state, defs, 26);
    expect(next.upgradeLevels.clicker).toBe(2);
    expect(next.upgradeLevelProgress.clicker).toBe(6);
  });

  it("upgrade levels increase the output of that upgrade", () => {
    const state = assignUpgradeToSlot(
      {
        ...createInitialState(),
        upgrades: { clicker: 1 },
        upgradeLevels: { clicker: 2 },
      },
      "clicker",
      0,
    );
    expect(getCookiesPerClick(state, defs)).toBeCloseTo(2.6);
  });

  it("upgrades can be moved in and out of slots", () => {
    const state = {
      ...createInitialState(),
      upgrades: { clicker: 1 },
    };
    const slotted = assignUpgradeToSlot(state, "clicker", 3);
    expect(slotted.activeSlots[3]).toBe("clicker");

    const removed = removeUpgradeFromSlot(slotted, 3);
    expect(removed.activeSlots[3]).toBe(null);
  });

  it("items can be purchased and are stored in inventory", () => {
    const state = {
      ...createInitialState(),
      cookies: 120,
    };
    const item = itemDefs[0];

    expect(canBuyItem(state, item)).toBe(true);
    expect(getItemCost(item, 0)).toBe(50);

    const bought = buyItem(state, item);
    expect(bought.cookies).toBe(70);
    expect(getOwnedItemCount(bought, item.id)).toBe(1);
    expect(getItemCost(item, 1)).toBe(60);
  });

  it("world time advances by 10-second ticks and grants reward every 12 ticks", () => {
    const state = createInitialState();
    const afterOneTick = advanceWorldTime(state, 10);
    expect(afterOneTick.totalTicks).toBe(1);
    expect(afterOneTick.cookies).toBe(0);

    const afterTwelveTicks = advanceWorldTime(afterOneTick, 110);
    expect(afterTwelveTicks.totalTicks).toBe(12);
    expect(afterTwelveTicks.cookies).toBe(1000);
    expect(afterTwelveTicks.lifetimeCookies).toBe(1000);
  });

  it("day and season are derived from tick count", () => {
    const state = {
      ...createInitialState(),
      totalTicks: 48 * 30,
    };
    expect(getCurrentDay(state)).toBe(31);
    expect(getCurrentSeason(state)).toBe("Summer");
  });
});
