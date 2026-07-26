import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { MilestoneTracker } from "../components/MilestoneTracker";
import { VaultProgressBar } from "../components/VaultProgressBar";
import { VaultLifecycle } from "../components/VaultLifecycle";
import { CountdownDeadline } from "../components/CountdownDeadline";
import Breadcrumb from "../components/Breadcrumb";
import {
  FundReleaseStatus,
  type FundReleaseStatusProps,
} from "../components/FundReleaseStatus";
import { VaultMetaPanel } from "../components/VaultMetaPanel";
import { Text } from "../components/Text";
import { useWallet } from "../context/WalletContext";
import { MASTER_VAULTS as MOCK_VAULTS } from "../fixtures/vaults";
import { contractExplorerUrl, networkLabel } from "../utils/explorer";
import { isValidIcsDeadline, downloadIcsEvent } from "../utils/ics";
import { createVaultPrefillFromVault } from "../utils/vaultPrefill";
import type { Vault, VaultStatus } from "../types/vault";

// ── Types imported from canonical source ─────────────────────────────────────
// Vault and VaultStatus are imported from "../types/vault" above.
// MOCK_VAULTS has moved to "../services/vaultService" as the master dataset.

// ── Helpers ───────────────────────────────────────────────────────────────────
const STATUS_CONFIG: Record<
  VaultStatus,
  { label: string; color: string; bg: string }
> = {
  active: {
    label: "Active",
    color: "var(--accent)",
    bg: "var(--accent-transparent)",
  },
  completed: {
    label: "Completed",
    color: "var(--success)",
    bg: "rgba(16,185,129,0.1)",
  },
  failed: {
    label: "Failed",
    color: "var(--danger)",
    bg: "rgba(239,68,68,0.1)",
  },
  cancelled: {
    label: "Cancelled",
    color: "var(--muted)",
    bg: "rgba(156,163,175,0.1)",
  },
  pending_validation: {
    label: "Pending Validation",
    color: "var(--warning)",
    bg: "rgba(245,158,11,0.1)",
  },
};

const TX_LABELS: Record<string, string> = {
  create: "Vault Created",
  validate: "Milestone Validated",
  release: "Funds Released",
  redirect: "Funds Redirected",
};

