(() => {
  const store = window.AuraStore;
  if (!store) return;
  const { $, request, escapeHtml: e, money, toast, addToBag } = store;

  const imageFor = (product) =>
    product.imageUrls?.[0] ||
    "/assets/catalog/02-1548036328-c9fa89d128fa.jpg";

  function carouselItem(product) {
    return {
      id: product.id,
      src: imageFor(product),
      alt: `${product.title} handcrafted leather piece`,
      title: product.title,
      subtitle: product.category?.name || product.audience || "Aura original",
      slug: product.slug || product.id,
    };
  }

  function navigateToProduct(id) {
    window.location.assign(`/product/${encodeURIComponent(id)}`);
  }

  async function renderHome() {
    const categoryRoot = $("#category-grid");
    const featuredRoot = $("#featured-carousel");
    try {
      const [{ categories }, { products }] = await Promise.all([
        request("/api/categories"),
        request("/api/products/featured"),
      ]);
      const categoryItems = categories.map((category) => {
        const displayName =
          category.slug === "childrens-wear" ? "Kids Wear" : category.name;
        return {
          src: category.imageUrl,
          alt: `${displayName} collection`,
          title: displayName,
          subtitle: `${category.productCount} pieces`,
          slug: category.slug,
        };
      });
      if (categoryRoot) {
        const motion = await store.motionReady;
        if (motion?.renderCircularCarousel) {
          categoryRoot.classList.remove("category-carousel--fallback");
          motion.renderCircularCarousel(categoryRoot, categoryItems, {
            preset: "cylinder",
            intro: "rise",
            cardWidth: 220,
            aspectRatio: 0.82,
            gap: 18,
            speed: 10,
            captions: true,
            fadeColor: "#f0ebe2",
            cornerRadius: 2,
            onItemClick: (item) => {
              if (item?.slug) {
                window.location.assign(
                  `/shop?category=${encodeURIComponent(item.slug)}`,
                );
              }
            },
          });
        } else {
          categoryRoot.classList.add("category-carousel--fallback");
          categoryRoot.innerHTML = categoryItems
            .map(
              (item) =>
                `<a class="category-card" href="/shop?category=${encodeURIComponent(item.slug)}"><img src="${e(item.src)}" alt="${e(item.alt)}" loading="eager" fetchpriority="high"><span class="category-shade"></span><span class="category-name">${e(item.title)}</span><span class="category-count">${e(item.subtitle)} <b aria-hidden="true">↗</b></span></a>`,
            )
            .join("");
        }
      }
      if (!featuredRoot) return;
      if (!products.length) {
        featuredRoot.innerHTML =
          '<p class="inline-error">No featured pieces are available just now.</p>';
        return;
      }
      const motion = await store.motionReady;
      if (!motion?.renderFlexCarousel) {
        featuredRoot.innerHTML =
          '<p class="inline-error">The featured collection is unavailable. Please refresh and try again.</p>';
        return;
      }
      const productCarouselItems = products.map(carouselItem);
      motion.renderFlexCarousel(featuredRoot, productCarouselItems, {
        preset: "liquid",
        captions: true,
        cardHeight: 0.5,
        focusOnClick: true,
        gap: 12,
        intro: "rise",
        squeeze: 0.2,
        onSelect: (_index, item) => navigateToProduct(item.id),
      });
    } catch (error) {
      if (categoryRoot)
        categoryRoot.innerHTML = `<p class="inline-error">${e(error.message)}</p>`;
      if (featuredRoot)
        featuredRoot.innerHTML =
          '<p class="inline-error">The collection is having a quiet moment. Refresh to try again.</p>';
    }
  }

  async function renderProductGrid(root, products) {
    if (!root) return;
    if (!products.length) {
      root.innerHTML =
        '<p class="product-grid__empty">No pieces match those filters. Try widening your search.</p>';
      return;
    }
    root.innerHTML = products
      .map((product) => {
        const href = `/product/${encodeURIComponent(product.slug || product.id)}`;
        const badge = product.badge
          ? `<span class="product-card__badge">${e(product.badge)}</span>`
          : "";
        const soldOut = Number(product.stockQuantity) < 1;
        return `<article class="product-card" role="listitem"><a class="product-card__image" href="${href}" aria-label="View ${e(product.title)}">${badge}<img src="${e(imageFor(product))}" alt="${e(product.title)}" loading="lazy"></a><p class="product-card__category">${e(product.category?.name || product.audience || "Aura original")}</p><h2 class="product-card__title"><a href="${href}">${e(product.title)}</a></h2><div class="product-card__rating" aria-label="Rated ${Number(product.rating || 0).toFixed(1)} out of 5">${stars(product.rating)}<small>${Number(product.rating || 0).toFixed(1)}</small></div><div class="product-card__bottom"><span class="product-card__price">${money(product.price)}</span><div class="product-card__actions"><a class="button button-outline" href="${href}">View Details</a><button class="button button-dark" type="button" data-quick-add-id="${e(product.id)}" ${soldOut ? "disabled" : ""}>${soldOut ? "Sold Out" : "Quick Add"}</button></div></div></article>`;
      })
      .join("");
    root.querySelectorAll("[data-quick-add-id]").forEach((button) => {
      button.addEventListener("click", async () => {
        const product = products.find(
          (item) => String(item.id) === button.dataset.quickAddId,
        );
        if (!product || button.disabled) return;
        button.disabled = true;
        try {
          await addToBag(
            product,
            product.sizeOptions?.[0] || "",
            product.colorOptions?.[0] || "",
            1,
          );
        } catch (error) {
          toast(error.message, "error");
        } finally {
          button.disabled = Number(product.stockQuantity) < 1;
        }
      });
    });
  }

  async function renderShop() {
    const gridRoot = $("#product-grid");
    if (!gridRoot) return;
    const params = new URLSearchParams(location.search);
    const category = $("#filter-category");
    const audience = $("#filter-audience");
    const sort = $("#sort-products");
    const search = $("#shop-search");
    const minPrice = $("#filter-min");
    const maxPrice = $("#filter-max");

    try {
      const { categories } = await request("/api/categories");
      category.insertAdjacentHTML(
        "beforeend",
        categories
          .map(
            (item) =>
              `<option value="${e(item.slug)}">${e(item.name)}</option>`,
          )
          .join(""),
      );
    } catch {
      // The products query below reports a useful message if the catalog is unavailable.
    }

    if (category) category.value = params.get("category") || "";
    if (audience) audience.value = params.get("audience") || "";
    if (sort) sort.value = params.get("sort") || "popularity";
    if (search) search.value = params.get("search") || "";
    if (minPrice && params.get("minPrice"))
      minPrice.value = String(
        Math.min(700, Number(params.get("minPrice")) || 0),
      );
    if (maxPrice && params.get("maxPrice"))
      maxPrice.value = String(
        Math.min(700, Number(params.get("maxPrice")) || 700),
      );

    const priceDisplay = $("#price-display");
    let updateId = 0;
    const update = async () => {
      const requestId = ++updateId;
      const values = new URLSearchParams();
      if (category.value) values.set("category", category.value);
      if (audience.value) values.set("audience", audience.value);
      if (sort.value && sort.value !== "popularity")
        values.set("sort", sort.value);
      if (search.value.trim()) values.set("search", search.value.trim());
      if (Number(minPrice.value) > Number(maxPrice.value)) {
        if (document.activeElement === minPrice)
          maxPrice.value = minPrice.value;
        else minPrice.value = maxPrice.value;
      }
      if (Number(minPrice.value) > 0) values.set("minPrice", minPrice.value);
      if (Number(maxPrice.value) < 700) values.set("maxPrice", maxPrice.value);
      if (priceDisplay)
        priceDisplay.textContent = `${money(minPrice.value)} – ${money(maxPrice.value)}`;
      history.replaceState(
        {},
        "",
        `/shop${values.toString() ? `?${values}` : ""}`,
      );
      gridRoot.setAttribute("aria-busy", "true");
      try {
        const query = values.toString();
        const data = await request(`/api/products${query ? `?${query}` : ""}`);
        if (requestId !== updateId) return;
        $("#shop-count").textContent =
          `${data.products.length} ${data.products.length === 1 ? "piece" : "pieces"} to explore`;
        await renderProductGrid(gridRoot, data.products);
      } catch (error) {
        if (requestId === updateId)
          gridRoot.innerHTML = `<p class="inline-error">${e(error.message)}</p>`;
      } finally {
        if (requestId === updateId) gridRoot.setAttribute("aria-busy", "false");
      }
    };

    [category, audience, sort, minPrice, maxPrice].forEach((control) =>
      control?.addEventListener("input", update),
    );
    search?.addEventListener("input", () => {
      window.clearTimeout(search._timer);
      search._timer = window.setTimeout(update, 260);
    });
    $("#clear-filters")?.addEventListener("click", () => {
      category.value = "";
      audience.value = "";
      sort.value = "popularity";
      search.value = "";
      minPrice.value = "0";
      maxPrice.value = "700";
      update();
    });
    await update();
  }

  function stars(value) {
    const rounded = Math.max(0, Math.min(5, Math.round(Number(value) || 0)));
    return `${"★".repeat(rounded)}${"☆".repeat(5 - rounded)}`;
  }

  async function renderProduct() {
    const root = $("#product-detail");
    if (!root) return;
    const pathId = location.pathname.split("/").filter(Boolean).pop();
    const id =
      pathId === "product.html"
        ? new URLSearchParams(location.search).get("id")
        : pathId;
    if (!id || id === "product") {
      root.innerHTML =
        '<div class="empty-state"><h2>Choose a piece to explore</h2><a class="button button-dark" href="/shop">Back to the collection</a></div>';
      return;
    }
    try {
      const { product } = await request(
        `/api/products/${encodeURIComponent(id)}`,
      );
      document.title = `${product.title} — Aura Leather Co.`;
      $("#product-crumb").textContent = product.title;
      const images = product.imageUrls?.length
        ? product.imageUrls
        : ["/assets/catalog/02-1548036328-c9fa89d128fa.jpg"];
      const sizes = product.sizeOptions?.length
        ? product.sizeOptions
        : ["One size"];
      const colors = product.colorOptions?.length
        ? product.colorOptions
        : ["Natural"];
      const specs = Object.entries(product.specifications || {});
      const specsMarkup = specs.length
        ? `<dl class="detail-specs">${specs.map(([key, value]) => `<div><dt>${e(String(key).replace(/([A-Z])/g, " $1"))}</dt><dd>${e(String(value))}</dd></div>`).join("")}</dl>`
        : "";
      root.innerHTML = `<div class="product-gallery"><div class="product-main-image"><img id="primary-product-image" src="${e(images[0])}" alt="${e(product.title)}" fetchpriority="high"></div><div class="product-thumbnails">${images.map((src, index) => `<button class="thumbnail ${index === 0 ? "is-active" : ""}" data-image="${e(src)}" aria-label="View image ${index + 1}"><img src="${e(src)}" alt="" loading="lazy"></button>`).join("")}</div></div><div class="product-info"><p class="eyebrow">${e(product.category?.name || "Aura original")} · ${e(product.audience || "Unisex")}</p><h1 data-fold-text>${e(product.title)}</h1><div class="detail-rating"><span class="stars">${stars(product.rating)}</span><span>${Number(product.rating || 0).toFixed(1)} · ${Number(product.reviewCount || 0)} notes</span></div><p class="detail-price">${money(product.price)}</p><p class="detail-description">${e(product.description)}</p><div class="material-note"><strong>${e(product.leatherType)}</strong><span>Every hide has its own grain and character.</span></div>${specsMarkup}<div class="detail-selectors"><label>Size<select id="product-size">${sizes.map((size) => `<option value="${e(size)}">${e(size)}</option>`).join("")}</select></label><label>Color<select id="product-color">${colors.map((color) => `<option value="${e(color)}">${e(color)}</option>`).join("")}</select></label><label>Quantity<select id="product-quantity">${Array.from({ length: Math.min(10, Number(product.stockQuantity) || 0) }, (_, index) => `<option value="${index + 1}">${index + 1}</option>`).join("") || '<option value="0">0</option>'}</select></label></div><p class="stock-status ${product.stockQuantity < 5 ? "stock-low" : ""}">${product.stockQuantity > 0 ? `${product.stockQuantity} available · ready to ship` : "Currently out of stock"}</p><div class="detail-actions"><button class="button button-dark" id="add-detail" type="button" ${product.stockQuantity < 1 ? "disabled" : ""}>Add to Cart</button><button class="button button-outline" id="buy-now" type="button" ${product.stockQuantity < 1 ? "disabled" : ""}>Buy Now</button></div><details class="care-details"><summary>Leather & care</summary><p>${e(product.careInstructions)}</p></details><p class="assurance-line">✳ Hand-finished · Secure checkout · Lifetime craft guarantee</p></div>`;
      root.querySelectorAll(".thumbnail").forEach((button) =>
        button.addEventListener("click", () => {
          const image = $("#primary-product-image");
          if (image) image.src = button.dataset.image;
          root
            .querySelectorAll(".thumbnail")
            .forEach((thumb) =>
              thumb.classList.toggle("is-active", thumb === button),
            );
        }),
      );
      const selected = () => ({
        size: $("#product-size").value,
        color: $("#product-color").value,
        quantity: Number($("#product-quantity").value),
      });
      $("#add-detail").addEventListener("click", async () => {
        try {
          const choice = selected();
          await addToBag(product, choice.size, choice.color, choice.quantity);
        } catch (error) {
          toast(error.message, "error");
        }
      });
      $("#buy-now").addEventListener("click", async () => {
        try {
          const choice = selected();
          await addToBag(product, choice.size, choice.color, choice.quantity);
          location.href = "/checkout";
        } catch (error) {
          toast(error.message, "error");
        }
      });
      const reviewRoot = $("#review-list");
      const reviews = product.reviews || [];
      $("#review-summary").textContent =
        `${Number(product.reviewCount || 0)} customer notes`;
      reviewRoot.innerHTML = reviews.length
        ? reviews
            .map(
              (review) =>
                `<article class="review-card"><div class="review-card-top"><strong>${e(review.name)}</strong><span class="stars">${stars(review.rating)}</span></div><p>${e(review.comment)}</p><small>${new Date(review.createdAt).toLocaleDateString("en-US", { month: "long", year: "numeric" })}</small></article>`,
            )
            .join("")
        : '<p class="muted-note">Be the first to leave a note about this piece.</p>';
      const reviewForm = $("#review-form");
      if (await store.getUser()) reviewForm.classList.remove("hidden");
      reviewForm?.addEventListener("submit", async (event) => {
        event.preventDefault();
        const form = event.currentTarget;
        try {
          await request(`/api/reviews/${encodeURIComponent(product.id)}`, {
            method: "POST",
            body: JSON.stringify({
              rating: form.rating.value,
              comment: form.comment.value,
            }),
          });
          toast("Thank you for your note.");
          location.reload();
        } catch (error) {
          toast(error.message, "error");
        }
      });
    } catch (error) {
      root.innerHTML = `<div class="empty-state"><h2>That piece has slipped away.</h2><p>${e(error.message)}</p><a class="button button-dark" href="/shop">Return to the collection</a></div>`;
    }
  }

  document.addEventListener("DOMContentLoaded", () => {
    if (document.body.dataset.page === "home") renderHome();
    if (document.body.dataset.page === "shop") renderShop();
    if (document.body.dataset.page === "product") renderProduct();
  });
})();
