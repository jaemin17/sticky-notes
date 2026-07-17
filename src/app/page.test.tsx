import { render, screen } from "@testing-library/react";
import { expect, test } from "vitest";
import Home from "./page";
import { formatDateStamp } from "./formatDateStamp";

test("shows today's date in the top-left header using italic text", () => {
  render(<Home />);

  const today = formatDateStamp(new Date());
  const date = screen.getByText(today.label);

  expect(date.tagName).toBe("EM");
  expect(date.closest("time")).toHaveAttribute("dateTime", today.dateTime);
});
