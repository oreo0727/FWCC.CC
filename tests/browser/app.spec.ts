import { test, expect } from "@playwright/test";
import { readFileSync } from "node:fs";
const fixture = JSON.parse(readFileSync("tests/fixtures/content.json", "utf8"));
test.beforeEach(async ({ page }) => {
  await page.clock.setFixedTime(new Date("2026-09-08T16:00:00Z"));
  await page.route("**/v1/content", (route) =>
    route.fulfill({ json: fixture }),
  );
});

test("home, all five tabs, and phone layouts render without runtime errors", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  await expect(page.getByText("A PLACE TO BELONG")).toBeVisible();
  await page
    .getByRole("button", { name: "Plan your visit", exact: true })
    .click();
  await expect(page.getByText("See you Sunday.")).toBeVisible();
  for (const tab of ["Messages", "Events", "Connect", "Give", "Home"]) {
    await page.getByRole("tab", { name: tab, exact: true }).click();
    await expect(
      page.getByRole("tab", { name: tab, exact: true }),
    ).toHaveAttribute("aria-selected", "true");
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true);
  }
  await page.screenshot({ path: "artifacts/home-iphone.png" });
  await page.setViewportSize({ width: 360, height: 800 });
  await expect(
    page.getByRole("button", { name: "Plan your visit", exact: true }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({ path: "artifacts/home-samsung.png" });
  expect(errors).toEqual([]);
});

test("search, save, reload, and unsave a real message", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("tab", { name: "Messages", exact: true }).click();
  await page
    .getByRole("textbox", { name: "Search messages" })
    .fill("Shine His Light");
  await expect(
    page.getByText("Shine His Light! (Believe)", { exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", {
      name: "Save Shine His Light! (Believe)",
      exact: true,
    })
    .click();
  await page.reload();
  await page.getByRole("tab", { name: "Messages", exact: true }).click();
  await page.getByRole("button", { name: "Saved (1)", exact: true }).click();
  await expect(
    page.getByText("Shine His Light! (Believe)", { exact: true }),
  ).toBeVisible();
  await page.screenshot({ path: "artifacts/messages-iphone.png" });
  await page
    .getByRole("button", {
      name: "Unsave Shine His Light! (Believe)",
      exact: true,
    })
    .click();
  await expect(page.getByText("Your saved messages live here")).toBeVisible();
  await page.getByRole("button", { name: "All messages", exact: true }).click();
  await page
    .getByRole("textbox", { name: "Search messages" })
    .fill("unmatched-search-123");
  await expect(page.getByText("No messages found")).toBeVisible();
});

test("event details export a calendar file with correct UTC time", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("tab", { name: "Events", exact: true }).click();
  await page.getByRole("button", { name: "Featured", exact: true }).click();
  await page
    .getByRole("button", { name: /Welcome Lunch, September 13/ })
    .click();
  await expect(page.getByText("12:45 PM Eastern")).toBeVisible();
  const download = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "Add to calendar", exact: true })
    .click();
  const file = await download;
  const stream = await file.createReadStream();
  const chunks = [];
  for await (const chunk of stream!) chunks.push(chunk);
  const ics = Buffer.concat(chunks).toString();
  expect(ics).toContain("DTSTART:20260913T164500Z");
  expect(ics).toContain("DTEND:20260913T180000Z");
  await page.screenshot({ path: "artifacts/event-iphone.png" });
  await page
    .getByRole("button", { name: "Remind me 1 hour before", exact: true })
    .click();
  await expect(
    page.getByText(/Event reminders are available in the iPhone/),
  ).toBeVisible();
  await page.getByRole("button", { name: "Got it", exact: true }).click();
  await page
    .getByRole("button", { name: "Close details", exact: true })
    .click();
  await expect(
    page.getByRole("tab", { name: "Events", exact: true }),
  ).toBeVisible();
});

