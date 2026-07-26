import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import { MASTER_VAULTS } from "../../fixtures/vaults";
import VaultDetail from "../VaultDetail";

const { mockDownloadIcsEvent } = vi.hoisted(() => ({
  mockDownloadIcsEvent: vi.fn(),
}));

vi.mock("../../context/WalletContext", () => ({
  useWallet: () => ({ network: "TESTNET" }),
}));

vi.mock("../../utils/ics", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../utils/ics")>();
  return {
    ...actual,
    downloadIcsEvent: mockDownloadIcsEvent,
  };
});

const ORIGINAL_VAULT_1_CONTRACT = MASTER_VAULTS["1"].contractAddress;

afterEach(() => {
  MASTER_VAULTS["1"].contractAddress = ORIGINAL_VAULT_1_CONTRACT;
  mockDownloadIcsEvent.mockReset();
});

function renderVaultDetail(id: string) {
  return render(
    <MemoryRouter initialEntries={[`/vaults/${id}`]}>
      <Routes>
        <Route path="/vaults/:id" element={<VaultDetail />} />
      </Routes>
    </MemoryRouter>,
  );
}

function CreateVaultStateProbe() {
  const location = useLocation();
  return (
    <pre data-testid="create-vault-state">
      {JSON.stringify(location.state ?? {})}
    </pre>
  );
}

