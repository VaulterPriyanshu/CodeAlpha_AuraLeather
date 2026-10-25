(() => {
  const store = window.AuraStore;
  if (!store) return;
  const { $, request, escapeHtml: e, money, toast } = store;
  let categories = [];
  let products = [];
  let editId = null;

  function productForm() {
    return `<form id="admin-product-form" class="admin-form"><p class="eyebrow">The collection</p><h2 id="admin-form-title">Add a piece</h2><label>Title<input name="title" required minlength="3" maxlength="120"></label><label>Slug<input name="slug" placeholder="auto-from-title"></label><label>Category<select name="category" required>${categories.map((category) => `<option value="${e(category.slug)}">${e(category.name)}</option>`).join("")}</select></label><label>Audience<select name="audience"><option value="unisex">Unisex</option><option value="men">Men</option><option value="women">Women</option><option value="kids">Kids</option></select></label><label>Price (USD)<input name="price" type="number" step="0.01" min="0" required></label><label>Stock quantity<input name="stockQuantity" type="number" min="0" required></label><label>Sizes, comma-separated<input name="sizeOptions" placeholder="One size, S, M, L"></label><label>Colors, comma-separated<input name="colorOptions" placeholder="Chestnut, Oxblood"></label><label>Image URLs, comma-separated<input name="imageUrls" placeholder="/assets/catalog/02-1548036328-c9fa89d128fa.jpg"></label><label>Leather type<input name="leatherType" value="Full-grain leather"></label><label>Description<textarea name="description" maxlength="3000" required></textarea></label><label>Badge (optional)<input name="badge" placeholder="Bestseller or New Arrival"></label><div class="admin-product-actions"><button class="button button-dark" type="submit">Save piece</button><button id="cancel-edit" class="button button-outline" type="button">Clear</button></div><p class="form-message" aria-live="polite"></p></form>`;
  }

  function renderList() {
    const list = $("#admin-product-list");
    list.innerHTML = `<p class="eyebrow">${products.length} pieces in the catalog</p><h2>Current collection</h2>${products.map((product) => `<article class="admin-product"><img src="${e(product.imageUrls?.[0] || "")}" alt=""><div><strong>${e(product.title)}</strong><small>${e(product.category?.name || "")} · ${money(product.price)} · ${product.stockQuantity} in stock</small></div><div class="admin-product-actions"><button type="button" data-edit="${e(product.id)}">Edit</button><button type="button" data-delete="${e(product.id)}">Remove</button></div></article>`).join("")}`;
    list.querySelectorAll("[data-edit]").forEach((button) =>
      button.addEventListener("click", () => {
        const product = products.find(
          (item) => item.id === button.dataset.edit,
        );
        if (!product) return;
        editId = product.id;
        const form = $("#admin-product-form");
        $("#admin-form-title").textContent = `Edit ${product.title}`;
        for (const [key, value] of Object.entries({
          title: product.title,
          slug: product.slug,
          category: product.category?.slug,
          audience: product.audience,
          price: product.price,
          stockQuantity: product.stockQuantity,
          sizeOptions: product.sizeOptions?.join(", "),
          colorOptions: product.colorOptions?.join(", "),
          imageUrls: product.imageUrls?.join(", "),
          leatherType: product.leatherType,
          description: product.description,
          badge: product.badge || "",
        }))
          if (form.elements[key]) form.elements[key].value = value ?? "";
        form.scrollIntoView({ behavior: "smooth", block: "start" });
      }),
    );
    list.querySelectorAll("[data-delete]").forEach((button) =>
      button.addEventListener("click", async () => {
        const product = products.find(
          (item) => item.id === button.dataset.delete,
        );
        if (
          !product ||
          !window.confirm(`Remove “${product.title}” from the catalog?`)
        )
          return;
        try {
          await request(
            `/api/admin/products/${encodeURIComponent(product.id)}`,
            { method: "DELETE" },
          );
          await loadAdmin();
          toast("Product removed.");
        } catch (error) {
          toast(error.message, "error");
        }
      }),
    );
  }

  async function loadAdmin() {
    const [{ products: savedProducts }, { categories: savedCategories }] =
      await Promise.all([request("/api/products"), request("/api/categories")]);
    products = savedProducts;
    categories = savedCategories;
    renderList();
  }

  document.addEventListener("DOMContentLoaded", async () => {
    if (document.body.dataset.page !== "admin") return;
    const root = $("#admin-root");
    try {
      const user = await store.refreshUser();
      if (!user) {
        root.innerHTML =
          '<div class="empty-state"><h2>Please sign in first.</h2><a class="button button-dark" href="/account?return=/admin">Go to sign in</a></div>';
        return;
      }
      if (user.role !== "admin") {
        root.innerHTML =
          '<div class="empty-state"><h2>This desk is for Aura administrators.</h2><a class="button button-outline" href="/account">Back to your account</a></div>';
        return;
      }
      root.innerHTML = `<div class="admin-toolbar"><p class="muted-note">Changes update the catalog immediately.</p><a class="text-link" href="/shop">View storefront <span>↗</span></a></div><div class="admin-layout">${productForm()}<section id="admin-product-list" class="admin-list"><p class="loading-note">Loading the collection…</p></section></div>`;
      await loadAdmin();
      $("#admin-product-form").addEventListener("submit", async (event) => {
        event.preventDefault();
        const form = event.currentTarget;
        const data = Object.fromEntries(new FormData(form).entries());
        data.price = Number(data.price);
        data.stockQuantity = Number(data.stockQuantity);
        for (const key of ["sizeOptions", "colorOptions", "imageUrls"])
          data[key] = data[key]
            .split(",")
            .map((value) => value.trim())
            .filter(Boolean);
        try {
          await request(
            editId
              ? `/api/admin/products/${encodeURIComponent(editId)}`
              : "/api/admin/products",
            { method: editId ? "PUT" : "POST", body: JSON.stringify(data) },
          );
          editId = null;
          form.reset();
          $("#admin-form-title").textContent = "Add a piece";
          form.elements.leatherType.value = "Full-grain leather";
          await loadAdmin();
          toast("The collection is updated.");
        } catch (error) {
          form.querySelector(".form-message").textContent = error.message;
        }
      });
      $("#cancel-edit").addEventListener("click", () => {
        editId = null;
        const form = $("#admin-product-form");
        form.reset();
        $("#admin-form-title").textContent = "Add a piece";
        form.elements.leatherType.value = "Full-grain leather";
      });
    } catch (error) {
      root.innerHTML = `<div class="empty-state"><h2>Could not open the atelier desk.</h2><p>${e(error.message)}</p></div>`;
    }
  });
})();
