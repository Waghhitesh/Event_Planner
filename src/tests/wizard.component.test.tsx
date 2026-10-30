// @vitest-environment jsdom
/**
 * @file src/tests/wizard.component.test.tsx
 * @description Component integration and accessibility tests for EventWizard.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { axe } from "vitest-axe";
import EventWizard from "../components/EventWizard";
import { MOCK_PLAN } from "./fixtures";
import "./setup";

describe("EventWizard Component", () => {
  const mockOnPlanGenerated = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("validates step 0 and focuses on the first invalid field when advancing without selection", async () => {
    const user = userEvent.setup();
    render(<EventWizard onPlanGenerated={mockOnPlanGenerated} />);

    // Click "Next" without selecting an event type
    const nextButton = screen.getByRole("button", { name: /^next$/i });
    await user.click(nextButton);

    // Validation error should appear
    expect(screen.getByText(/event type must be/i)).toBeInTheDocument();

    // The first radio input should have received focus
    const weddingRadio = screen.getByLabelText(/wedding/i);
    expect(document.activeElement).toBe(weddingRadio);
  });

  it("advances through all 4 steps and submits the expected intake payload", async () => {
    const user = userEvent.setup();

    // Mock fetch for /api/plan
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => MOCK_PLAN,
    });
    global.fetch = mockFetch;

    render(<EventWizard onPlanGenerated={mockOnPlanGenerated} />);

    // Step 0: Select event type
    const weddingRadio = screen.getByLabelText(/wedding/i);
    await user.click(weddingRadio);
    await user.click(screen.getByRole("button", { name: /^next$/i }));

    // Step 1: Date & Location
    const dateInput = screen.getByLabelText(/event date/i);
    const locationInput = screen.getByLabelText(/event location/i);
    await user.type(dateInput, "2027-08-20");
    await user.type(locationInput, "Goa Beach Resort");
    await user.click(screen.getByRole("button", { name: /^next$/i }));

    // Step 2: Currency, Budget & Guests
    const budgetInput = screen.getByLabelText(/total budget/i);
    const guestsInput = screen.getByLabelText(/guest count/i);
    await user.type(budgetInput, "750000");
    await user.type(guestsInput, "120");
    await user.click(screen.getByRole("button", { name: /^next$/i }));

    // Step 3: Theme Preferences & Special Requirements
    const themeInput = screen.getByLabelText(/theme preferences/i);
    await user.type(themeInput, "Sunset coastal boho with live acoustic music");
    const submitButton = screen.getByRole("button", { name: /generate plan/i });
    await user.click(submitButton);

    // Verify fetch call payload
    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    const [url, requestInit] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("/api/plan");
    const payload = JSON.parse(requestInit.body as string);

    expect(payload).toEqual({
      eventType: "wedding",
      eventDate: "2027-08-20",
      location: "Goa Beach Resort",
      currency: "INR",
      totalBudget: 750000,
      guestCount: 120,
      themePreferences: "Sunset coastal boho with live acoustic music",
      specialRequirements: "",
    });

    expect(mockOnPlanGenerated).toHaveBeenCalledWith(MOCK_PLAN, expect.objectContaining({
      eventType: "wedding",
      totalBudget: 750000,
    }));
  });

  it("displays friendly rate limit message on 429 response", async () => {
    const user = userEvent.setup();
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 429,
      headers: new Headers({ "Retry-After": "60" }),
      json: async () => ({ error: "Rate limit exceeded" }),
    });

    render(<EventWizard onPlanGenerated={mockOnPlanGenerated} />);
    await user.click(screen.getByLabelText(/wedding/i));
    await user.click(screen.getByRole("button", { name: /^next$/i }));
    await user.type(screen.getByLabelText(/event date/i), "2027-08-20");
    await user.type(screen.getByLabelText(/event location/i), "Goa Beach Resort");
    await user.click(screen.getByRole("button", { name: /^next$/i }));
    await user.type(screen.getByLabelText(/total budget/i), "750000");
    await user.type(screen.getByLabelText(/guest count/i), "120");
    await user.click(screen.getByRole("button", { name: /^next$/i }));
    await user.type(screen.getByLabelText(/theme preferences/i), "Sunset coastal boho");
    await user.click(screen.getByRole("button", { name: /generate plan/i }));

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent(/Too many requests, please wait 60 seconds/i);
  });

  it("displays timeout message on 504 response", async () => {
    const user = userEvent.setup();
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 504,
      headers: new Headers(),
      json: async () => ({ error: "Gateway timeout" }),
    });

    render(<EventWizard onPlanGenerated={mockOnPlanGenerated} />);
    await user.click(screen.getByLabelText(/wedding/i));
    await user.click(screen.getByRole("button", { name: /^next$/i }));
    await user.type(screen.getByLabelText(/event date/i), "2027-08-20");
    await user.type(screen.getByLabelText(/event location/i), "Goa Beach Resort");
    await user.click(screen.getByRole("button", { name: /^next$/i }));
    await user.type(screen.getByLabelText(/total budget/i), "750000");
    await user.type(screen.getByLabelText(/guest count/i), "120");
    await user.click(screen.getByRole("button", { name: /^next$/i }));
    await user.type(screen.getByLabelText(/theme preferences/i), "Sunset coastal boho");
    await user.click(screen.getByRole("button", { name: /generate plan/i }));

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent(/The AI took too long, please try again/i);
  });

  it("displays generic friendly message on non-JSON response", async () => {
    const user = userEvent.setup();
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 502,
      headers: new Headers(),
      json: async () => {
        throw new Error("Invalid JSON");
      },
    });

    render(<EventWizard onPlanGenerated={mockOnPlanGenerated} />);
    await user.click(screen.getByLabelText(/wedding/i));
    await user.click(screen.getByRole("button", { name: /^next$/i }));
    await user.type(screen.getByLabelText(/event date/i), "2027-08-20");
    await user.type(screen.getByLabelText(/event location/i), "Goa Beach Resort");
    await user.click(screen.getByRole("button", { name: /^next$/i }));
    await user.type(screen.getByLabelText(/total budget/i), "750000");
    await user.type(screen.getByLabelText(/guest count/i), "120");
    await user.click(screen.getByRole("button", { name: /^next$/i }));
    await user.type(screen.getByLabelText(/theme preferences/i), "Sunset coastal boho");
    await user.click(screen.getByRole("button", { name: /generate plan/i }));

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent(/Failed to generate plan/i);
  });

  it("displays friendly error when server response fails schema validation", async () => {
    const user = userEvent.setup();
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      headers: new Headers(),
      json: async () => ({
        // Incomplete / corrupt response missing required fields
        eventName: "Only Name",
      }),
    });

    render(<EventWizard onPlanGenerated={mockOnPlanGenerated} />);
    await user.click(screen.getByLabelText(/wedding/i));
    await user.click(screen.getByRole("button", { name: /^next$/i }));
    await user.type(screen.getByLabelText(/event date/i), "2027-08-20");
    await user.type(screen.getByLabelText(/event location/i), "Goa Beach Resort");
    await user.click(screen.getByRole("button", { name: /^next$/i }));
    await user.type(screen.getByLabelText(/total budget/i), "750000");
    await user.type(screen.getByLabelText(/guest count/i), "120");
    await user.click(screen.getByRole("button", { name: /^next$/i }));
    await user.type(screen.getByLabelText(/theme preferences/i), "Sunset coastal boho");
    await user.click(screen.getByRole("button", { name: /generate plan/i }));

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent(/Received an unexpected plan format/i);
    expect(mockOnPlanGenerated).not.toHaveBeenCalled();
  });

  it("has zero accessibility violations on initial render according to axe", async () => {
    const { container } = render(<EventWizard onPlanGenerated={mockOnPlanGenerated} />);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
