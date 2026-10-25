(() => {
  const $ = (selector, root = document) => root.querySelector(selector);
  const escapeHtml = (value = "") =>
    String(value).replace(
      /[&<>"']/g,
      (char) =>
        ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#39;",
        })[char],
    );
  const money = (value) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(Number(value || 0));

  const motionReady = new Promise((resolve) => {
    const stylesheet = document.createElement("link");
    stylesheet.rel = "stylesheet";
    stylesheet.href = "/css/specular-button.css";
    document.head.appendChild(stylesheet);
    const script = document.createElement("script");
    script.src = "/js/ui-motion.bundle.js?v=carousel-fix-1";
    script.onload = () => resolve(window.AuraMotion || null);
    script.onerror = () => resolve(null);
    document.head.appendChild(script);
  });

  async function request(url, options = {}) {
    const headers = {
      ...(options.body && !(options.body instanceof FormData)
        ? { "Content-Type": "application/json" }
        : {}),
      ...(options.headers || {}),
    };
    const response = await fetch(url, {
      credentials: "same-origin",
      ...options,
      headers,
    });
    const contentType = response.headers.get("content-type") || "";
    const data = contentType.includes("application/json")
      ? await response.json()
      : await response.text();
    if (!response.ok)
      throw new Error(data?.error || "Something went wrong. Please try again.");
    return data;
  }

  const bagKey = "auraGuestBag";
  function getGuestBag() {
    try {
      const items = JSON.parse(localStorage.getItem(bagKey) || "[]");
      return Array.isArray(items) ? items : [];
    } catch {
      return [];
    }
  }
  function saveGuestBag(items) {
    localStorage.setItem(bagKey, JSON.stringify(items));
    updateBagCount();
  }
  let currentUser = null;

  function toast(message, kind = "success") {
    let region = $("#toast-region");
    if (!region) {
      region = document.createElement("div");
      region.id = "toast-region";
      region.className = "toast-region";
      region.setAttribute("aria-live", "polite");
      document.body.appendChild(region);
    }
    const item = document.createElement("div");
    item.className = `toast toast-${kind}`;
    item.textContent = message;
    region.appendChild(item);
    window.setTimeout(() => item.remove(), 3600);
  }

  function renderShell() {
    const header = $("#site-header");
    if (header)
      header.innerHTML = `
      <div class="announcement"><span>Considered craft. Complimentary shipping over $250.</span><a href="/about">Our promise <b aria-hidden="true">↗</b></a></div>
      <header class="site-header"><a class="brand" href="/" aria-label="Aura Leather Co. home"><span class="brand-stamp" aria-hidden="true">AL</span><span class="brand-type"><strong>AURA</strong><small>LEATHER CO.</small></span></a>
        <button class="nav-toggle" id="nav-toggle" type="button" aria-label="Open navigation" aria-expanded="false"><span></span><span></span></button>
        <nav class="primary-nav" id="primary-nav" aria-label="Main navigation"><a href="/">Home</a><a href="/shop">Shop</a><a href="/#categories">Categories</a><a href="/about">About Us</a><a href="/contact">Contact</a></nav>
        <div class="header-actions"><form class="header-search" id="header-search"><label class="visually-hidden" for="site-search">Search the collection</label><input id="site-search" name="search" type="search" placeholder="Search pieces…"><button aria-label="Search" type="submit">⌕</button></form><a class="account-link" href="/account" aria-label="Your account"><span class="account-icon">♙</span><span id="account-label">Account</span></a><a class="bag-link" href="/cart" aria-label="Shopping cart"><span aria-hidden="true">Cart</span><span class="bag-count" id="bag-count">0</span></a></div>
      </header>`;
    const footer = $("#site-footer");
    if (footer)
      footer.innerHTML = `
      <footer class="site-footer"><div class="footer-top"><div class="footer-brand"><a class="brand brand-footer" href="/"><span class="brand-stamp" aria-hidden="true">AL</span><span class="brand-type"><strong>AURA</strong><small>LEATHER CO.</small></span></a><p>Made slowly. Carried for years.</p><div class="social-links"><a href="https://instagram.com" target="_blank" rel="noreferrer">Instagram</a><a href="https://pinterest.com" target="_blank" rel="noreferrer">Pinterest</a></div></div>
        <div class="footer-links"><h3>Explore</h3><a href="/shop">Shop all</a><a href="/#categories">Categories</a><a href="/about">Our story</a><a href="/contact">Contact</a></div>
        <div class="footer-links"><h3>We’re here</h3><a href="/contact">Care & repair</a><a href="/contact">Shipping & returns</a><a href="/contact">Privacy policy</a><a href="/contact">Terms of service</a></div>
        <form id="newsletter-form" class="newsletter-form"><p class="eyebrow">A note from the atelier</p><h3>Good things, occasionally.</h3><p>New work, care notes and stories from the bench. No noise.</p><div class="newsletter-input"><label class="visually-hidden" for="newsletter-email">Email address</label><input id="newsletter-email" name="email" type="email" placeholder="Your email address" required><button type="submit" aria-label="Subscribe">→</button></div><span id="newsletter-message" class="form-message" aria-live="polite"></span></form></div>
        <div class="footer-bottom"><span>© <span id="footer-year"></span> Aura Leather Co. Made with intention.</span><span>Full-grain by nature. Better with time.</span><a href="/account">Account & orders</a></div></footer>`;

    const toggle = $("#nav-toggle");
    toggle?.addEventListener("click", () => {
      const open = toggle.getAttribute("aria-expanded") === "true";
      toggle.setAttribute("aria-expanded", String(!open));
      $("#primary-nav")?.classList.toggle("nav-open", !open);
    });
    $("#header-search")?.addEventListener("submit", (event) => {
      event.preventDefault();
      const term = $("#site-search").value.trim();
      location.href = `/shop${term ? `?search=${encodeURIComponent(term)}` : ""}`;
    });
    $("#footer-year") &&
      ($("#footer-year").textContent = new Date().getFullYear());
    $("#newsletter-form")?.addEventListener("submit", async (event) => {
      event.preventDefault();
      const form = event.currentTarget;
      const msg = $("#newsletter-message");
      try {
        const result = await request("/api/newsletter", {
          method: "POST",
          body: JSON.stringify({ email: form.email.value }),
        });
        msg.textContent = result.message;
        form.reset();
      } catch (error) {
        msg.textContent = error.message;
      }
    });
    $("#contact-form")?.addEventListener("submit", (event) => {
      event.preventDefault();
      const form = event.currentTarget;
      const subject = encodeURIComponent(
        `Aura Leather Co. note from ${form.name.value.trim()}`,
      );
      const body = encodeURIComponent(
        `Name: ${form.name.value.trim()}\nEmail: ${form.email.value.trim()}\n\n${form.message.value.trim()}`,
      );
      $("#contact-form .form-message").textContent =
        "Your email app is opening with your note ready to send.";
      location.href = `mailto:atelier@auraleather.co?subject=${subject}&body=${body}`;
    });
  }

  async function refreshUser() {
    try {
      const data = await request("/api/auth/me");
      currentUser = data.user;
    } catch {
      currentUser = null;
    }
    const label = $("#account-label");
    if (label)
      label.textContent = currentUser
        ? currentUser.name.split(" ")[0]
        : "Account";
    await updateBagCount();
    return currentUser;
  }

  async function updateBagCount() {
    const guestCount = getGuestBag().reduce(
      (sum, item) => sum + Number(item.quantity || 0),
      0,
    );
    let count = guestCount;
    if (currentUser) {
      try {
        const bag = await request("/api/cart");
        count = bag.itemCount + guestCount;
      } catch {
        /* Keep the visible local bag count if the API is unavailable. */
      }
    }
    const badge = $("#bag-count");
    if (badge) badge.textContent = String(count);
  }

  async function addToBag(product, size = "", color = "", quantity = 1) {
    if (!product?.id) throw new Error("This piece is not available right now.");
    const qty = Math.max(1, Math.min(10, Number(quantity) || 1));
    const stock = Number(product.stockQuantity) || 0;
    if (stock < 1) throw new Error("This piece is currently out of stock.");
    if (qty > stock)
      throw new Error(
        `Only ${stock} ${stock === 1 ? "piece is" : "pieces are"} available.`,
      );
    if (currentUser) {
      await request("/api/cart/items", {
        method: "POST",
        body: JSON.stringify({
          productId: product.id,
          size,
          color,
          quantity: qty,
        }),
      });
    } else {
      const items = getGuestBag();
      const key = `${product.id}|${size}|${color}`;
      const existing = items.find((item) => item.key === key);
      if (existing && existing.quantity + qty > stock)
        throw new Error(
          `Only ${stock} ${stock === 1 ? "piece is" : "pieces are"} available.`,
        );
      if (existing) existing.quantity = Math.min(10, existing.quantity + qty);
      else items.push({ key, product, size, color, quantity: qty });
      saveGuestBag(items);
    }
    await updateBagCount();
    toast(`${product.title} added to your bag.`);
  }

  async function syncGuestBag() {
    const items = getGuestBag();
    if (!items.length || !currentUser) return;
    const failed = [];
    for (const item of items) {
      try {
        await request("/api/cart/items", {
          method: "POST",
          body: JSON.stringify({
            productId: item.product.id,
            size: item.size,
            color: item.color,
            quantity: item.quantity,
          }),
        });
      } catch (error) {
        failed.push(item);
        toast(`${item.product.title}: ${error.message}`, "error");
      }
    }
    saveGuestBag(failed);
  }

  renderShell();
  window.AuraStore = {
    $,
    request,
    escapeHtml,
    money,
    toast,
    getGuestBag,
    saveGuestBag,
    getUser: () => currentUser,
    refreshUser,
    updateBagCount,
    addToBag,
    syncGuestBag,
    motionReady,
  };
  document.addEventListener("DOMContentLoaded", () => {
    refreshUser();
  });
})();
