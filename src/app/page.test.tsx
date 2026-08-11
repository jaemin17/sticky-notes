import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect, test } from "vitest";
import Home from "./page";
import { formatDateStamp } from "./formatDateStamp";

test("shows today's date in the top-left header using italic text", () => {
  render(<Home />);

  const today = formatDateStamp(new Date());
  const date = screen.getByText((_, element) => element?.tagName === "EM" && element.textContent === today.label);

  expect(date.tagName).toBe("EM");
  expect(date.closest("time")).toHaveAttribute("dateTime", today.dateTime);
});

test("shows local-only storage help next to the date", async () => {
  const user = userEvent.setup();
  render(<Home />);

  const helpButton = screen.getByRole("button", { name: "Storage help" });
  expect(helpButton).not.toHaveTextContent("i");
  expect(helpButton.querySelector("svg")).toBeInTheDocument();
  expect(screen.queryByText("1. Saved only in this browser.")).not.toBeInTheDocument();

  await user.hover(helpButton);

  expect(screen.getByText("1. Saved only in this browser.")).toBeInTheDocument();
  expect(screen.getByText("Not uploaded or synced.")).toBeInTheDocument();
  expect(screen.getByText("2. Best for temporary notes.")).toBeInTheDocument();
  expect(screen.getByText("Do not use for important records.")).toBeInTheDocument();
  expect(screen.getByText("3. May disappear if you clear data or switch browsers/devices.")).toBeInTheDocument();
  expect(screen.queryByText("If browser data is cleared, or if you switch browsers/devices.")).not.toBeInTheDocument();
});
