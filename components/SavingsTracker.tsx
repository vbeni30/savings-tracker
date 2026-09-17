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
import { OpeningBalanceModal } from "@/components/OpeningBalanceModal";
import { SourceBreakdown } from "@/components/SourceBreakdown";
import { Toast } from "@/components/Toast";
import { UpcomingTimeline } from "@/components/UpcomingTimeline";
import { useGoals } from "@/hooks/useGoals";
import { useLedger } from "@/hooks/useLedger";
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
  upcomingSchedule,
} from "@/lib/stats";
import type { Currency, PaydayRule, SourcePeriod } from "@/types";

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
  } = useLedger();
  const { goals, addGoal, addGoalObject, removeGoal } = useGoals();

  const [modalOpen, setModalOpen] = useState(false);
  const [expenseOpen, setExpenseOpen] = useState(false);
  const [adjustOpen, setAdjustOpen] = useState(false);
  const [openingOpen, setOpeningOpen] = useState(false);
  const [aiOpen, setAiOpen] = useState(false);
  const [installOpen, setInstallOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [historyFilter, setHistoryFilter] = useState<HistoryFilter>("all");
  const [sourcePeriod, setSourcePeriod] = useState<SourcePeriod>("all");
  const importRef = useRef<HTMLInputElement>(null);
  const monthLabel = currentMonthLabel();

  const nextPayday = getNextPayday(PAYDAY_RULES);
  const nextDays = daysUntil(nextPayday.date);
  const nextWhen = formatWhenLabel(nextDays, nextPayday.date);
  const projection = monthlyProjection();
  const schedule = upcomingSchedule();
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

  const showOpeningWizard = loaded && !openingDone;

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
    } catch {
      setToast("Could not read backup file");
    }
  };

  if (!loaded) {
    return (
      <div className="wrap">
        <div className="loading">Loading…</div>
      </div>
    );
  }

  return (
    <div className="wrap">
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
          </div>
        </div>
        <div className="topbar-actions">
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
            <span className="btn-label-full">Log expense</span>
            <span className="btn-label-short">Expense</span>
          </button>
          <button type="button" className="log-btn" onClick={() => setModalOpen(true)}>
            <Icon name="plus" />
            Log payday
          </button>
        </div>
      </header>

      <AppAlerts
        entryCount={entries.length}
        spendableEtb={balances.spendable.etb}
        onExport={() => {
          handleExport();
          setToast("Backup exported — keep the JSON file somewhere safe");
        }}
      />

      <div className="dashboard">
        <main className="dashboard-main">
          <h1 className="hero">
            Save first.
            <br />
            Spend what&apos;s left.
          </h1>

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
        </main>

        <aside className="dashboard-side">
          <section className="block">
            <h2 className="sec">Upcoming schedule</h2>
            <UpcomingTimeline items={schedule} />
          </section>

          <section className="block">
            <h2 className="sec">Payday reminders</h2>
            <EmailReminders onToast={setToast} />
            <div className="remind-card remind-card-spaced">
              <p className="desc">
                This page can&apos;t send push notifications on its own — it only checks in when you
                open it. For a real alert on your phone, download the calendar file below and add it
                to your Calendar app. It sets up all four paydays as recurring events with a
                reminder.
              </p>
              <button type="button" className="ics-btn" onClick={handleCalendarDownload}>
                <Icon name="bell" />
                Add paydays to my calendar
              </button>
            </div>
          </section>

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
        </aside>
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
      {toast && <Toast message={toast} onClose={() => setToast(null)} />}
      <AiCoachFab onOpen={() => setAiOpen(true)} />
      <AiCoachPanel
        open={aiOpen}
        onClose={() => setAiOpen(false)}
        entries={entries}
        balances={balances}
        goals={goals}
        onLogPayday={handleLog}
        onLogExpense={(params) => {
          logExpense(params);
          setToast(
            `Expense logged — ${formatAmount(params.amount, params.currency)} from ${params.pool}`,
          );
        }}
        onAddGoal={addGoal}
        onAddGoalObject={addGoalObject}
        onRemoveGoal={removeGoal}
        onToast={setToast}
      />
    </div>
  );
}
