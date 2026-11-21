// VibeCart — agentic payment executor
// A headless-browser "payments agent": when the user tells the shopping agent to pay,
// this drives the Razorpay test checkout end-to-end (link page → payment method → pay → success).
// The order-poller on the backend then confirms the order automatically.

import puppeteer from "puppeteer";

const TEST_CARD = { number: "4111111111111111", expiry: "12/30", cvv: "123", name: "Rizabul" };

export async function autoPayLink(shortUrl, linkId) {
  const browser = await puppeteer.launch({
    headless: "new",
    args: ["--no-sandbox", "--disable-setuid-sandbox"]
  });
  const log = [];
  const DEBUG = process.env.AUTOPLAY_DEBUG === "1";
  let shotN = 0;
  const shot = async (page, label) => {
    if (DEBUG) {
      try { await page.screenshot({ path: `/tmp/ap-${++shotN}-${label.replace(/\W+/g, "_")}.png` }); log.push(`shot:/tmp/ap-${shotN}-${label.replace(/\W+/g, "_")}.png`); } catch {}
    }
  };
  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 420, height: 860 });
    log.push("opening payment link");
    await page.goto(shortUrl, { waitUntil: "networkidle2", timeout: 60000 });
    await sleep(2000);

    // 1. Link page → "Proceed to Pay"
    await clickByText(page, ["proceed to pay"], "Proceed to Pay button");
    await sleep(3000); await shot(page, "after-proceed");

    // 2. Contact details → mobile number → Continue
    try {
      await typeInto(page, 'input[type="tel"], input[placeholder*="Mobile"]', "9891022665");
      await clickByText(page, ["continue"], "Continue button");
      await sleep(3000);
    await shot(page, "after-continue");
    } catch { /* some flows skip contact step */ }

    // 3. Payment method: Netbanking → dummy bank (instant simulated success in test mode)
    log.push("selecting netbanking");
    await tryClick(page, [
      "//*[self::div or self::span or self::label or self::p][normalize-space(text())='Netbanking']",
      "//*[contains(@id,'netbanking')]",
      "//*[self::div or self::span][contains(.,'Netbanking')][not(contains(.,'Login'))]"
    ]);
    await sleep(2000);
    await shot(page, "methods-open");

    // Pick the first bank in the list (test-mode banks are dummy)
    await tryClick(page, [
      "//*[contains(@class,'bank')][1]",
      "//*[self::div or self::span][contains(.,'Bank')][1]"
    ]);
    await sleep(1500);
    await clickByText(page, ["pay ₹", "pay now", "pay"], "Pay button");
    await shot(page, "after-pay-click");
    await sleep(4000);

    // Bank page → click SUCCESS (test-mode netbanking simulation)
    const success = await tryClick(page, [
      "//button[contains(translate(., 'SUCCESS','success'),'success')]",
      "//a[contains(translate(., 'SUCCESS','success'),'success')]",
      "//input[contains(translate(., 'SUCCESS','success'),'success')]"
    ]);
    if (success) { log.push("clicked SUCCESS on bank page"); await sleep(4000); }
    await shot(page, "after-bank");

    // Wait for success (page or our poller detects payment)
    await shot(page, "final");
    const ok = await waitForSuccess(page, 45000);
    log.push(ok ? "payment successful" : "payment result unclear");
    return { ok, log };
  } catch (e) {
    log.push(`error: ${e.message}`);
    return { ok: false, log };
  } finally {
    await browser.close();
  }
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

// Razorpay checkout renders in an iframe — search all frames for a target
async function inAnyFrame(page, fn, ...args) {
  for (const frame of page.frames()) {
    try { if (await frame.evaluate(fn, ...args)) return frame; } catch {}
  }
  return null;
}

// Click the element whose text matches, across all frames
async function clickByText(page, texts, label) {
  for (const t of texts) {
    for (const frame of page.frames()) {
      try {
        const clicked = await frame.evaluate((txt) => {
          const wanted = txt.toLowerCase();
          const els = [...document.querySelectorAll("button, a, [role=button], div, span, p, label")];
          const el = els.reverse().find(e => {
            const s = (e.textContent || "").trim().toLowerCase();
            return s.includes(wanted) && e.offsetParent && e.getBoundingClientRect().height > 0 && e.children.length <= 3;
          });
          if (el) { el.click(); return true; }
          return false;
        }, t);
        if (clicked) return true;
      } catch {}
    }
  }
  throw new Error(`could not find ${label}`);
}

// Type into the first matching selector across all frames (React-safe: native setter + input event)
async function typeInto(page, selectors, text) {
  for (const sel of selectors.split(",")) {
    for (const frame of page.frames()) {
      try {
        const ok = await frame.evaluate(({ s, v }) => {
          const input = document.querySelector(s.trim());
          if (!input) return false;
          input.focus();
          const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value").set;
          setter.call(input, "");
          setter.call(input, v);
          input.dispatchEvent(new Event("input", { bubbles: true }));
          input.dispatchEvent(new Event("change", { bubbles: true }));
          return true;
        }, { s: sel.trim(), v: text });
        if (ok) return true;
      } catch {}
    }
  }
  return false;
}

async function tryClick(page, xpaths) {
  for (const xp of xpaths) {
    for (const frame of page.frames()) {
      try {
        const el = await frame.$x(xp);
        if (el.length) { await el[0].click(); return true; }
      } catch {}
    }
  }
  return false;
}

async function waitForSuccess(page, timeoutMs) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const success = await page.evaluate(() =>
      /paid|successful|payment complete|thank you/i.test(document.body?.innerText || "")
    ).catch(() => false);
    if (success) return true;
    await sleep(1500);
  }
  return false;
}
