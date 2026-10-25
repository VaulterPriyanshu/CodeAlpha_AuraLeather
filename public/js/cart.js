(() => {
  const store = window.AuraStore;
  if (!store) return;
  const {
    $,
    request,
    escapeHtml: e,
    money,
    toast,
    getGuestBag,
    saveGuestBag,
    getUser,
    refreshUser,
  } = store;

  function computeTotals(subtotal) {
    const shipping = subtotal >= 250 ? 0 : 12;
    const tax = Math.round(subtotal * 0.08 * 100) / 100;
    return {
      subtotal,
      shipping,
      tax,
      total: Math.round((subtotal + shipping + tax) * 100) / 100,
    };
  }

  function guestItems() {
    return getGuestBag().map((item) => ({
      id: item.key,
      productId: item.product.id,
      quantity: item.quantity,
      size: item.size || "",
      color: item.color || "",
      product: item.product,
      lineTotal: Number((item.quantity * item.product.price).toFixed(2)),
    }));
  }

  async function currentBag() {
    if (await refreshUser()) {
      await store.syncGuestBag();
      const bag = await request("/api/cart");
      const pending = guestItems().map((item) => ({
        ...item,
        localPending: true,
      }));
      const pendingSubtotal = pending.reduce(
        (sum, item) => sum + item.lineTotal,
        0,
      );
      return {
        ...bag,
        items: [...bag.items, ...pending],
        subtotal: Number((bag.subtotal + pendingSubtotal).toFixed(2)),
        itemCount:
          bag.itemCount + pending.reduce((sum, item) => sum + item.quantity, 0),
        guest: false,
        pendingCount: pending.length,
      };
    }
    const items = guestItems();
    const subtotal = Number(
      items.reduce((sum, item) => sum + item.lineTotal, 0).toFixed(2),
    );
    return {
      items,
      subtotal,
      itemCount: items.reduce((sum, item) => sum + item.quantity, 0),
      guest: true,
      pendingCount: 0,
    };
  }

  function cartRow(item, guest) {
    const image =
      item.product.imageUrls?.[0] ||
      "/assets/catalog/02-1548036328-c9fa89d128fa.jpg";
    const stock = Math.max(0, Number(item.product.stockQuantity) || 0);
    const quantities = Array.from(
      { length: Math.min(10, Math.max(1, stock)) },
      (_, index) => index + 1,
    );
    if (!quantities.includes(item.quantity)) quantities.push(item.quantity);
    const options = quantities
      .map(
        (quantity) =>
          `<option value="${quantity}" ${item.quantity === quantity ? "selected" : ""}>${quantity > stock ? `Qty ${quantity} · unavailable` : `Qty ${quantity}`}</option>`,
      )
      .join("");
    return `<article class="cart-item" data-item="${e(item.id)}" data-local-saved="${Boolean(guest || item.localPending)}"><img class="cart-item-image" src="${e(image)}" alt="${e(item.product.title)}"><div class="cart-item-info"><p class="eyebrow">${e(item.product.category?.name || "Aura original")}</p><h3>${e(item.product.title)}</h3><p>${item.size ? `Size: ${e(item.size)}` : ""}${item.size && item.color ? " · " : ""}${item.color ? `Color: ${e(item.color)}` : ""}</p>${item.localPending ? '<small class="stock-status stock-low">Inventory changed · saved on this device</small>' : ""}<div class="cart-item-controls"><label class="visually-hidden" for="qty-${e(item.id)}">Quantity</label><select id="qty-${e(item.id)}" data-quantity>${options}</select><button class="remove-item" type="button" data-remove>Remove</button></div></div><div class="cart-item-price">${money(item.lineTotal)}</div></article>`;
  }

  function totalsHtml(totals, includeButton = true) {
    return `<aside class="summary-card"><p class="eyebrow">Order summary</p><h2>Good things ahead.</h2><div class="summary-line"><span>Subtotal</span><span>${money(totals.subtotal)}</span></div><div class="summary-line"><span>Shipping</span><span>${totals.shipping ? money(totals.shipping) : "Complimentary"}</span></div><div class="summary-line"><span>Estimated tax</span><span>${money(totals.tax)}</span></div><div class="summary-line summary-total"><span>Grand total</span><span>${money(totals.total)}</span></div>${includeButton ? '<a class="button button-dark" href="/checkout">Continue to checkout <span aria-hidden="true">↗</span></a>' : ""}<p class="muted-note">Complimentary shipping on orders over $250. Tax is an estimate; payment is simulated.</p></aside>`;
  }

  async function renderCart() {
    const root = $("#cart-root");
    if (!root) return;
    try {
      const bag = await currentBag();
      if (!bag.items.length) {
        root.innerHTML = `<div class="empty-state"><span>✳</span><h2>Your bag is taking a breath.</h2><p>There’s nothing in it just yet. Find a piece that feels like yours.</p><a class="button button-dark" href="/shop">Explore the collection</a></div>`;
        return;
      }
      const totals = computeTotals(bag.subtotal);
      const pendingMessage = bag.pendingCount
        ? '<div class="order-confirmation"><p class="eyebrow">Stock update</p><p>Some saved guest pieces could not be added because inventory changed. Adjust the quantity or remove the saved piece to continue.</p></div>'
        : "";
      root.innerHTML = `${pendingMessage}<div class="cart-layout"><div class="cart-items">${bag.items.map((item) => cartRow(item, bag.guest)).join("")}</div>${totalsHtml(totals, !bag.pendingCount)}</div>`;
      root.querySelectorAll(".cart-item").forEach((row) => {
        const itemId = row.dataset.item;
        const localSaved = row.dataset.localSaved === "true";
        row
          .querySelector("[data-quantity]")
          .addEventListener("change", async (event) => {
            const quantity = Number(event.target.value);
            try {
              if (localSaved) {
                const items = getGuestBag();
                const item = items.find((entry) => entry.key === itemId);
                if (item) item.quantity = quantity;
                saveGuestBag(items);
                if (!bag.guest) await store.syncGuestBag();
              } else
                await request(`/api/cart/items/${encodeURIComponent(itemId)}`, {
                  method: "PATCH",
                  body: JSON.stringify({ quantity }),
                });
              await renderCart();
            } catch (error) {
              toast(error.message, "error");
              await renderCart();
            }
          });
        row
          .querySelector("[data-remove]")
          .addEventListener("click", async () => {
            try {
              if (localSaved)
                saveGuestBag(
                  getGuestBag().filter((entry) => entry.key !== itemId),
                );
              else
                await request(`/api/cart/items/${encodeURIComponent(itemId)}`, {
                  method: "DELETE",
                });
              await renderCart();
            } catch (error) {
              toast(error.message, "error");
            }
          });
      });
    } catch (error) {
      root.innerHTML = `<p class="inline-error">${e(error.message)}</p>`;
    }
  }

  async function renderCheckout() {
    const root = $("#checkout-root");
    if (!root) return;
    const user = await refreshUser();
    if (!user) {
      root.innerHTML = `<div class="empty-state"><h2>Your bag is saved.</h2><p>Sign in or create an account to place your order. Your guest bag will be brought along.</p><a class="button button-dark" href="/account?return=/checkout">Sign in or create an account</a></div>`;
      return;
    }
    try {
      await store.syncGuestBag();
      if (getGuestBag().length) {
        root.innerHTML =
          '<div class="empty-state"><h2>A saved piece needs a quick review.</h2><p>Inventory changed before it could be added to your account. Adjust or remove the item in your cart before checking out.</p><a class="button button-dark" href="/cart">Review your cart</a></div>';
        return;
      }
      const bag = await request("/api/cart");
      if (!bag.items.length) {
        root.innerHTML =
          '<div class="empty-state"><h2>Your bag is empty.</h2><a class="button button-dark" href="/shop">Explore the collection</a></div>';
        return;
      }
      const totals = computeTotals(bag.subtotal);
      root.innerHTML = `<div class="checkout-layout"><div><form id="checkout-form" class="checkout-form"><label class="full">Name<input name="name" autocomplete="name" value="${e(user.name)}" maxlength="70" required></label><label class="full">Street<input name="street" autocomplete="street-address" maxlength="180" required></label><label>City<input name="city" autocomplete="address-level2" maxlength="100" required></label><label>ZIP<input name="zip" autocomplete="postal-code" maxlength="20" required></label><label class="full">Phone<input name="phone" type="tel" autocomplete="tel" value="${e(user.phone || "")}" maxlength="40" required></label><div class="payment-note full"><strong>Simulated payment</strong><br>This demo confirms a test order only. No card details are requested and no charge is made.</div><button class="button button-dark" type="submit">Confirm simulated payment · ${money(totals.total)}</button><p id="checkout-message" class="form-message full" aria-live="polite"></p></form></div>${totalsHtml(totals, false)}</div>`;
      $("#checkout-form").addEventListener("submit", async (event) => {
        event.preventDefault();
        const form = event.currentTarget;
        const submit = form.querySelector('button[type="submit"]');
        const message = $("#checkout-message");
        submit.disabled = true;
        message.textContent = "Confirming your order…";
        try {
          const data = await request("/api/orders/checkout", {
            method: "POST",
            body: JSON.stringify({
              name: form.name.value,
              street: form.street.value,
              city: form.city.value,
              zip: form.zip.value,
              phone: form.phone.value,
            }),
          });
          const order = data.order;
          root.innerHTML = `<section class="order-confirmation"><p class="eyebrow">A lovely choice</p><h2>Your order is in the works.</h2><p>Thank you, ${e(user.name.split(" ")[0])}. We’ve saved your order and it should arrive in ${e(data.deliveryEstimate)}.</p><p class="order-id">Order ID · ${e(order.id)}</p><p>Payment status: ${e(order.paymentStatus)}. No real payment was processed.</p></section><div class="checkout-layout"><section><h2>Order details</h2>${order.items.map((item) => `<article class="order-row"><div><strong>${e(item.productTitle)}</strong><small>${item.quantity} × ${money(item.priceAtPurchase)}${item.size ? ` · ${e(item.size)}` : ""}</small></div><strong>${money(item.quantity * item.priceAtPurchase)}</strong></article>`).join("")}<a class="text-link" href="/account">View your orders <span>↗</span></a></section>${totalsHtml({ subtotal: order.subtotal, shipping: order.shippingFee, tax: order.estimatedTax, total: order.totalAmount }, false)}</div>`;
          await store.updateBagCount();
        } catch (error) {
          message.textContent = error.message;
          submit.disabled = false;
        }
      });
    } catch (error) {
      root.innerHTML = `<p class="inline-error">${e(error.message)}</p>`;
    }
  }

  document.addEventListener("DOMContentLoaded", () => {
    if (document.body.dataset.page === "cart") renderCart();
    if (document.body.dataset.page === "checkout") renderCheckout();
  });
})();
