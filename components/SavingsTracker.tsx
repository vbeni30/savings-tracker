"use client";

import { useMemo, useRef, useState } from "react";
import { AdjustBalanceModal } from "@/components/AdjustBalanceModal";
import { AppAlerts } from "@/components/AppAlerts";
import { AiCoachFab, AiCoachPanel } from "@/components/AiCoachPanel";
import { ExpenseModal } from "@/components/ExpenseModal";
import { Icon } from "@/components/Icons";
import { InstallButton, InstallPrompt, resetInstallDismissal } from "@/components/InstallPrompt";
import { EmailReminders } from "@/components/EmailReminders";
import { LogModal } from "@/components/LogModal";
import { MobileAppNav, type MobileTabId } from "@/components/MobileAppNav";
import { appPageClass } from "@/lib/mobile-tab";
import { MobileMoreSheet } from "@/components/MobileMoreSheet";
import { OpeningBalanceModal } from "@/components/OpeningBalanceModal";
import { SourceBreakdown } from "@/components/SourceBreakdown";
import { Toast } from "@/components/Toast";
import { CloudSyncPanel } from "@/components/CloudSyncPanel";
import { EmptyLedgerOnboarding } from "@/components/EmptyLedgerOnboarding";
import { FxRatesSection } from "@/components/FxRatesSection";
import { MonthlyRecapCard } from "@/components/MonthlyRecapCard";
import { RunwayBanner } from "@/components/RunwayBanner";
import { SyncConflictModal } from "@/components/SyncConflictModal";
import { UpcomingSchedule } from "@/components/UpcomingSchedule";
import { useAiCoachChat } from "@/hooks/useAiCoachChat";
import { useCloudSync } from "@/hooks/useCloudSync";
import { useGoals } from "@/hooks/useGoals";
import { useLedger } from "@/hooks/useLedger";
import { buildMonthlyRecap } from "@/lib/monthly-recap";
import { computeRunway } from "@/lib/runway";
import { syncStatusDetail, syncStatusLabel } from "@/lib/sync/label";
import { downloadCalendarFile } from "@/lib/calendar";
import {
  entryDisplayAmount,
  entryIsCredit,
  entryLabel,
} from "@/lib/ledger";
import { formatAmount, formatDate, formatPercent, formatWhenLabel } from "@/lib/format";
import { daysUntil, getNextPayday, nextOccurrence } from "@/lib/payday";
import { PAYDAY_RULES } from "@/lib/rules";
import {
  currentMonthLabel,
  filterLedgerEntries,
  monthlyProjection,
  overallSavingsRate,
  savingsRate,
  hasLoggedPaydays,
  sourceRowsForPeriod,
} from "@/lib/stats";
import type { Currency, PaydayRule, Pool, SourcePeriod } from "@/types";

type HistoryFilter = "all" | Currency;

