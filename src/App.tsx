import { useEffect, useMemo, useState } from "react";
import {
  applyClick,
  applyPassiveIncome,
  buyUpgrade,
  canBuyUpgrade,
  createInitialState,
  getCookiesPerClick,
  getCookiesPerSecond,
  getOwnedCount,
  getUpgradeCost,
} from "./game/logic";
import { loadGameState, saveGameState } from "./game/storage";
import { UPGRADE_DEFINITIONS } from "./game/upgrades";
import type { GameState } from "./game/types";

function formatCookies(value: number): string {
  return Number(value).toLocaleString(undefined, {
    minimumFractionDigits: value < 100 ? 1 : 0,
    maximumFractionDigits: 1,
  });
}

export default function App() {
  const [state, setState] = useState<GameState>(() => loadGameState() ?? createInitialState());

  const cookiesPerClick = useMemo(
    () => getCookiesPerClick(state, UPGRADE_DEFINITIONS),
    [state],
  );
  const cookiesPerSecond = useMemo(
    () => getCookiesPerSecond(state, UPGRADE_DEFINITIONS),
    [state],
  );

  useEffect(() => {
    let previous = performance.now();
    let raf = 0;

    const tick = (now: number) => {
      const deltaSeconds = Math.min((now - previous) / 1000, 0.25);
      previous = now;
      setState((current) => applyPassiveIncome(current, UPGRADE_DEFINITIONS, deltaSeconds));
      raf = window.requestAnimationFrame(tick);
    };

    raf = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(raf);
  }, []);

  useEffect(() => {
    saveGameState(state);
  }, [state]);

  const onClickCookie = () => {
    setState((current) => applyClick(current, UPGRADE_DEFINITIONS));
  };

  const onBuyUpgrade = (upgradeId: string) => {
    const upgrade = UPGRADE_DEFINITIONS.find((entry) => entry.id === upgradeId);
    if (!upgrade) {
      return;
    }
    setState((current) => buyUpgrade(current, upgrade));
  };

  return (
    <main className="layout">
      <section className="panel hero">
        <h1>Cookie Kingdom</h1>
        <p className="subtitle">Rule by baking more cookies than anyone else.</p>
        <p className="cookie-count">{formatCookies(state.cookies)} cookies</p>
        <p className="cps-count">{formatCookies(cookiesPerSecond)} per second</p>
        <button
          className="cookie-button"
          aria-label="Bake cookie"
          title={`Click value: ${formatCookies(cookiesPerClick)} cookies`}
          onClick={onClickCookie}
        >
          Cookie
        </button>
      </section>

      <section className="panel shop">
        <h2>Royal Shop</h2>
        <p className="subtitle">Buy upgrades for more cookies per click or per second.</p>
        <div className="shop-list">
          {UPGRADE_DEFINITIONS.map((upgrade) => {
            const owned = getOwnedCount(state, upgrade.id);
            const cost = getUpgradeCost(upgrade, owned);
            const affordable = canBuyUpgrade(state, upgrade);
            return (
              <article className="shop-item" key={upgrade.id}>
                <p>
                  <strong>{upgrade.name}</strong>
                  <br />
                  <small>
                    {upgrade.description} | Owned: {owned} | Cost: {cost}
                  </small>
                </p>
                <button
                  className="buy-button"
                  onClick={() => onBuyUpgrade(upgrade.id)}
                  disabled={!affordable}
                >
                  Buy
                </button>
              </article>
            );
          })}
        </div>
      </section>
    </main>
  );
}
