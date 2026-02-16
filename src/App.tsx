import { useEffect, useMemo, useRef, useState } from "react";
import type { DragEvent } from "react";
import {
  ACTIVE_SLOT_COUNT,
  SECONDS_PER_TICK,
  TICKS_PER_REWARD,
  advanceWorldTime,
  advanceUpgradeProgress,
  assignUpgradeToSlot,
  applyClick,
  applyPassiveIncome,
  buyUpgrade,
  buyItem,
  canBuyItem,
  canBuyUpgrade,
  createInitialState,
  getCookiesPerClick,
  getCookiesPerSecond,
  getCurrentDay,
  getCurrentSeason,
  getItemCost,
  getOwnedCount,
  getOwnedItemCount,
  getUpgradeCost,
  getUpgradeLevel,
  getUpgradeProgressRatio,
  removeUpgradeFromSlot,
} from "./game/logic";
import { ITEM_DEFINITIONS } from "./game/items";
import { loadGameState, saveGameState } from "./game/storage";
import { UPGRADE_DEFINITIONS } from "./game/upgrades";
import type { GameState } from "./game/types";

function formatCookies(value: number): string {
  return Number(value).toLocaleString(undefined, {
    minimumFractionDigits: value < 100 ? 1 : 0,
    maximumFractionDigits: 1,
  });
}

type LevelUpToast = {
  id: number;
  text: string;
};

function rarityLabelClass(rarity: string): string {
  return `rarity-badge rarity-${rarity}`;
}

