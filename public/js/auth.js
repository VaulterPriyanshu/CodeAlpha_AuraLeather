(() => {
  const store = window.AuraStore;
  if (!store) return;
  const { $, request, escapeHtml: e, money, toast } = store;

  function safeReturnPath() {
    const value =
      new URLSearchParams(location.search).get("return") || "/account";
    return value.startsWith("/") && !value.startsWith("//")
      ? value
      : "/account";
  }

  async function renderDashboard(user) {
    const root = $("#account-root");
    const [ordersData] = await Promise.all([
      request("/api/orders").catch(() => ({ orders: [] })),
    ]);
    root.innerHTML = `<section class="account-dashboard"><div class="account-welcome"><div><p class="eyebrow">Good to see you</p><h2>Hello, ${e(user.name.split(" ")[0])}.</h2><p class="muted-note">Your account is ready when you are.</p></div><div class="account-actions">${user.role === "admin" ? '<a class="button button-outline" href="/admin">Atelier desk</a>' : ""}<button id="sign-out" class="text-button" type="button">Sign out</button></div></div><div class="account-dashboard-grid"><form id="profile-form" class="profile-form"><p class="eyebrow">Your details</p><label>Full name<input name="name" value="${e(user.name)}" minlength="2" maxlength="70" required></label><label>Email<input value="${e(user.email)}" disabled></label><label>Phone<input name="phone" value="${e(user.phone || "")}" maxlength="40"></label><label>Address<textarea name="address" maxlength="300" placeholder="Street, city, postal code">${e(user.address || "")}</textarea></label><button class="button button-dark" type="submit">Save details</button><p class="form-message" aria-live="polite"></p></form><section class="order-list"><p class="eyebrow">Your pieces, in motion</p><h2>Order history</h2>${ordersData.orders.length ? ordersData.orders.map((order) => `<article class="order-row"><div><strong>Order ${e(order.id.slice(-8).toUpperCase())}</strong><small>${new Date(order.createdAt).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })} · ${order.items.length} ${order.items.length === 1 ? "piece" : "pieces"}</small></div><div><span class="status-pill">${e(order.status)}</span><small>${money(order.totalAmount)}</small></div></article>`).join("") : '<p class="muted-note">Your first order will find its place here.</p>'}</section></div></section>`;
    $("#sign-out").addEventListener("click", async () => {
      try {
        await request("/api/auth/logout", { method: "POST" });
        await store.refreshUser();
        location.reload();
      } catch (error) {
        toast(error.message, "error");
      }
    });
    $("#profile-form").addEventListener("submit", async (event) => {
      event.preventDefault();
      const form = event.currentTarget;
      const message = form.querySelector(".form-message");
      try {
        const data = await request("/api/auth/profile", {
          method: "PUT",
          body: JSON.stringify({
            name: form.name.value,
            phone: form.phone.value,
            address: form.address.value,
          }),
        });
        await store.refreshUser();
        message.textContent = "Your details are saved.";
      } catch (error) {
        message.textContent = error.message;
      }
    });
  }

  document.addEventListener("DOMContentLoaded", async () => {
    if (document.body.dataset.page !== "account") return;
    let user = await store.refreshUser();
    if (user) {
      await store.syncGuestBag();
      await renderDashboard(user);
      return;
    }
    $("#login-form")?.addEventListener("submit", async (event) => {
      event.preventDefault();
      const form = event.currentTarget;
      const message = form.querySelector(".form-message");
      message.textContent = "";
      try {
        await request("/api/auth/login", {
          method: "POST",
          body: JSON.stringify({
            email: form.email.value,
            password: form.password.value,
          }),
        });
        user = await store.refreshUser();
        await store.syncGuestBag();
        if (user) await renderDashboard(user);
        const destination = safeReturnPath();
        if (destination !== "/account") location.href = destination;
      } catch (error) {
        message.textContent = error.message;
      }
    });
    $("#register-form")?.addEventListener("submit", async (event) => {
      event.preventDefault();
      const form = event.currentTarget;
      const message = form.querySelector(".form-message");
      message.textContent = "";
      try {
        await request("/api/auth/register", {
          method: "POST",
          body: JSON.stringify({
            name: form.name.value,
            email: form.email.value,
            password: form.password.value,
          }),
        });
        user = await store.refreshUser();
        await store.syncGuestBag();
        if (user) await renderDashboard(user);
        const destination = safeReturnPath();
        if (destination !== "/account") location.href = destination;
      } catch (error) {
        message.textContent = error.message;
      }
    });
  });
})();
