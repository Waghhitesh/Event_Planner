// @vitest-environment jsdom
/**
 * @file src/tests/ui-primitives.test.tsx
 * @description Unit tests for shared Button, Card, and Badge UI primitives.
 */

import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { Button, LinkButton } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { Badge } from "../components/ui/Badge";
import "./setup";

describe("UI Primitives", () => {
  describe("Button", () => {
    it("renders with primary variant and md size by default", () => {
      render(<Button>Click me</Button>);
      const btn = screen.getByRole("button", { name: /click me/i });
      expect(btn).toBeInTheDocument();
      expect(btn).toHaveAttribute("type", "button");
      expect(btn.className).toContain("bg-gradient-to-r");
    });

    it("allows overriding button type", () => {
      render(<Button type="submit">Submit</Button>);
      const btn = screen.getByRole("button", { name: /submit/i });
      expect(btn).toHaveAttribute("type", "submit");
    });

    it("renders secondary and ghost variants", () => {
      const { rerender } = render(<Button variant="secondary">Cancel</Button>);
      let btn = screen.getByRole("button", { name: /cancel/i });
      expect(btn.className).toContain("border-gray-300");

      rerender(<Button variant="ghost">Dismiss</Button>);
      btn = screen.getByRole("button", { name: /dismiss/i });
      expect(btn.className).toContain("bg-transparent");
    });
  });

  describe("LinkButton", () => {
    it("renders an anchor with button styling and secondary variant by default", () => {
      render(<LinkButton href="https://example.com">Visit site</LinkButton>);
      const link = screen.getByRole("link", { name: /visit site/i });
      expect(link).toBeInTheDocument();
      expect(link).toHaveAttribute("href", "https://example.com");
      expect(link.className).toContain("border-gray-300");
    });
  });

  describe("Card", () => {
    it("renders card container with custom padding and children", () => {
      render(
        <Card padding="lg" data-testid="test-card">
          <p>Card content</p>
        </Card>
      );
      const card = screen.getByTestId("test-card");
      expect(card).toBeInTheDocument();
      expect(card.className).toContain("p-6");
      expect(screen.getByText("Card content")).toBeInTheDocument();
    });
  });

  describe("Badge", () => {
    it("renders badge with default variant", () => {
      render(<Badge>Active</Badge>);
      const badge = screen.getByText("Active");
      expect(badge).toBeInTheDocument();
      expect(badge.className).toContain("rounded-full");
    });

    it("renders badge with color variants", () => {
      render(<Badge variant="green">Success</Badge>);
      const badge = screen.getByText("Success");
      expect(badge.className).toContain("bg-green-100");
    });
  });
});
