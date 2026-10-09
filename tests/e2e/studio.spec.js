import { test, expect } from "@playwright/test";
import { installSyntheticSources } from "./synthetic-sources.js";

async function prepare(page, audio = false) {
  await page.route("**/", async (route) => {
    const response = await route.fetch();
    const html = (await response.text()).replace(
      "<body>",
      '<body data-editor-storage="local-studio-camera-test-v1">',
    );
    await route.fulfill({ response, body: html });
  });
  await page.addInitScript((enabled) => {
    window.syntheticAudioEnabled = enabled;
  }, audio);
  await page.addInitScript(installSyntheticSources);
  await page.goto("/");
  if (!audio) await page.locator("#want-mic").uncheck();
  await page
    .getByRole("button", { name: "Elegir pantalla, ventana o pestaña" })
    .click();
  await expect(page.locator("#status")).toContainText("Pantalla lista");
  await page
    .getByRole("button", { name: "Preparar cámara y micrófono" })
    .click();
  await expect(
    page.getByRole("button", { name: "Grabar", exact: true }),
  ).toBeEnabled();
  await expect(page.locator("#camera-edit")).toBeVisible();
}

test("screen and camera produce a local playable take without audio", async ({
  page,
}) => {
  await prepare(page);
  await page.getByRole("button", { name: "Grabar", exact: true }).click();
  await expect(page.locator("#status")).toContainText("MB");
  await page.getByRole("button", { name: "Detener y guardar" }).click();
  await expect(page.locator("#result")).toBeVisible();
  await expect
    .poll(() => page.locator("#playback").evaluate((v) => v.videoWidth))
    .toBe(1920);
  await expect(page.locator("#download")).toHaveAttribute(
    "download",
    /\.webm$/,
  );
  await expect(page.locator("#camera-edit")).toBeHidden();
  await expect(page.locator("#device-state")).toContainText("apagados");
});

test("screen audio and microphone have a signal and produce a playable mixed take", async ({
  page,
}) => {
  test.skip(
    process.platform === "darwin",
    "Isolated macOS test browsers stall the Web Audio clock; real capture requires a manual hardware check. Linux CI runs this test.",
  );
  await prepare(page, true);
  await page.getByRole("button", { name: "Grabar", exact: true }).click();
  await expect
    .poll(() => page.locator("#mic-meter").evaluate((m) => m.value))
    .toBeGreaterThan(0);
  await expect
    .poll(() => page.locator("#source-meter").evaluate((m) => m.value))
    .toBeGreaterThan(0);
  await expect(page.locator("#status")).toContainText("MB");
  await page.getByRole("button", { name: "Detener y guardar" }).click();
  await expect
    .poll(() => page.locator("#playback").evaluate((v) => v.videoWidth))
    .toBe(1920);
});

test("drag, resize, style and keyboard editing persist after reload", async ({
  page,
}) => {
  await prepare(page);
  const before = await page.locator("#camera-edit").boundingBox();
  await page.mouse.move(
    before.x + before.width / 2,
    before.y + before.height / 2,
  );
  await page.mouse.down();
  await page.mouse.move(
    before.x + before.width / 2 - 100,
    before.y + before.height / 2 - 100,
  );
  await page.mouse.up();
  const moved = await page.locator("#camera-edit").boundingBox();
  expect(moved.x).toBeCloseTo(before.x - 100, 0);
  expect(moved.y).toBeCloseTo(before.y - 100, 0);
  const handle = await page.locator("#camera-resize").boundingBox();
  await page.mouse.move(
    handle.x + handle.width / 2,
    handle.y + handle.height / 2,
  );
  await page.mouse.down();
  await page.mouse.move(
    handle.x + handle.width / 2 + 40,
    handle.y + handle.height / 2 + 40,
  );
  await page.mouse.up();
  const resized = await page.locator("#camera-edit").boundingBox();
  expect(resized.width).toBeGreaterThan(moved.width + 35);
  await page.locator("#shape").selectOption("rounded");
  await page.locator("#border-color").fill("#50c9a0");
  await page.locator("#shadow-on").check();
  await page.locator("#camera-move").press("ArrowLeft");
  await expect(page.locator("#camera-edit")).toHaveAttribute(
    "data-shape",
    "rounded",
  );
  await page.getByRole("button", { name: "Apagar fuentes" }).click();
  await page.reload();
  await expect(page.locator("#border-color")).toHaveValue("#50c9a0");
  await expect(page.locator("#shadow-on")).toBeChecked();
  await expect(page.locator("#shape")).toHaveValue("rounded");
  await page
    .getByRole("button", { name: "Restablecer cámara y estilo" })
    .click();
  await expect(page.locator("#border-color")).toHaveValue("#f7f3ec");
  await expect(page.locator("#shadow-on")).not.toBeChecked();
});

test("unsupported capture stays disabled instead of offering a broken start", async ({
  page,
}) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator.mediaDevices, "getDisplayMedia", {
      value: undefined,
    });
  });
  await page.goto("/");
  await expect(page.locator("#screen")).toBeDisabled();
  await expect(page.locator("#record")).toBeDisabled();
  await expect(page.locator("#status")).toContainText("Chrome de escritorio");
});

test("mobile layout stays dark and fits the viewport", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  const dimensions = await page.evaluate(() => ({
    width: innerWidth,
    scrollWidth: document.documentElement.scrollWidth,
    colorScheme: getComputedStyle(document.documentElement).colorScheme,
  }));
  expect(dimensions.scrollWidth).toBe(dimensions.width);
  expect(dimensions.colorScheme).toBe("dark");
});
