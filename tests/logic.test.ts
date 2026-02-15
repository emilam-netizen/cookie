import { describe, expect, it } from "vitest";
import {
  applyClick,
  applyPassiveIncome,
  buyUpgrade,
  canBuyUpgrade,
  createInitialState,
  getCookiesPerClick,
  getCookiesPerSecond,
  getUpgradeCost,
} from "../src/game/logic";
import type { UpgradeDefinition } from "../src/game/types";

const defs: UpgradeDefinition[] = [
  { id: "clicker", name: "Clicker", description: "", type: "click", amount: 2, baseCost: 20 },
  { id: "bakery", name: "Bakery", description: "", type: "cps", amount: 1.5, baseCost: 30 },
];

describe("game logic", () => {
  it("click math adds base click and click-upgrade bonus", () => {
    const state = {
      ...createInitialState(),
      upgrades: { clicker: 2 },
    };

    expect(getCookiesPerClick(state, defs)).toBe(5);
    const next = applyClick(state, defs);
    expect(next.cookies).toBe(5);
    expect(next.lifetimeCookies).toBe(5);
  });

  it("passive income adds cookies based on cps over time", () => {
    const state = {
      ...createInitialState(),
      upgrades: { bakery: 2 },
    };
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
});
