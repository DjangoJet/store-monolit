import { test, expect } from "@playwright/test";

// Przykładowy e2e przepływu zakupowego. Zakłada zaseedowane dane (Koszulka Basic).
test("strona główna pokazuje produkty", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Nowości" })).toBeVisible();
  await expect(page.getByText("Koszulka Basic").first()).toBeVisible();
});

test("dodanie do koszyka i przejście do kasy", async ({ page }) => {
  await page.goto("/products");
  await page.getByText("Koszulka Basic").first().click();

  await expect(page.getByRole("button", { name: "Dodaj do koszyka" })).toBeVisible();
  await page.getByRole("button", { name: "Dodaj do koszyka" }).click();

  await page.goto("/cart");
  await expect(page.getByText("Koszulka Basic")).toBeVisible();
  await page.getByRole("link", { name: "Przejdź do kasy" }).click();

  await expect(page).toHaveURL(/\/checkout/);
  await expect(page.getByRole("heading", { name: "Kasa" })).toBeVisible();
});
