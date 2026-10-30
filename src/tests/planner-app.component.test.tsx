// @vitest-environment jsdom
/**
 * @file src/tests/planner-app.component.test.tsx
 * @description Component tests for PlannerApp orchestrator.
 */

import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import PlannerApp from "../components/PlannerApp";
import { MOCK_PLAN } from "./fixtures";
import "./setup";

describe("PlannerApp Component", () => {
  it("renders the initial hero heading and wizard", () => {
    render(<PlannerApp />);
    expect(screen.getByText(/Plan Your Perfect Event/i)).toBeInTheDocument();
    expect(screen.getByRole("region", { name: /Event planning wizard/i })).toBeInTheDocument();
  });

  it("transitions from wizard to dashboard upon plan generation and returns to wizard on Start Over", async () => {
    const user = userEvent.setup();
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      headers: new Headers(),
      json: async () => MOCK_PLAN,
    });

    render(<PlannerApp />);

    // Initial state: Wizard is displayed
    expect(screen.getByText(/Plan Your Perfect Event/i)).toBeInTheDocument();

    // Step 0: Event Type
    await user.click(screen.getByLabelText(/wedding/i));
    await user.click(screen.getByRole("button", { name: /^next$/i }));

    // Step 1: Date & Location
    await user.type(screen.getByLabelText(/event date/i), "2027-08-20");
    await user.type(screen.getByLabelText(/event location/i), "Goa Beach Resort");
    await user.click(screen.getByRole("button", { name: /^next$/i }));

    // Step 2: Budget & Guests
    await user.type(screen.getByLabelText(/total budget/i), "750000");
    await user.type(screen.getByLabelText(/guest count/i), "120");
    await user.click(screen.getByRole("button", { name: /^next$/i }));

    // Step 3: Theme Preferences
    await user.type(screen.getByLabelText(/theme preferences/i), "Sunset coastal boho");
    await user.click(screen.getByRole("button", { name: /generate plan/i }));

    // Dashboard should now be visible
    const dashboardHeading = await screen.findByRole("heading", {
      level: 1,
      name: MOCK_PLAN.eventName,
    });
    expect(dashboardHeading).toBeInTheDocument();

    // Click "Start Over" button
    const startOverButton = screen.getByRole("button", { name: /start over/i });
    await user.click(startOverButton);

    // Wizard and hero should be back
    expect(screen.getByText(/Plan Your Perfect Event/i)).toBeInTheDocument();
    expect(screen.getByRole("region", { name: /Event planning wizard/i })).toBeInTheDocument();
  });
});
