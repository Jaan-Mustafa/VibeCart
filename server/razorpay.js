// Razorpay test-mode payments (Payment Links API)
// Falls back gracefully: if no keys configured, `available` is false and the
// checkout flow continues in mock mode.

const KEY_ID = process.env.RAZORPAY_KEY_ID || "";
const KEY_SECRET = process.env.RAZORPAY_KEY_SECRET || "";
const AUTH = Buffer.from(`${KEY_ID}:${KEY_SECRET}`).toString("base64");

export const paymentsAvailable = () => Boolean(KEY_ID && KEY_SECRET);

async function rz(path, method = "GET", body) {
  const r = await fetch(`https://api.razorpay.com/v1/${path}`, {
    method,
    headers: { "Authorization": `Basic ${AUTH}`, "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined
  });
  const data = await r.json();
  if (!r.ok) throw new Error(data?.error?.description || `razorpay ${r.status}`);
  return data;
}

export async function createPaymentLink({ order, customerName = "Rizabul" }) {
  const link = await rz("payment_links", "POST", {
    amount: order.totals.total * 100, // paise
    currency: "INR",
    accept_partial: false,
    description: `VibeCart order ${order.id}`,
    customer: { name: customerName, email: "arjun@vibecart.demo", contact: "+919000000000" },
    notify: { sms: false, email: false },
    reminder_enable: false,
    notes: { order_id: order.id }
  });
  return { linkId: link.id, shortUrl: link.short_url, status: link.status };
}

export async function getPaymentLink(linkId) {
  return rz(`payment_links/${linkId}`);
}
