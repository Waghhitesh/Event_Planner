// @vitest-environment jsdom
/**
 * @file src/tests/planner-app.component.test.tsx
 * @description Component tests for PlannerApp orchestrator.
 */

import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import PlannerApp from "../components/PlannerApp";
import "./setup";

describe("PlannerApp Component", () => {
  it("renders the initial hero heading and wizard", () => {
    render(<PlannerApp />);
    expect(screen.getByText(/Plan Your Perfect Event/i)).toBeInTheDocument();
    expect(screen.getByRole("region", { name: /Event planning wizard/i })).toBeInTheDocument();
  });
});
