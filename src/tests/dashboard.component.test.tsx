// @vitest-environment jsdom
/**
 * @file src/tests/dashboard.component.test.tsx
 * @description Component integration and accessibility tests for DashboardView.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { axe } from "vitest-axe";
import DashboardView from "../components/DashboardView";
import { MOCK_PLAN } from "./fixtures";
import "./setup";

describe("DashboardView Component", () => {
  const defaultProps = {
    plan: MOCK_PLAN,
    eventDate: "2027-06-15",
    location: "Mumbai",
    currency: "INR" as const,
    onReset: vi.fn(),
  };

  beforeEach(() => {
    localStorage.clear();
  });

  it("renders event title as h1", () => {
    render(<DashboardView {...defaultProps} />);
    const heading = screen.getByRole("heading", { level: 1 });
    expect(heading).toHaveTextContent(MOCK_PLAN.eventName);
  });

  it("focuses the h1 heading on mount", () => {
    render(<DashboardView {...defaultProps} />);
    const heading = screen.getByRole("heading", { level: 1 });
    expect(document.activeElement).toBe(heading);
  });

  it("renders tabs with non-empty accessible names for mobile and screen readers", () => {
    render(<DashboardView {...defaultProps} />);
    const budgetTab = screen.getByRole("tab", { name: /budget/i });
    const timelineTab = screen.getByRole("tab", { name: /timeline/i });
    const vendorsTab = screen.getByRole("tab", { name: /vendors/i });
    const ideasTab = screen.getByRole("tab", { name: /ideas/i });

    expect(budgetTab).toHaveAccessibleName(/budget/i);
    expect(timelineTab).toHaveAccessibleName(/timeline/i);
    expect(vendorsTab).toHaveAccessibleName(/vendors/i);
    expect(ideasTab).toHaveAccessibleName(/ideas/i);
  });

  it("renders print-only headings for all tab panels", () => {
    const { container } = render(<DashboardView {...defaultProps} />);
    const printHeadings = container.querySelectorAll(".print-only-heading");
    expect(printHeadings.length).toBe(4);
    expect(printHeadings[0]?.textContent).toContain("Budget");
    expect(printHeadings[1]?.textContent).toContain("Timeline");
    expect(printHeadings[2]?.textContent).toContain("Vendors");
    expect(printHeadings[3]?.textContent).toContain("Ideas");
  });

  it("supports keyboard arrow/Home/End navigation between tabs", async () => {
    const user = userEvent.setup();
    render(<DashboardView {...defaultProps} />);

    const budgetTab = screen.getByRole("tab", { name: /budget/i });
    const timelineTab = screen.getByRole("tab", { name: /timeline/i });
    const vendorsTab = screen.getByRole("tab", { name: /vendors/i });
    const ideasTab = screen.getByRole("tab", { name: /ideas/i });

    // Initial state: Budget is active
    expect(budgetTab).toHaveAttribute("aria-selected", "true");

    // Focus budget tab and press ArrowRight -> moves to Timeline
    budgetTab.focus();
    await user.keyboard("{ArrowRight}");
    expect(timelineTab).toHaveAttribute("aria-selected", "true");

    // ArrowRight -> Vendors
    await user.keyboard("{ArrowRight}");
    expect(vendorsTab).toHaveAttribute("aria-selected", "true");

    // End key -> jumps to Ideas (last tab)
    await user.keyboard("{End}");
    expect(ideasTab).toHaveAttribute("aria-selected", "true");

    // Home key -> jumps to Budget (first tab)
    await user.keyboard("{Home}");
    expect(budgetTab).toHaveAttribute("aria-selected", "true");

    // ArrowLeft -> wraps to Ideas (last tab)
    await user.keyboard("{ArrowLeft}");
    expect(ideasTab).toHaveAttribute("aria-selected", "true");
  });

  it("preserves timeline task checkbox state across tab switches", async () => {
    const user = userEvent.setup();
    render(<DashboardView {...defaultProps} />);

    // Switch to Timeline tab
    const timelineTab = screen.getByRole("tab", { name: /timeline/i });
    await user.click(timelineTab);

    // Find the first task checkbox
    const checkboxes = screen.getAllByRole("checkbox");
    expect(checkboxes.length).toBeGreaterThan(0);
    const firstCheckbox = checkboxes[0]!;
    expect(firstCheckbox).not.toBeChecked();

    // Check the task
    await user.click(firstCheckbox);
    expect(firstCheckbox).toBeChecked();

    // Switch to Vendors tab
    const vendorsTab = screen.getByRole("tab", { name: /vendors/i });
    await user.click(vendorsTab);

    // Switch back to Timeline tab
    await user.click(timelineTab);

    // Checkbox should STILL be checked (mounted with hidden attribute + localStorage)
    const checkboxesAfter = screen.getAllByRole("checkbox");
    expect(checkboxesAfter[0]!).toBeChecked();
  });

  it("has zero accessibility violations according to axe", async () => {
    const { container } = render(<DashboardView {...defaultProps} />);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it("handles CSV export and print actions in GoogleActions", async () => {
    const user = userEvent.setup();
    window.print = vi.fn();
    global.URL.createObjectURL = vi.fn(() => "blob:mock");
    global.URL.revokeObjectURL = vi.fn();
    render(<DashboardView {...defaultProps} />);

    const exportBtn = screen.getByRole("button", { name: /export to google sheets/i });
    await user.click(exportBtn);

    const icsBtn = screen.getByRole("button", { name: /add timeline to calendar \(\.ics\)/i });
    await user.click(icsBtn);

    const printBtn = screen.getByRole("button", { name: /print \/ save as pdf/i });
    await user.click(printBtn);
    expect(window.print).toHaveBeenCalled();

    const calLink = screen.getByRole("link", {
      name: /sync with google calendar \(opens in new tab\)/i,
    });
    expect(calLink).toHaveAttribute("target", "_blank");
  });

  it("toggles vendor vetting questions", async () => {
    const user = userEvent.setup();
    render(<DashboardView {...defaultProps} />);
    const vendorsTab = screen.getByRole("tab", { name: /vendors/i });
    await user.click(vendorsTab);

    const expandBtn = screen.getByLabelText(/expand vetting questions for photography/i);
    await user.click(expandBtn);
    expect(screen.getByText(/Can we see a full wedding gallery\?/i)).toBeInTheDocument();

    const collapseBtn = screen.getByLabelText(/collapse vetting questions for photography/i);
    await user.click(collapseBtn);
  });

  it("renders budget breakdown with all priority levels and handles edge total amounts", () => {
    const customPlan: typeof MOCK_PLAN = {
      ...MOCK_PLAN,
      totalEstimatedCost: 0,
      budgetBreakdown: [
        {
          category: "Cat1",
          allocatedAmount: 0,
          priority: "critical" as const,
          costSavingTip: "Tip 1",
        },
        {
          category: "Cat2",
          allocatedAmount: 0,
          priority: "high" as const,
          costSavingTip: "Tip 2",
        },
        {
          category: "Cat3",
          allocatedAmount: 0,
          priority: "medium" as const,
          costSavingTip: "Tip 3",
        },
        { category: "Cat4", allocatedAmount: 0, priority: "low" as const, costSavingTip: "Tip 4" },
        {
          category: "Cat5",
          allocatedAmount: 0,
          priority: "other" as unknown as "low",
          costSavingTip: "Tip 5",
        },
      ],
    };

    render(<DashboardView {...defaultProps} plan={customPlan} />);
    expect(screen.getByText("Cat1")).toBeInTheDocument();
    expect(screen.getByText("Cat2")).toBeInTheDocument();
    expect(screen.getByText("Cat3")).toBeInTheDocument();
    expect(screen.getByText("Cat4")).toBeInTheDocument();
    expect(screen.getByText("Cat5")).toBeInTheDocument();
  });

  it("safely handles corrupted localStorage in timeline task persistence", async () => {
    const user = userEvent.setup();
    // Put corrupt JSON in localStorage
    localStorage.setItem("eventpulse-tasks-Dream-Beach-Wedding-500000", "invalid-json{{");

    render(<DashboardView {...defaultProps} />);
    const timelineTab = screen.getByRole("tab", { name: /timeline/i });
    await user.click(timelineTab);

    const checkboxes = screen.getAllByRole("checkbox");
    expect(checkboxes[0]).not.toBeChecked();

    // Trigger toggle when setItem throws (quota exceeded)
    const originalSetItem = localStorage.setItem;
    localStorage.setItem = vi.fn().mockImplementation(() => {
      throw new Error("QuotaExceededError");
    });

    await user.click(checkboxes[0]!);
    expect(checkboxes[0]).toBeChecked();

    localStorage.setItem = originalSetItem;
  });
});
