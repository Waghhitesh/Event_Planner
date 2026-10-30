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

    const exportBtn = screen.getByRole("button", { name: /export full event plan as csv/i });
    await user.click(exportBtn);

    const printBtn = screen.getByRole("button", { name: /print or save/i });
    await user.click(printBtn);
    expect(window.print).toHaveBeenCalled();
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
});
