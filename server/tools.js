// VibeCart — LLM tool definitions + executor
// These are exposed to the LLM (function calling). `executeTool` routes the call
// to the mock store and broadcasts UI events so the cart updates on screen live.

import { store } from "./store.js";
import { paymentsAvailable, createPaymentLink, getPaymentLink } from "./razorpay.js";

export const TOOLS = [
  {
    type: "function",
    function: {
      name: "get_user_context",
      description: "Get customer preferences, purchase history, and active discount offers for personalization. Call this at conversation start.",
      parameters: { type: "object", properties: {}, required: [] }
    }
  },
  {
    type: "function",
    function: {
      name: "search_catalog",
      description: "Search a large multi-department catalog (Grocery & Gourmet, Electronics, Home & Kitchen, Beauty, Fashion, Sports, Books, Toys) by free-text query, category, department, price range, or diet tags (e.g. 'keto', 'fitness', 'gifting'). Results are relevance-ranked.",
      parameters: {
        type: "object",
        properties: {
          query: { type: "string", description: "Free-text search, e.g. 'wireless earbuds', 'keto dinner', 'running shoes'" },
          category: { type: "string", description: "One of: grocery, electronics, home, beauty, fashion, sports, books, toys" },
          dept: { type: "string", description: "Department name like 'Electronics' or 'Beauty & Personal Care'" },
          minPrice: { type: "number", description: "Min price per item in rupees" },
          maxPrice: { type: "number", description: "Max price per item in rupees" },
          tags: { type: "array", items: { type: "string" }, description: "Tags like keto, high-protein, vegan, premium, budget, trending, gifting" },
          limit: { type: "number", description: "Max results to return, default 8" }
        },
        required: []
      }
    }
  },
  {
    type: "function",
    function: {
      name: "check_inventory",
      description: "Check stock availability for one or more product IDs before recommending or adding to cart.",
      parameters: {
        type: "object",
        properties: { productIds: { type: "array", items: { type: "string" } } },
        required: ["productIds"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "compare_products",
      description: "Compare price, carbs, protein and rating of multiple products to help the user choose.",
      parameters: {
        type: "object",
        properties: { productIds: { type: "array", items: { type: "string" } } },
        required: ["productIds"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "add_to_cart",
      description: "Add a product to the shopping cart. Always check inventory first if unsure.",
      parameters: {
        type: "object",
        properties: {
          productId: { type: "string" },
          qty: { type: "number", description: "Quantity, default 1" },
          cartId: { type: "string", description: "Existing cart ID; omit to create a new cart" }
        },
        required: ["productId"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "remove_from_cart",
      description: "Remove a product from the cart.",
      parameters: {
        type: "object",
        properties: { cartId: { type: "string" }, productId: { type: "string" } },
        required: ["cartId", "productId"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "apply_discount",
      description: "Apply a discount coupon code to the cart.",
      parameters: {
        type: "object",
        properties: { cartId: { type: "string" }, code: { type: "string" } },
        required: ["cartId", "code"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "initiate_checkout",
      description: "Complete the purchase and place the order. Confirm with the user before calling.",
      parameters: {
        type: "object",
        properties: {
          cartId: { type: "string" },
          paymentMethod: { type: "string", description: "saved_card | upi | cod" }
        },
        required: ["cartId"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "get_order_status",
      description: "Get the status and ETA of a placed order.",
      parameters: {
        type: "object",
        properties: { orderId: { type: "string" } },
        required: ["orderId"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "initiate_return",
      description: "Start a return/refund for a placed order.",
      parameters: {
        type: "object",
        properties: { orderId: { type: "string" }, reason: { type: "string" } },
        required: ["orderId"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "update_preferences",
      description: "Save new information about the user that you learned during the conversation — dietary changes, budget changes, allergies, likes/dislikes. Call this when the user says things like 'I'm vegetarian now', 'my budget is 2000', 'I'm allergic to nuts'. Preferences are stored permanently.",
      parameters: {
        type: "object",
        properties: {
          diet: { type: "string", description: "e.g. keto, vegetarian, vegan, none" },
          budget: { type: "number", description: "New budget in rupees" },
          allergies: { type: "string", description: "Comma-separated allergies" },
          likes: { type: "string", description: "Things the user said they like" },
          dislikes: { type: "string", description: "Things the user said they dislike" },
          note: { type: "string", description: "Any other fact worth remembering" }
        },
        required: []
      }
    }
  },
  {
    type: "function",
    function: {
      name: "end_session",
      description: "End the voice shopping session gracefully. Call this when the user says goodbye/thanks and the journey is complete, OR after completing the review step. Say a warm goodbye to the user in the same turn.",
      parameters: { type: "object", properties: {}, required: [] }
    }
  },
  {
    type: "function",
    function: {
      name: "submit_review",
      description: "Submit a star rating (1-5) and optional comment for a product after delivery. Ask the user for the rating naturally, then call this.",
      parameters: {
        type: "object",
        properties: {
          productId: { type: "string", description: "Product being reviewed" },
          rating: { type: "number", description: "1 to 5 stars" },
          comment: { type: "string", description: "Short review comment" }
        },
        required: ["rating"]
      }
    }
  }
];

// UI event broadcaster — SSE clients (browser cart panel) subscribe via /api-events
const listeners = new Set();

export function broadcast(event) {
  for (const fn of listeners) fn(event);
}

export function onUiEvent(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

// Razorpay-backed checkout: when payments are configured, checkout creates a
// payment link (shown in the UI); the order confirms when the link is paid.
// COD and razorpay-unavailable mode confirm immediately (mock).
async function handleCheckout(name, args) {
  const result = store.initiateCheckout({
    cartId: args.cartId,
    paymentMethod: args.paymentMethod,
    paymentPending: paymentsAvailable() && args.paymentMethod !== "cod"
  });
  if (result.error) return result;

  if (result.order.status === "pending_payment") {
    try {
      const link = await createPaymentLink({ order: result.order });
      result.paymentLink = link.shortUrl;
      result.linkId = link.linkId;
      pollPaymentLink(link.linkId, result.order.id);
    } catch (e) {
      // Razorpay hiccup → don't block the demo, confirm in mock mode
      const paid = store.markOrderPaid(result.order.id);
      result.order = paid.order;
      result.message = paid.message + " (payment gateway unavailable — mock confirmed)";
    }
  }

  broadcast({ type: "order_placed", tool: name, result });
  return result;
}

async function pollPaymentLink(linkId, orderId, attempt = 0) {
  if (attempt > 60) return; // ~3 min, then give up (user can still check status)
  try {
    const link = await getPaymentLink(linkId);
    if (link.status === "paid") {
      const paid = store.markOrderPaid(orderId);
      broadcast({ type: "order_paid", result: paid });
      return;
    }
  } catch { /* keep polling */ }
  setTimeout(() => pollPaymentLink(linkId, orderId, attempt + 1), 3000);
}

export function executeTool(name, args) {
  let result;
  try {
    switch (name) {
      case "get_user_context":      result = store.getUserContext(); break;
      case "update_preferences":    result = store.updatePreferences(args); break;
      case "search_catalog":        result = store.searchCatalog(args); break;
      case "check_inventory":       result = store.checkInventory(args.productIds || []); break;
      case "compare_products":      result = store.compareProducts(args.productIds || []); break;
      case "add_to_cart":           result = store.addToCart(args); break;
      case "remove_from_cart":      result = store.removeFromCart(args); break;
      case "apply_discount":        result = store.applyDiscount(args); break;
      case "initiate_checkout":     break; // async — handled below
      case "get_order_status":      result = store.getOrderStatus(args.orderId); break;
      case "initiate_return":       result = store.initiateReturn(args); break;
      case "submit_review":         result = store.submitReview(args); break;
      default: result = { error: `unknown_tool:${name}` };
    }
  } catch (e) {
    result = { error: e.message };
  }

  if (name === "initiate_checkout") return handleCheckout(name, args);

  // Mirror agent actions into the UI live (cart mutations, discounts, products)
  if (["add_to_cart", "remove_from_cart", "apply_discount"].includes(name)) {
    broadcast({ type: "cart_update", tool: name, result });
  } else if (name === "search_catalog" || name === "compare_products") {
    broadcast({ type: "products_shown", tool: name, result });
  } else if (name === "get_order_status") {
    broadcast({ type: "order_status", tool: name, result });
  } else if (name === "submit_review") {
    broadcast({ type: "review_submitted", tool: name, result });
  } else if (name === "update_preferences") {
    broadcast({ type: "prefs_updated", tool: name, result });
  }

  return result;
}