test("giving opens the real hosted provider without submitting a payment", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("tab", { name: "Give", exact: true }).click();
  await page
    .context()
    .route("https://givingflow.rebelgive.com/**", (route) =>
      route.fulfill({ body: "Giving destination verified" }),
    );
  const popup = page.waitForEvent("popup");
  await page
    .getByRole("button", { name: "Continue to giving", exact: true })
    .click();
  const provider = await popup;
  await provider.waitForLoadState();
  expect(new URL(provider.url()).hostname).toBe("givingflow.rebelgive.com");
  await provider.close();
  await page.screenshot({ path: "artifacts/giving-iphone.png" });
});

test("failed live updates preserve saved content and report offline state", async ({
  page,
}) => {
  await page.route("**/v1/content", (route) => route.abort());
  await page.goto("/");
  await page.getByRole("button", { name: "App settings", exact: true }).click();
  await expect(
    page.getByText(
      /Refresh unavailable · showing saved content\s+Last updated/,
    ),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Refresh church content", exact: true })
    .click();
  await expect(
    page.getByText(
      /Refresh unavailable · showing saved content\s+Last updated/,
    ),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Close details", exact: true })
    .click();
  await page.getByRole("tab", { name: "Messages", exact: true }).click();
  await page
    .getByRole("textbox", { name: "Search messages" })
    .fill("Shine His Light");
  await expect(
    page.getByText("Shine His Light! (Believe)", { exact: true }),
  ).toBeVisible();
});

test("message playback loads the correct provider only after play is pressed", async ({
  page,
}) => {
  await page.route("https://www.youtube-nocookie.com/**", (route) =>
    route.fulfill({ body: "Video provider preview" }),
  );
  await page.goto("/");
  await page.getByRole("tab", { name: "Messages", exact: true }).click();
  await page
    .getByRole("button", {
      name: "Watch Shine His Light! (Believe)",
      exact: true,
    })
    .click();
  await expect(page.locator("iframe")).toHaveCount(0);
  await page.getByRole("button", { name: "Play message", exact: true }).click();
  await expect(page.locator("iframe")).toHaveAttribute("src", /AKpB9FAfysA/);
});

test("appearance switches immediately, persists, and follows the system when selected", async ({
  page,
}) => {
  await page.emulateMedia({ colorScheme: "light" });
  await page.goto("/");
  await page.getByRole("button", { name: "App settings", exact: true }).click();
  const dark = page.getByRole("radio", { name: "Dark mode", exact: true });
  await dark.click();
  await expect(dark).toHaveAttribute("aria-checked", "true");
  await expect(
    page.getByText("Make yourself at home.", { exact: true }),
  ).toHaveCSS("color", "rgb(237, 247, 244)");
  await page.reload();
  await page.getByRole("button", { name: "App settings", exact: true }).click();
  await expect(
    page.getByRole("radio", { name: "Dark mode", exact: true }),
  ).toHaveAttribute("aria-checked", "true");
  await page
    .getByRole("button", { name: "Close details", exact: true })
    .click();
  for (const tab of ["Home", "Messages", "Events", "Connect", "Give"]) {
    await page.getByRole("tab", { name: tab, exact: true }).click();
    await page.waitForTimeout(400); // Let modal dismissal and scroll-to-top finish.
    await page.screenshot({ path: `artifacts/dark-${tab.toLowerCase()}.png` });
  }
  await page.getByRole("button", { name: "App settings", exact: true }).click();
  await page.getByRole("radio", { name: "Light mode", exact: true }).click();
  await expect(
    page.getByText("Make yourself at home.", { exact: true }),
  ).toHaveCSS("color", "rgb(24, 32, 33)");
  await page.emulateMedia({ colorScheme: "dark" });
  // A manual choice remains light even when the OS is dark.
  await expect(
    page.getByText("Make yourself at home.", { exact: true }),
  ).toHaveCSS("color", "rgb(24, 32, 33)");
  await page.getByRole("radio", { name: "System mode", exact: true }).click();
  await expect(
    page.getByText("Make yourself at home.", { exact: true }),
  ).toHaveCSS("color", "rgb(237, 247, 244)");
  await page.emulateMedia({ colorScheme: "light" });
  await expect(
    page.getByText("Make yourself at home.", { exact: true }),
  ).toHaveCSS("color", "rgb(24, 32, 33)");
});