function truncHash(hash: string): string {
  return hash.length > 12 ? `${hash.slice(0, 8)}...${hash.slice(-6)}` : hash;
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function fmtDateTime(iso: string): string {
  return new Date(iso).toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function timelineProgress(created: string, deadline: string): number {
  const start = new Date(created).getTime();
  const end = new Date(deadline).getTime();
  const now = Date.now();
  return Math.min(100, Math.max(0, ((now - start) / (end - start)) * 100));
}

function settlementForVault(vault: Vault): FundReleaseStatusProps {
  const releaseTx = vault.transactions.find((tx) => tx.type === "release");
  const redirectTx = vault.transactions.find((tx) => tx.type === "redirect");

  if (vault.status === "completed") {
    return {
      outcome: "released",
      destinationAddress: vault.successAddress,
      amount: releaseTx?.amount ?? vault.amount,
      currency: vault.currency,
      transaction: releaseTx,
    };
  }

  if (vault.status === "failed" || vault.status === "cancelled") {
    return {
      outcome: "redirected",
      destinationAddress: vault.failureAddress,
      amount: redirectTx?.amount ?? vault.amount,
      currency: vault.currency,
      transaction: redirectTx,
    };
  }

  return {
    outcome: "pending",
    amount: vault.amount,
    currency: vault.currency,
  };
}

// ── Section Card ─────────────────────────────────────────────────────────────
function Card({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: React.CSSProperties;
}) {
  return (
    <div
      style={{
        background: "var(--surface)",
        border: "1px solid var(--border)",
        borderRadius: "var(--radius)",
        padding: "1.25rem",
        ...style,
      }}
    >
      {children}
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function VaultDetail() {
  const { id } = useParams<{ id: string }>();
  const vault = id ? MOCK_VAULTS[id] : undefined;
  const { network } = useWallet();

  if (!vault) {
    return (
      <div style={{ textAlign: "center", padding: "4rem 1rem" }}>
        <Text role="title" as="h2" style={{ marginBottom: "0.5rem" }}>
          Vault not found
        </Text>
        <Text
          role="body"
          as="p"
          style={{ color: "var(--muted)", marginBottom: "1.5rem" }}
        >
          No vault with ID "{id}" exists.
        </Text>
        <Link to="/vaults" style={{ color: "var(--accent)" }}>
          ← Back to Vaults
        </Link>
      </div>
    );
  }

  const statusCfg = STATUS_CONFIG[vault.status];
  const progress = timelineProgress(vault.createdAt, vault.deadline);
  const isActive =
    vault.status === "active" || vault.status === "pending_validation";
  const settlement = settlementForVault(vault);
  const canExportDeadline = isValidIcsDeadline(vault.deadline);
  const handleCalendarExport = () => {
    downloadIcsEvent({
      title: `${vault.name} deadline`,
      deadline: vault.deadline,
      description: `${vault.name} vault deadline for ${vault.amount.toLocaleString()} ${vault.currency}.`,
      uid: `vault-${vault.id}-deadline`,
    });
  };

  return (
    <div
      style={{
        maxWidth: "var(--container-detail)",
        margin: "0 auto",
        padding: "0 0 3rem",
      }}
    >
      <Breadcrumb
        segments={[
          { label: "Home", to: "/" },
          { label: "Vaults", to: "/vaults" },
          { label: vault.name },
        ]}
        style={{ marginBottom: "var(--spacing-4)" }}
      />

      {/* Back link */}
      <Link
        to="/vaults"
        style={{
          color: "var(--muted)",
          fontSize: 14,
          display: "inline-block",
          marginBottom: "1.25rem",
        }}
      >
        ← Back to Vaults
      </Link>

      {/* ── Header ── */}
      <Card style={{ marginBottom: "1.25rem" }}>
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: "1rem",
            justifyContent: "space-between",
            alignItems: "flex-start",
          }}
        >
          <div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.75rem",
                flexWrap: "wrap",
                marginBottom: "0.5rem",
              }}
            >
              <Text role="title" as="h1" style={{ margin: 0 }}>
                {vault.name}
              </Text>
              <span
                style={{
                  background: statusCfg.bg,
                  color: statusCfg.color,
                  border: `var(--border-width-1) solid ${statusCfg.color}`,
                  borderRadius: "var(--radius-full)",
                  padding: "2px 12px",
                  fontSize: 13,
                  fontWeight: 600,
                }}
              >
                {statusCfg.label}
              </span>
            </div>
            <Text
              role="display"
              as="div"
              style={{ color: "var(--accent)", lineHeight: 1.1 }}
            >
              {vault.amount.toLocaleString()}{" "}
              <span
                style={{
                  fontSize: "0.45em",
                  color: "var(--muted)",
                  fontWeight: 400,
                }}
              >
                {vault.currency}
              </span>
            </Text>
          </div>

          {/* Quick Actions */}
          <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
            <Link
              to="/vaults/create"
              state={createVaultPrefillFromVault(vault)}
              style={{
                ...actionBtn("var(--accent)"),
                textDecoration: "none",
                display: "inline-flex",
                alignItems: "center",
              }}
            >
              Duplicate Vault
            </Link>
            {isActive && (
              <>
                {vault.status === "pending_validation" && (
                  <button style={actionBtn("var(--accent)")}>
                    Validate Milestone
                  </button>
                )}
                <button style={actionBtn("var(--warning)")}>
                  Extend Deadline
                </button>
                <button style={actionBtn("var(--danger)")}>Cancel Vault</button>
              </>
            )}
          </div>
        </div>
      </Card>

      {/* ── Timeline ── */}
      <Card style={{ marginBottom: "1.25rem" }}>
        <Text
          role="caption"
          as="div"
          style={{
            color: "var(--muted)",
            marginBottom: "1rem",
            textTransform: "uppercase",
            letterSpacing: "0.05em",
          }}
        >
          Status Timeline
        </Text>
        <VaultProgressBar
          value={progress}
          label={`${vault.name} timeline progress`}
          showValue={false}
        />
        <VaultLifecycle status={vault.status} />
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: "0.5rem",
            marginTop: "0.5rem",
          }}
        >
          <Text role="caption" as="span" style={{ color: "var(--muted)" }}>
            Created {fmtDate(vault.createdAt)}
          </Text>
          {isActive ? (
            <CountdownDeadline deadline={vault.deadline} />
          ) : (
            <Text
              role="caption"
              as="span"
              style={{ color: statusCfg.color, fontWeight: 600 }}
            >
              {statusCfg.label}
            </Text>
          )}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
              flexWrap: "wrap",
            }}
          >
            <Text role="caption" as="span" style={{ color: "var(--muted)" }}>
              Deadline {fmtDate(vault.deadline)}
            </Text>
            {canExportDeadline ? (
              <button
                type="button"
                onClick={handleCalendarExport}
                style={actionBtn("var(--accent)")}
              >
                Add to calendar
              </button>
            ) : null}
          </div>
        </div>
      </Card>

      {/* ── Info + Addresses ── */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
          gap: "1.25rem",
          marginBottom: "1.25rem",
        }}
      >
        <Card>
          <Text
            role="caption"
            as="div"
            style={{
              color: "var(--muted)",
              marginBottom: "1rem",
              textTransform: "uppercase",
              letterSpacing: "0.05em",
            }}
          >
            Vault Info
          </Text>
          <div
            style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}
          >
            <InfoRow label="Created" value={fmtDateTime(vault.createdAt)} />
            <InfoRow label="Deadline" value={fmtDateTime(vault.deadline)} />
            <InfoRow
              label="Duration"
              value={durationLabel(vault.createdAt, vault.deadline)}
            />
            <InfoRow
              label="Amount"
              value={`${vault.amount.toLocaleString()} ${vault.currency}`}
            />
          </div>
        </Card>

        <Card>
          <VaultMetaPanel
            network={network}
            creatorAddress={vault.creatorAddress}
            verifierAddress={vault.verifierAddress}
            successAddress={vault.successAddress}
            failureAddress={vault.failureAddress}
            contractAddress={vault.contractAddress}
          />
        </Card>
      </div>

      <FundReleaseStatus {...settlement} />

      {/* ── Milestones ── */}
      <Card style={{ marginBottom: "1.25rem" }}>
        <Text
          role="caption"
          as="div"
          style={{
            color: "var(--muted)",
            marginBottom: "1rem",
            textTransform: "uppercase",
            letterSpacing: "0.05em",
          }}
        >
          Milestones
        </Text>
        <MilestoneTracker milestones={vault.milestones} />
      </Card>

      {/* ── Transactions ── */}
      <Card>
        <Text
          role="caption"
          as="div"
          style={{
            color: "var(--muted)",
            marginBottom: "1rem",
            textTransform: "uppercase",
            letterSpacing: "0.05em",
          }}
        >
          Transaction History
        </Text>
        <div
          style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}
        >
          {vault.transactions.map((tx) => (
            <div
              key={tx.id}
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                flexWrap: "wrap",
                gap: 8,
                padding: "0.75rem",
                background: "var(--bg)",
                border: "1px solid var(--border)",
                borderRadius: "var(--radius)",
              }}
            >
              <div>
                <Text
                  role="caption"
                  as="div"
                  style={{ fontWeight: 600, marginBottom: 2 }}
                >
                  {TX_LABELS[tx.type]}
                </Text>
                <Text role="caption" as="div" style={{ color: "var(--muted)" }}>
                  {fmtDateTime(tx.timestamp)}
                </Text>
              </div>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  flexWrap: "wrap",
                }}
              >
                {tx.amount != null && (
                  <Text
                    role="caption"
                    as="span"
                    style={{ color: "var(--text)", fontWeight: 600 }}
                  >
                    {tx.amount.toLocaleString()} {vault.currency}
                  </Text>
                )}
                <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                  <Text
                    role="mono"
                    as="span"
                    style={{ color: "var(--muted)", fontSize: 11 }}
                  >
                    {truncHash(tx.hash)}
                  </Text>
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(tx.hash).catch(() => {});
                    }}
                    title="Copy hash"
                    style={{
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      color: "var(--muted)",
                      padding: "0 4px",
                      fontSize: 13,
                      lineHeight: 1,
                    }}
                  >
                    ⎘
                  </button>
                  <a
                    href={`https://stellar.expert/explorer/public/tx/${tx.hash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ color: "var(--accent)", fontSize: 11 }}
                  >
                    ↗
                  </a>
                </div>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* ── Network Footer Banner ── */}
      <NetworkFooterBanner
        network={network}
        contractAddress={vault.contractAddress}
      />
    </div>
  );
}

// ── Network Footer Banner ─────────────────────────────────────────────────────
interface NetworkFooterBannerProps {
  network: string | null | undefined;
  contractAddress: string;
}

function NetworkFooterBanner({ network, contractAddress }: NetworkFooterBannerProps) {
  const label = networkLabel(network);
  const explorerUrl = contractAddress
    ? contractExplorerUrl(contractAddress, network ?? 'TESTNET')
    : '';

  const isTestnet = network !== 'PUBLIC';
  const networkStatusColor = isTestnet
    ? "var(--warning, #f59e0b)"
    : "var(--success, #10b981)";

  return (
    <footer
      aria-label="Network information"
      style={{
        marginTop: "1.5rem",
        padding: "0.75rem 1rem",
        borderRadius: "var(--radius)",
        border: `1px solid ${networkStatusColor}`,
        background: isTestnet
          ? "rgba(245,158,11,0.07)"
          : "rgba(16,185,129,0.07)",
        display: "flex",
        flexWrap: "wrap",
        alignItems: "center",
        gap: "0.5rem 1rem",
      }}
    >
      {/* Network badge */}
      <span
        aria-label={`Network: ${label}`}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: "0.4rem",
          fontWeight: 700,
          fontSize: 12,
          letterSpacing: "0.06em",
          textTransform: "uppercase",
          color: networkStatusColor,
        }}
      >
        <span
          aria-hidden="true"
          style={{
            display: "inline-block",
            width: 8,
            height: 8,
            borderRadius: "50%",
            background: networkStatusColor,
          }}
        />
        {label}
      </span>

      {/* Contract address */}
      {contractAddress && (
        <Text
          role="mono"
          as="span"
          style={{ color: "var(--muted)", fontSize: 12, flex: 1, minWidth: 0 }}
          aria-label={`Contract address: ${contractAddress}`}
        >
          {contractAddress}
        </Text>
      )}

      {/* Explorer link */}
      {explorerUrl && (
        <a
          href={explorerUrl}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`View contract ${contractAddress} on Stellar ${label} explorer`}
          style={{
            color: networkStatusColor,
            fontSize: 12,
            fontWeight: 600,
            textDecoration: "none",
            whiteSpace: "nowrap",
          }}
        >
          View on Explorer ↗
        </a>
      )}
    </footer>
  );
}

// ── Small helpers ─────────────────────────────────────────────────────────────
function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        gap: 8,
        flexWrap: "wrap",
      }}
    >
      <Text role="caption" as="span" style={{ color: "var(--muted)" }}>
        {label}
      </Text>
      <Text
        role="caption"
        as="span"
        style={{ color: "var(--text)", textAlign: "right" }}
      >
        {value}
      </Text>
    </div>
  );
}

function durationLabel(start: string, end: string): string {
  const days = Math.round(
    (new Date(end).getTime() - new Date(start).getTime()) / 86400000,
  );
  if (days >= 365) return `${Math.round(days / 365)}y`;
  if (days >= 30) return `${Math.round(days / 30)}mo`;
  return `${days}d`;
}

function actionBtn(color: string): React.CSSProperties {
  return {
    background: "transparent",
    border: `1px solid ${color}`,
    color,
    borderRadius: "var(--radius)",
    padding: "0.4rem 0.9rem",
    cursor: "pointer",
    fontSize: 13,
    fontWeight: 600,
    minHeight: 36,
  };
}