export function SavingsTracker() {
  const {
    entries,
    loaded,
    balances,
    openingDone,
    logPayday,
    logExpense,
    addOpeningBalances,
    adjustBalance,
    skipOpeningBalance,
    removeEntry,
    undoLast,
    handleExport,
    handleImport,
    applyRemoteState,
  } = useLedger();
  const { goals, loaded: goalsLoaded, addGoal, addGoalObject, removeGoal, setGoals } =
    useGoals();

  const {
    syncStatus,
    syncNow,
    lastSyncedAt,
    syncEnabled,
    conflict,
    resolveConflict,
  } = useCloudSync({
    ready: loaded && goalsLoaded,
    entries,
    goals,
    openingDone,
    onApply: (payload) => {
      applyRemoteState(payload);
      setGoals(payload.goals);
    },
  });

  const [modalOpen, setModalOpen] = useState(false);
  const [expenseOpen, setExpenseOpen] = useState(false);
  const [adjustOpen, setAdjustOpen] = useState(false);
  const [openingOpen, setOpeningOpen] = useState(false);
  const [aiOpen, setAiOpen] = useState(false);
  const [installOpen, setInstallOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const [mobileTab, setMobileTab] = useState<MobileTabId>("home");

  const selectMobileTab = (tab: MobileTabId) => {
    setMobileTab(tab);
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };
  const aiChat = useAiCoachChat();
  const [toast, setToast] = useState<string | null>(null);
  const [historyFilter, setHistoryFilter] = useState<HistoryFilter>("all");
  const [sourcePeriod, setSourcePeriod] = useState<SourcePeriod>("all");
  const importRef = useRef<HTMLInputElement>(null);
  const monthLabel = currentMonthLabel();

  const nextPayday = getNextPayday(PAYDAY_RULES);
  const nextDays = daysUntil(nextPayday.date);
  const nextWhen = formatWhenLabel(nextDays, nextPayday.date);
  const projection = monthlyProjection();
  const etbBreakdown = useMemo(
    () => sourceRowsForPeriod(entries, "ETB", sourcePeriod),
    [entries, sourcePeriod],
  );
  const usdBreakdown = useMemo(
    () => sourceRowsForPeriod(entries, "USD", sourcePeriod),
    [entries, sourcePeriod],
  );
  const filteredEntries = useMemo(
    () => filterLedgerEntries(entries, historyFilter),
    [entries, historyFilter],
  );
  const hasPaydayLogs = useMemo(() => hasLoggedPaydays(entries), [entries]);
  const showEtbBreakdown = etbBreakdown.length > 0;
  const showUsdBreakdown = usdBreakdown.length > 0;
  const monthlyRecap = useMemo(() => buildMonthlyRecap(entries), [entries]);
  const runwayEtb = useMemo(
    () => computeRunway(entries, "ETB", balances.spendable.etb),
    [entries, balances.spendable.etb],
  );
  const runwayUsd = useMemo(
    () => computeRunway(entries, "USD", balances.spendable.usd),
    [entries, balances.spendable.usd],
  );

  const showOpeningWizard = loaded && !openingDone;
  const showEmptyOnboarding = openingDone && entries.length === 0;
  const syncDetail = syncStatusDetail(syncStatus, lastSyncedAt);

  const handleLog = (rule: PaydayRule) => {
    logPayday(rule);
    setModalOpen(false);
    setToast(
      `${rule.who} logged — ${formatAmount(rule.save, rule.currency)} saved, ${formatAmount(rule.keep, rule.currency)} spendable`,
    );
  };

  const handleCalendarDownload = () => {
    downloadCalendarFile();
    setToast("Calendar file downloaded — open it to add to your Calendar app");
  };

  const handleImportClick = () => importRef.current?.click();

  const handleImportChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    try {
      await handleImport(file);
      setToast("History backup restored");
    } catch (error) {
      setToast(error instanceof Error ? error.message : "Could not read backup file");
    }
  };

  const coachChatProps = {
    entries,
    balances,
    goals,
    onLogPayday: handleLog,
    onLogExpense: (params: {
      amount: number;
      currency: Currency;
      pool: Pool;
      note?: string;
    }) => {
      logExpense(params);
      setToast(
        `Expense logged — ${formatAmount(params.amount, params.currency)} from ${params.pool}`,
      );
    },
    onAddGoal: addGoal,
    onAddGoalObject: addGoalObject,
    onRemoveGoal: removeGoal,
    onAdjustBalance: (params: {
      amount: number;
      currency: Currency;
      pool: Pool;
      direction: "add" | "subtract";
      note?: string;
    }) => {
      adjustBalance(params);
      setToast(
        `${params.direction === "add" ? "Added" : "Deducted"} ${formatAmount(params.amount, params.currency)} ${params.direction === "add" ? "to" : "from"} ${params.pool}`,
      );
    },
    onUndoLast: () => {
      undoLast();
      setToast("Last ledger entry removed");
    },
    onToast: setToast,
    messages: aiChat.messages,
    setMessages: aiChat.setMessages,
    pendingActions: aiChat.pendingActions,
    setPendingActions: aiChat.setPendingActions,
  };

  if (!loaded) {
    return (
      <div className="wrap app-shell">
        <div className="loading">Loading…</div>
      </div>
    );
  }

  return (
    <div className={`wrap app-shell${mobileTab === "coach" ? " coach-tab-active" : ""}`}>
      <header className="topbar">
        <div className="brand">
          <div className="icon-btn" aria-hidden="true">
            <Icon name="wallet" />
          </div>
          <div className="brand-text">
            <span className="brand-name">Savings Tracker</span>
            <span className="brand-sub">
              {entries.length} {entries.length === 1 ? "entry" : "entries"} in ledger
            </span>
            {syncStatusLabel(syncStatus) && (
              <button
                type="button"
                className={`sync-status sync-${syncStatus}`}
                onClick={() => {
                  if (syncStatus === "error" || syncStatus === "offline") void syncNow();
                }}
                disabled={syncStatus === "syncing" || syncStatus === "disabled"}
                title={syncDetail ?? undefined}
              >
                {syncStatusLabel(syncStatus)}
                {syncDetail && (syncStatus === "synced" || syncStatus === "disabled") && (
                  <span className="sync-status-sub">{syncDetail}</span>
                )}
              </button>
            )}
          </div>
        </div>
        <button
          type="button"
          className="mobile-more-btn"
          aria-label="More options"
          onClick={() => setMoreOpen(true)}
        >
          More
        </button>
        <div className="topbar-actions desktop-only">
          <button
            type="button"
            className="ghost-btn"
            onClick={async () => {
              await fetch("/api/auth/logout", { method: "POST" });
              window.location.href = "/login";
            }}
          >
            Sign out
          </button>
          <InstallButton
            onClick={() => {
              resetInstallDismissal();
              setInstallOpen(true);
            }}
          />
          <button type="button" className="ghost-btn" onClick={() => setAdjustOpen(true)}>
            Adjust
          </button>
          <button type="button" className="ghost-btn expense-btn" onClick={() => setExpenseOpen(true)}>
            Log expense
          </button>
          <button type="button" className="log-btn" onClick={() => setModalOpen(true)}>
            <Icon name="plus" />
            Log payday
          </button>
        </div>
      </header>

      <div className="desktop-only">
        <AppAlerts
          entryCount={entries.length}
          spendableEtb={balances.spendable.etb}
          onExport={() => {
            handleExport();
            setToast("Backup exported — keep the JSON file somewhere safe");
          }}
        />
      </div>

      <div className="dashboard">
        <main className="dashboard-main">
          <div className={appPageClass("home", mobileTab)}>
            <div className="mobile-only mobile-only-block">
              <AppAlerts
                entryCount={entries.length}
                spendableEtb={balances.spendable.etb}
                onExport={() => {
                  handleExport();
                  setToast("Backup exported — keep the JSON file somewhere safe");
                }}
              />
            </div>

            <h1 className="hero">
              Save first.
              <br />
              Spend what&apos;s left.
            </h1>

            {showEmptyOnboarding && (
              <EmptyLedgerOnboarding
                onOpeningBalances={() => setOpeningOpen(true)}
                onImport={handleImportClick}
                onLogPayday={() => setModalOpen(true)}
              />
            )}

            <CloudSyncPanel syncEnabled={syncEnabled} />

            <div className="stat-row">
            <div className="stat-card etb">
              <div className="tab" />
              <div className="stat-label-row">
                <span className="stat-icon c1">
                  <Icon name="laptop" />
                </span>
                <p className="label">SAVED · BIRR</p>
              </div>
              <p className="amount mono">{balances.saved.etb.toLocaleString("en-US")}</p>
              <p className="stat-meta mono">~{Math.round(projection.etb).toLocaleString("en-US")}/mo in</p>
            </div>
            <div className="stat-card spendable">
              <div className="tab" />
              <div className="stat-label-row">
                <span className="stat-icon c2">
                  <Icon name="moneybag" />
                </span>
                <p className="label">SPENDABLE · BIRR</p>
              </div>
              <p className="amount mono">{balances.spendable.etb.toLocaleString("en-US")}</p>
              <p className="stat-meta">for daily costs</p>
            </div>
            <div className="stat-card usd">
              <div className="tab" />
              <div className="stat-label-row">
                <span className="stat-icon c3">
                  <Icon name="handset" />
                </span>
                <p className="label">SAVED · DOLLARS</p>
              </div>
              <p className="amount mono">${balances.saved.usd.toLocaleString("en-US")}</p>
              <p className="stat-meta mono">
                ~${Math.round(projection.usd).toLocaleString("en-US")}/mo in
                {balances.spendable.usd > 0 && (
                  <> · ${balances.spendable.usd.toLocaleString("en-US")} spendable</>
                )}
              </p>
            </div>
            <div className="stat-card rate">
              <div className="tab" />
              <div className="stat-label-row">
                <span className="stat-icon c4">
                  <Icon name="headset" />
                </span>
                <p className="label">AVG SAVE RATE</p>
              </div>
              <p className="amount mono">{formatPercent(overallSavingsRate())}</p>
              <p className="stat-meta">across planned income</p>
            </div>
            </div>

            <div className="mobile-quick-actions mobile-only">
              <button type="button" className="mobile-bar-btn secondary" onClick={() => setExpenseOpen(true)}>
                Expense
              </button>
              <button type="button" className="mobile-bar-btn primary" onClick={() => setModalOpen(true)}>
                <Icon name="plus" />
                Log payday
              </button>
            </div>

            <section className="block">
            <h2 className="sec">Next payday</h2>
            <div className="next-card">
              <div className="tab" />
              <div className="next-badge">
                <span className={`next-badge-icon ${nextPayday.rule.cls}`}>
                  <Icon name={nextPayday.rule.iconKey} />
                </span>
              </div>
              <p className="when">{nextWhen}</p>
              <p className="source">{nextPayday.rule.who}</p>
              <div className="figures">
                <div className="fig">
                  <span>COMING IN</span>
                  <b className="mono">
                    {formatAmount(nextPayday.rule.received, nextPayday.rule.currency)}
                  </b>
                </div>
                <div className="fig">
                  <span>SAVE</span>
                  <b className="mono">
                    {formatAmount(nextPayday.rule.save, nextPayday.rule.currency)}
                  </b>
                </div>
                <div className="fig">
                  <span>KEEP</span>
                  <b className="mono">
                    {formatAmount(nextPayday.rule.keep, nextPayday.rule.currency)}
                  </b>
                </div>
                <div className="fig">
                  <span>RATE</span>
                  <b className="mono">
                    {formatPercent(savingsRate(nextPayday.rule.received, nextPayday.rule.save))}
                  </b>
                </div>
              </div>
            </div>
          </section>

          <section className="block">
            <div className="sec-row">
              <h2 className="sec">My paydays</h2>
              <span className="hint">Click a card to log</span>
            </div>
            <div className="grid">
              {PAYDAY_RULES.map((rule) => {
                const occurrence = nextOccurrence(rule, new Date());
                return (
                  <button
                    key={rule.id}
                    type="button"
                    className={`p-card ${rule.cls} p-card-btn`}
                    onClick={() => handleLog(rule)}
                    title={`Log ${rule.who}`}
                  >
                    <div className="tab" />
                    <div className="icon">
                      <Icon name={rule.iconKey} />
                    </div>
                    <div className="save-amt mono">save {formatAmount(rule.save, rule.currency)}</div>
                    <div className="who">{rule.who}</div>
                    <div className="next-date">{formatDate(occurrence)}</div>
                  </button>
                );
              })}
            </div>
          </section>
          </div>

          <div className={appPageClass("insights", mobileTab)}>
            <h1 className="hero mobile-page-title">Insights</h1>
            <FxRatesSection savedUsd={balances.saved.usd} spendableUsd={balances.spendable.usd} />
            <RunwayBanner etb={runwayEtb} usd={runwayUsd} />
            <MonthlyRecapCard recap={monthlyRecap} />
            {hasPaydayLogs && (showEtbBreakdown || showUsdBreakdown) && (
              <section className="block">
                <div className="sec-row sec-row-split">
                  <div className="sec-row-left">
                    <h2 className="sec">Savings by employer</h2>
                    <p className="sec-hint">
                      How much each payday (Land and Sea, MMCY, Sentrama) added to savings
                    </p>
                  </div>
                  <div className="filter-row period-toggle" role="group" aria-label="Employer totals period">
                    {(["all", "month"] as const).map((value) => (
                      <button
                        key={value}
                        type="button"
                        className={`filter-btn${sourcePeriod === value ? " active" : ""}`}
                        onClick={() => setSourcePeriod(value)}
                      >
                        {value === "all" ? "All time" : "This month"}
                      </button>
                    ))}
                  </div>
                </div>
                {sourcePeriod === "month" && (
                  <p className="period-note mono">{monthLabel}</p>
                )}
                <div className="breakdown-card">
                  {showEtbBreakdown && (
                    <SourceBreakdown
                      title="Birr employers"
                      rows={etbBreakdown}
                      period={sourcePeriod}
                      monthLabel={monthLabel}
                    />
                  )}
                  {showUsdBreakdown && (
                    <SourceBreakdown
                      title="Dollar employers"
                      rows={usdBreakdown}
                      period={sourcePeriod}
                      monthLabel={monthLabel}
                    />
                  )}
                </div>
              </section>
            )}
          </div>
        </main>

        <aside className="dashboard-side">
          <div className={appPageClass("plan", mobileTab)}>
            <h1 className="hero mobile-page-title">Plan</h1>
            <UpcomingSchedule />

          <section className="block">
            <h2 className="sec">Payday reminders</h2>
            <EmailReminders onToast={setToast} />
            <div className="remind-card remind-card-spaced">
              <p className="desc">
                Automatic emails run daily on the server when configured: a weekly digest on
                Mondays and a reminder the day before each payday. You can still send a one-off
                email above, or download the calendar file for phone alerts.
              </p>
              <button type="button" className="ics-btn" onClick={handleCalendarDownload}>
                <Icon name="bell" />
                Add paydays to my calendar
              </button>
            </div>
          </section>
          </div>

          <div className={appPageClass("history", mobileTab)}>
            <h1 className="hero mobile-page-title">Ledger</h1>
          <section className="block">
            <div className="sec-row">
              <h2 className="sec">History</h2>
              <div className="backup-actions">
                <button type="button" className="ghost-btn" onClick={() => setOpeningOpen(true)}>
                  Opening balances
                </button>
                <button type="button" className="ghost-btn" onClick={handleExport}>
                  Export
                </button>
                <button type="button" className="ghost-btn" onClick={handleImportClick}>
                  Import
                </button>
              </div>
            </div>

            <div className="filter-row">
              {(["all", "ETB", "USD"] as const).map((value) => (
                <button
                  key={value}
                  type="button"
                  className={`filter-btn${historyFilter === value ? " active" : ""}`}
                  onClick={() => setHistoryFilter(value)}
                >
                  {value === "all" ? "All" : value}
                </button>
              ))}
            </div>

            <input
              ref={importRef}
              type="file"
              accept="application/json,.json"
              hidden
              onChange={handleImportChange}
            />

            {entries.length > 0 && (
              <div className="action-row">
                <button type="button" className="ghost-btn" onClick={undoLast}>
                  Undo last entry
                </button>
              </div>
            )}

            {filteredEntries.length === 0 ? (
              <div className="empty-note">
                {entries.length === 0
                  ? 'Nothing logged yet. Set opening balances, tap "Log payday", or log an expense.'
                  : "No entries match this filter."}
              </div>
            ) : (
              <div className="history-list">
                {filteredEntries.map((entry) => {
                  const credit = entryIsCredit(entry);
                  const displayAmount = entryDisplayAmount(entry);
                  return (
                    <div
                      key={entry.id}
                      className={`entry${credit ? "" : " debit"}`}
                    >
                      <div className="entry-left">
                        <div className="chip">
                          <Icon name={entry.iconKey} />
                        </div>
                        <div>
                          <div className="entry-type">{entry.type.replace(/_/g, " ")}</div>
                          <div className="who">{entryLabel(entry)}</div>
                          <div className="date">{formatDate(new Date(entry.date))}</div>
                        </div>
                      </div>
                      <div className="entry-right">
                        <div className="amt mono">
                          {credit ? "+" : "−"}
                          {formatAmount(displayAmount, entry.currency)}
                        </div>
                        <button
                          type="button"
                          className="delete-btn"
                          aria-label={`Remove ${entryLabel(entry)} entry`}
                          onClick={() => removeEntry(entry.id)}
                        >
                          ×
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
          </div>
        </aside>

        <div className={appPageClass("coach", mobileTab)}>
          {mobileTab === "coach" && (
            <AiCoachPanel
              mode="page"
              open
              onClose={() => selectMobileTab("home")}
              {...coachChatProps}
            />
          )}
        </div>
      </div>

      <InstallPrompt forceShow={installOpen} />
      {modalOpen && <LogModal onClose={() => setModalOpen(false)} onSelect={handleLog} />}
      {expenseOpen && (
        <ExpenseModal
          onClose={() => setExpenseOpen(false)}
          onSubmit={(params) => {
            logExpense(params);
            setExpenseOpen(false);
            setToast(
              `Expense logged — ${formatAmount(params.amount, params.currency)} from ${params.pool}`,
            );
          }}
        />
      )}
      {adjustOpen && (
        <AdjustBalanceModal
          onClose={() => setAdjustOpen(false)}
          onSubmit={(params) => {
            adjustBalance(params);
            setAdjustOpen(false);
            setToast(
              `${params.direction === "add" ? "Added" : "Subtracted"} ${formatAmount(params.amount, params.currency)} ${params.direction === "add" ? "to" : "from"} ${params.pool}`,
            );
          }}
        />
      )}
      {(showOpeningWizard || openingOpen) && (
        <OpeningBalanceModal
          allowSkip={showOpeningWizard}
          onSkip={() => {
            skipOpeningBalance();
            setOpeningOpen(false);
          }}
          onClose={() => setOpeningOpen(false)}
          onSubmit={(params) => {
            addOpeningBalances(params);
            setOpeningOpen(false);
            setToast("Opening balances saved");
          }}
        />
      )}
      <MobileAppNav active={mobileTab} onSelect={selectMobileTab} />
      <MobileMoreSheet
        open={moreOpen}
        onClose={() => setMoreOpen(false)}
        onAdjust={() => setAdjustOpen(true)}
        onInstall={() => {
          resetInstallDismissal();
          setInstallOpen(true);
        }}
        onSignOut={async () => {
          await fetch("/api/auth/logout", { method: "POST" });
          window.location.href = "/login";
        }}
      />
      {conflict && (
        <SyncConflictModal
          conflict={conflict}
          onResolve={(mode) => void resolveConflict(mode)}
        />
      )}
      {toast && <Toast message={toast} onClose={() => setToast(null)} />}
      <div className="desktop-only">
        <AiCoachFab onOpen={() => setAiOpen(true)} />
      </div>
      {aiOpen && (
        <AiCoachPanel
          mode="modal"
          open
          onClose={() => setAiOpen(false)}
          {...coachChatProps}
        />
      )}
    </div>
  );
}