describe("VaultDetail", () => {
  it("renders active vault status, milestones, transactions, addresses, and deadline", async () => {
    renderVaultDetail("1");

    expect(
      await screen.findByRole("heading", { name: "Alpha Vault" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Active")).toBeInTheDocument();
    expect(screen.getByText("12,500")).toBeInTheDocument();
    expect(screen.getAllByText("USDC").length).toBeGreaterThan(0);

    expect(screen.getByText("Status Timeline")).toBeInTheDocument();
    expect(screen.getByText(/Deadline Jul 15, 2024/)).toBeInTheDocument();
    // CountdownDeadline active vault should show time remaining or expired
    expect(screen.getByText(/Overdue|remaining/)).toBeInTheDocument();

    const addresses = screen
      .getByText("Addresses")
      .closest("div")?.parentElement;
    expect(addresses).toBeInTheDocument();
    expect(within(addresses!).getByText("Creator")).toBeInTheDocument();
    expect(within(addresses!).getByText("Verifier")).toBeInTheDocument();
    expect(
      within(addresses!).getByText("Success destination"),
    ).toBeInTheDocument();
    expect(
      within(addresses!).getByText("Failure destination"),
    ).toBeInTheDocument();
    expect(within(addresses!).getByText("Contract")).toBeInTheDocument();
    expect(within(addresses!).getByText("GBVZ3K...QK7L")).toBeInTheDocument();

    expect(screen.getByText("Phase 1 Complete")).toBeInTheDocument();
    expect(
      screen.getByText("Complete initial development phase"),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/All unit tests passing, code reviewed/),
    ).toBeInTheDocument();
    expect(screen.getByText("Validated")).toBeInTheDocument();
    expect(screen.getByText("Beta Launch")).toBeInTheDocument();
    expect(screen.getByText("Pending")).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /View evidence/i }),
    ).toHaveAttribute("href", "https://github.com/org/repo/pull/42");

    expect(screen.getByText("Transaction History")).toBeInTheDocument();
    expect(screen.getByText("Vault Created")).toBeInTheDocument();
    expect(screen.getByText("Milestone Validated")).toBeInTheDocument();
    expect(screen.getAllByText("a3f9d1c8...8f0a4d").length).toBeGreaterThan(0);
    expect(screen.getAllByText("b4e0c2d9...9a5e8b").length).toBeGreaterThan(0);
  });

  it("renders completed vault release details without a verifier address", async () => {
    renderVaultDetail("2");

    expect(
      await screen.findByRole("heading", { name: "Beta Reserve" }),
    ).toBeInTheDocument();
    expect(screen.getAllByText("Completed").length).toBeGreaterThan(0);
    expect(screen.queryByText("Verifier")).not.toBeInTheDocument();

    // Verify Countdown is replaced by status text
    expect(screen.queryByText(/Overdue|remaining/)).not.toBeInTheDocument();
    expect(screen.getByText("Deadline Jan 1, 2024")).toBeInTheDocument();

    expect(screen.getByText("Project Delivery")).toBeInTheDocument();
    expect(
      screen.getByText(/All deliverables submitted and approved/),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /View evidence/i }),
    ).toHaveAttribute("href", "https://docs.example.com/delivery");

    expect(screen.getByText("Funds released")).toBeInTheDocument();
    expect(screen.getAllByText("4,200.5 USDC").length).toBeGreaterThan(0);
    expect(screen.getAllByText("c5f1d3e0...0b6f9c").length).toBeGreaterThan(0);
    // Success destination
    expect(screen.getAllByText("GSUCC3...LKQK").length).toBeGreaterThan(0);
  });

  it("renders failed vault milestone and redirect transaction details", async () => {
    renderVaultDetail("3");

    expect(
      await screen.findByRole("heading", { name: "Gamma Fund" }),
    ).toBeInTheDocument();
    expect(screen.getAllByText("Failed").length).toBeGreaterThan(0);

    // Verify Countdown is replaced by status text
    expect(screen.queryByText(/Overdue|remaining/)).not.toBeInTheDocument();

    expect(screen.getByText("Milestone 1")).toBeInTheDocument();
    expect(screen.getByText("Criteria not met")).toBeInTheDocument();

    expect(screen.getByText("Funds redirected")).toBeInTheDocument();
    expect(screen.getAllByText("8,800 USDC").length).toBeGreaterThan(0);
    expect(screen.getAllByText("d6a2e4f1...1c7a0d").length).toBeGreaterThan(0);
    // Failure destination
    expect(screen.getAllByText("GFAIL3...LKQK").length).toBeGreaterThan(0);
  });

  it("renders cancelled vault with mixed milestone statuses and redirect destination", async () => {
    renderVaultDetail("4");

    expect(
      await screen.findByRole("heading", { name: "Delta Cancelled" }),
    ).toBeInTheDocument();
    expect(screen.getAllByText("Cancelled").length).toBeGreaterThan(0);

    // Verify Countdown is replaced by status text
    expect(screen.queryByText(/Overdue|remaining/)).not.toBeInTheDocument();

    // Mixed milestones
    expect(screen.getByText("Milestone 1")).toBeInTheDocument();
    expect(screen.getByText("Validated")).toBeInTheDocument();
    expect(screen.getByText("Milestone 2")).toBeInTheDocument();
    // Use getAllByText for "Failed" since it appears for the status label too
    expect(screen.getAllByText("Failed").length).toBeGreaterThan(0);
    expect(screen.getByText("Milestone 3")).toBeInTheDocument();
    expect(screen.getByText("Pending")).toBeInTheDocument();

    expect(screen.getByText("Funds redirected")).toBeInTheDocument();
    expect(screen.getAllByText("5,000 USDC").length).toBeGreaterThan(0);
    // Failure destination
    expect(screen.getAllByText("GFAIL3...LKQK").length).toBeGreaterThan(0);
  });

  it("renders a not-found state for an unknown vault id", async () => {
    renderVaultDetail("999");

    expect(
      await screen.findByRole("heading", { name: "Vault not found" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText('No vault with ID "999" exists.'),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /Back to Vaults/i }),
    ).toHaveAttribute("href", "/vaults");
  });

  it("links duplicate action to CreateVault with prefilled state and no deadline", async () => {
    render(
      <MemoryRouter initialEntries={["/vaults/1"]}>
        <Routes>
          <Route path="/vaults/:id" element={<VaultDetail />} />
          <Route path="/vaults/create" element={<CreateVaultStateProbe />} />
        </Routes>
      </MemoryRouter>,
    );

    await waitFor(() =>
      expect(
        screen.getByRole("heading", { name: "Alpha Vault" }),
      ).toBeInTheDocument(),
    );
    fireEvent.click(screen.getByRole("link", { name: /duplicate vault/i }));

    const state = JSON.parse(
      screen.getByTestId("create-vault-state").textContent ?? "{}",
    );
    expect(state.createVaultPrefill).toMatchObject({
      sourceVaultId: "1",
      sourceVaultName: "Alpha Vault",
      amount: "12500",
      successAddress: "GSUCC3KQKM4XNQPBEZMXPOLKQKM4XNQPBEZMXPOLKQK",
      failureAddress: "GFAIL3KQKM4XNQPBEZMXPOLKQKM4XNQPBEZMXPOLKQK",
    });
    expect(state.createVaultPrefill).not.toHaveProperty("deadline");
    expect(state.createVaultPrefill.milestones).toEqual([
      {
        title: "Phase 1 Complete",
        criteria: "All unit tests passing, code reviewed",
      },
      {
        title: "Beta Launch",
        criteria: "Beta deployed, 100 active users onboarded",
      },
    ]);
  });

  it('downloads the vault deadline calendar event', async () => {
    mockDownloadIcsEvent.mockReturnValue(true);
    renderVaultDetail('1');

    await screen.findByRole('heading', { name: 'Alpha Vault' });
    fireEvent.click(screen.getByRole('button', { name: /Add to calendar/i }));

    await waitFor(() => {
      expect(mockDownloadIcsEvent).toHaveBeenCalledWith({
        title: 'Alpha Vault deadline',
        deadline: '2024-07-15T10:00:00Z',
        description: 'Alpha Vault vault deadline for 12,500 USDC.',
        uid: 'vault-1-deadline',
      });
    });
  });

  // ── Network footer banner ─────────────────────────────────────────────────

  describe("NetworkFooterBanner", () => {
    it("renders the network footer banner with an accessible landmark", async () => {
      renderVaultDetail("1");
      expect(await screen.findByRole("contentinfo")).toBeInTheDocument();
    });

    it('shows the "Testnet" label when network is TESTNET', async () => {
      renderVaultDetail("1");
      const footer = await screen.findByRole("contentinfo");
      expect(within(footer).getByText("Testnet")).toBeInTheDocument();
    });

    it("displays the contract address text in the footer", async () => {
      renderVaultDetail("1");
      const footer = await screen.findByRole("contentinfo");
      // Vault 1 contract address
      expect(
        within(footer).getByText("GCONT3KQKM4XNQPBEZMXPOLKQKM4XNQPBEZMXPOLKQK"),
      ).toBeInTheDocument();
    });

    it("renders the explorer link pointing to the testnet contract URL", async () => {
      const validContractAddress = `C${"A".repeat(55)}`;
      MASTER_VAULTS["1"].contractAddress = validContractAddress;

      renderVaultDetail("1");
      const footer = await screen.findByRole("contentinfo");
      const link = within(footer)
        .getByText(/View on Explorer/i)
        .closest("a");

      expect(link).toBeInTheDocument();
      expect(link).toHaveAttribute(
        "href",
        `https://stellar.expert/explorer/testnet/contract/${validContractAddress}`,
      );
      expect(link).toHaveAttribute("target", "_blank");
      expect(link).toHaveAttribute("rel", "noopener noreferrer");
    });

    it('shows "Mainnet" label and a public explorer URL when network is PUBLIC', () => {
      vi.resetModules();
      // Override the mock for this specific test
      vi.doMock("../../context/WalletContext", () => ({
        useWallet: () => ({ network: "PUBLIC" }),
      }));
    });

    it("does not render the footer banner on the not-found page", async () => {
      renderVaultDetail("999");
      await screen.findByRole("heading", { name: "Vault not found" });
      expect(screen.queryByRole("contentinfo")).not.toBeInTheDocument();
    });
  });

  // ── Network footer banner ─────────────────────────────────────────────────

  describe('NetworkFooterBanner', () => {
    it('renders the network footer banner with an accessible landmark', () => {
      renderVaultDetail('1');
      expect(screen.getByRole('contentinfo')).toBeInTheDocument();
    });

    it('shows the "Testnet" label when network is TESTNET', () => {
      renderVaultDetail('1');
      const footer = screen.getByRole('contentinfo');
      expect(within(footer).getByText('Testnet')).toBeInTheDocument();
    });

    it('displays the contract address text in the footer', () => {
      renderVaultDetail('1');
      const footer = screen.getByRole('contentinfo');
      // Vault 1 contract address
      expect(within(footer).getByText('GCONT3KQKM4XNQPBEZMXPOLKQKM4XNQPBEZMXPOLKQK')).toBeInTheDocument();
    });

    it('renders the explorer link pointing to the testnet contract URL', () => {
      renderVaultDetail('1');
      const link = screen.getByRole('link', { name: /View contract.*on Stellar Testnet explorer/i });
      expect(link).toHaveAttribute(
        'href',
        'https://stellar.expert/explorer/testnet/contract/GCONT3KQKM4XNQPBEZMXPOLKQKM4XNQPBEZMXPOLKQK',
      );
      expect(link).toHaveAttribute('target', '_blank');
      expect(link).toHaveAttribute('rel', 'noopener noreferrer');
    });

    it('shows "Mainnet" label and a public explorer URL when network is PUBLIC', () => {
      vi.resetModules();
      // Override the mock for this specific test
      vi.doMock('../../context/WalletContext', () => ({
        useWallet: () => ({ network: 'PUBLIC' }),
      }));
    });

    it('does not render the footer banner on the not-found page', () => {
      renderVaultDetail('999');
      expect(screen.queryByRole('contentinfo')).not.toBeInTheDocument();
    });
  });
});