export default function App() {
  const [state, setState] = useState<GameState>(() => loadGameState() ?? createInitialState());
  const [toasts, setToasts] = useState<LevelUpToast[]>([]);
  const [isItemShopVisible, setIsItemShopVisible] = useState(true);
  const [isInventoryVisible, setIsInventoryVisible] = useState(true);
  const previousLevelsRef = useRef<Record<string, number>>(state.upgradeLevels);
  const nextToastIdRef = useRef(1);

  const cookiesPerClick = useMemo(
    () => getCookiesPerClick(state, UPGRADE_DEFINITIONS),
    [state],
  );
  const cookiesPerSecond = useMemo(
    () => getCookiesPerSecond(state, UPGRADE_DEFINITIONS),
    [state],
  );
  const currentDay = useMemo(() => getCurrentDay(state), [state]);
  const currentSeason = useMemo(() => getCurrentSeason(state), [state]);
  const secondsUntilNextTick = useMemo(
    () => Math.max(0, SECONDS_PER_TICK - state.tickProgressSeconds),
    [state],
  );
  const ticksUntilNextReward = useMemo(() => {
    const remainder = state.totalTicks % TICKS_PER_REWARD;
    return remainder === 0 ? TICKS_PER_REWARD : TICKS_PER_REWARD - remainder;
  }, [state]);
  const secondsUntilNextReward = useMemo(
    () => (ticksUntilNextReward - 1) * SECONDS_PER_TICK + secondsUntilNextTick,
    [ticksUntilNextReward, secondsUntilNextTick],
  );
  const upgradesById = useMemo(
    () =>
      Object.fromEntries(
        UPGRADE_DEFINITIONS.map((upgrade) => [upgrade.id, upgrade]),
      ),
    [],
  );
  const ownedInventoryEntries = useMemo(
    () =>
      ITEM_DEFINITIONS.filter((item) => getOwnedItemCount(state, item.id) > 0).map((item) => ({
        ...item,
        count: getOwnedItemCount(state, item.id),
      })),
    [state],
  );

  useEffect(() => {
    let previous = performance.now();
    let raf = 0;

    const tick = (now: number) => {
      const deltaSeconds = Math.min((now - previous) / 1000, 0.25);
      previous = now;
      setState((current) => {
        const withTime = advanceWorldTime(current, deltaSeconds);
        const withIncome = applyPassiveIncome(withTime, UPGRADE_DEFINITIONS, deltaSeconds);
        return advanceUpgradeProgress(withIncome, UPGRADE_DEFINITIONS, deltaSeconds);
      });
      raf = window.requestAnimationFrame(tick);
    };

    raf = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(raf);
  }, []);

  useEffect(() => {
    saveGameState(state);
  }, [state]);

  useEffect(() => {
    const previousLevels = previousLevelsRef.current;
    const newToasts: LevelUpToast[] = [];

    for (const upgrade of UPGRADE_DEFINITIONS) {
      const previous = previousLevels[upgrade.id] ?? 0;
      const next = state.upgradeLevels[upgrade.id] ?? 0;
      if (next > previous) {
        const gained = next - previous;
        newToasts.push({
          id: nextToastIdRef.current++,
          text:
            gained === 1
              ? `${upgrade.name} leveled up to ${next}!`
              : `${upgrade.name} leveled up +${gained} to ${next}!`,
        });
      }
    }

    previousLevelsRef.current = { ...state.upgradeLevels };
    if (newToasts.length > 0) {
      setToasts((current) => [...current, ...newToasts]);
    }
  }, [state.upgradeLevels]);

  useEffect(() => {
    if (toasts.length === 0) {
      return;
    }
    const timeoutId = window.setTimeout(() => {
      setToasts((current) => current.slice(1));
    }, 2200);
    return () => window.clearTimeout(timeoutId);
  }, [toasts]);

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

  const onBuyItem = (itemId: string) => {
    const item = ITEM_DEFINITIONS.find((entry) => entry.id === itemId);
    if (!item) {
      return;
    }
    setState((current) => buyItem(current, item));
  };

  const onStartDragUpgrade = (
    event: DragEvent<HTMLElement>,
    upgradeId: string,
    sourceSlot: number | null,
  ) => {
    event.dataTransfer.setData("text/plain", JSON.stringify({ upgradeId, sourceSlot }));
    event.dataTransfer.effectAllowed = "move";
  };

  const parseDragData = (event: DragEvent<HTMLElement>) => {
    try {
      const raw = event.dataTransfer.getData("text/plain");
      const parsed = JSON.parse(raw);
      if (typeof parsed.upgradeId !== "string") {
        return null;
      }
      return {
        upgradeId: parsed.upgradeId,
        sourceSlot: typeof parsed.sourceSlot === "number" ? parsed.sourceSlot : null,
      };
    } catch {
      return null;
    }
  };

  const onDropIntoSlot = (event: DragEvent<HTMLDivElement>, slotIndex: number) => {
    event.preventDefault();
    const payload = parseDragData(event);
    if (!payload) {
      return;
    }
    setState((current) => assignUpgradeToSlot(current, payload.upgradeId, slotIndex));
  };

  const onDropIntoInventory = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    const payload = parseDragData(event);
    if (!payload || payload.sourceSlot === null) {
      return;
    }
    setState((current) => removeUpgradeFromSlot(current, payload.sourceSlot));
  };

  return (
    <main className="layout">
      <div className="toast-stack" aria-live="polite" aria-atomic="true">
        {toasts.map((toast) => (
          <div className="toast" key={toast.id}>
            {toast.text}
          </div>
        ))}
      </div>

      <section className="panel hero">
        <h1>Cookie Kingdom</h1>
        <p className="subtitle">Rule by baking more cookies than anyone else.</p>
        <p className="cookie-count">{formatCookies(state.cookies)} cookies</p>
        <p className="cps-count">{formatCookies(cookiesPerSecond)} per second</p>
        <p className="cps-count">Day: {currentDay}</p>
        <p className="cps-count">Season: {currentSeason}</p>
        <p className="cps-count">Next tick in: {secondsUntilNextTick.toFixed(1)}s</p>
        <p className="cps-count">
          Next 12th tick in: {secondsUntilNextReward.toFixed(1)}s ({ticksUntilNextReward} ticks)
        </p>
        <div className="panel-toggles">
          <button
            className="toggle-button"
            onClick={() => setIsItemShopVisible((current) => !current)}
          >
            {isItemShopVisible ? "Hide Item Shop" : "Show Item Shop"}
          </button>
          <button
            className="toggle-button"
            onClick={() => setIsInventoryVisible((current) => !current)}
          >
            {isInventoryVisible ? "Hide Inventory" : "Show Inventory"}
          </button>
        </div>
        <section className="slots-area">
          <h2>Active Slots</h2>
          <p className="subtitle">Only slotted upgrades generate cookies.</p>
          <div className="slot-grid">
            {Array.from({ length: ACTIVE_SLOT_COUNT }, (_, slotIndex) => {
              const slottedId = state.activeSlots[slotIndex];
              const slottedUpgrade = slottedId ? upgradesById[slottedId] : undefined;
              return (
                <div
                  key={slotIndex}
                  className="slot"
                  onDragOver={(event) => event.preventDefault()}
                  onDrop={(event) => onDropIntoSlot(event, slotIndex)}
                >
                  {slottedUpgrade ? (
                    <button
                      className="upgrade-icon slotted"
                      draggable
                      onDragStart={(event) => onStartDragUpgrade(event, slottedUpgrade.id, slotIndex)}
                      title={`${slottedUpgrade.name} (drag out to unequip)`}
                    >
                      {slottedUpgrade.icon}
                    </button>
                  ) : (
                    <span className="slot-empty">Drop Here</span>
                  )}
                </div>
              );
            })}
          </div>
          <div
            className="slot-trash"
            onDragOver={(event) => event.preventDefault()}
            onDrop={onDropIntoInventory}
          >
            Drag a slotted icon here to remove
          </div>
        </section>
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
            const level = getUpgradeLevel(state, upgrade.id);
            const progressRatio = getUpgradeProgressRatio(state, upgrade);
            const progressPercent = Math.round(progressRatio * 100);
            return (
              <article className="shop-item" key={upgrade.id}>
                <p>
                  <strong>{upgrade.icon} {upgrade.name}</strong>
                  <br />
                  <small>
                    {upgrade.description} | Owned: {owned} | Cost: {cost}
                  </small>
                  <br />
                  <small>Level {level} | Next level: {progressPercent}%</small>
                </p>
                <button
                  className="buy-button"
                  onClick={() => onBuyUpgrade(upgrade.id)}
                  disabled={!affordable}
                >
                  Buy
                </button>
                <button
                  className="upgrade-icon"
                  draggable={owned > 0}
                  onDragStart={(event) => onStartDragUpgrade(event, upgrade.id, null)}
                  disabled={owned <= 0}
                  title={
                    owned > 0 ? `Drag ${upgrade.name} into an active slot` : "Buy this upgrade first"
                  }
                >
                  {upgrade.icon}
                </button>
                <div className="progress-track" aria-hidden="true">
                  <div className="progress-fill" style={{ width: `${progressPercent}%` }} />
                </div>
              </article>
            );
          })}
        </div>
      </section>

      {isItemShopVisible ? (
        <section className="panel shop">
          <h2>Item Shop</h2>
          <p className="subtitle">Buy collectible items with cookies.</p>
          <div className="item-shop-list">
            {ITEM_DEFINITIONS.map((item) => {
              const owned = getOwnedItemCount(state, item.id);
              const cost = getItemCost(item, owned);
              const affordable = canBuyItem(state, item);
              return (
                <article className="item-shop-card" key={item.id}>
                  <div className="tooltip-host" data-tooltip={item.tooltip}>
                    <img src={item.image} alt={item.name} className="item-image" />
                  </div>
                  <p>
                    <strong>{item.name}</strong>
                    {" "}
                    <span className={rarityLabelClass(item.rarity)}>{item.rarity}</span>
                    <br />
                    <small>Owned: {owned} | Cost: {cost}</small>
                  </p>
                  <button
                    className="buy-button"
                    onClick={() => onBuyItem(item.id)}
                    disabled={!affordable}
                  >
                    Buy Item
                  </button>
                </article>
              );
            })}
          </div>
        </section>
      ) : null}

      {isInventoryVisible ? (
        <section className="panel shop">
          <h2>Inventory</h2>
          <p className="subtitle">Purchased items appear here.</p>
          {ownedInventoryEntries.length > 0 ? (
            <div className="inventory-grid">
              {ownedInventoryEntries.map((item) => (
                <article className="inventory-card" key={item.id}>
                  <div className="tooltip-host" data-tooltip={item.tooltip}>
                    <img src={item.image} alt={item.name} className="item-image" />
                  </div>
                  <p>
                    <strong>{item.name}</strong>
                    <br />
                    <span className={rarityLabelClass(item.rarity)}>{item.rarity}</span>
                    <br />
                    <small>x{item.count}</small>
                  </p>
                </article>
              ))}
            </div>
          ) : (
            <p className="subtitle">No items yet. Buy from the Item Shop.</p>
          )}
        </section>
      ) : null}
    </main>
  );
}
