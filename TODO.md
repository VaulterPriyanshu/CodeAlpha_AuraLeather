## 10. Homepage carousel and category section order — COMPLETE

- First section below the main hero banner: Place the WebGL `FlexCarousel` showcase (“Pieces with a story to start”).
- Second section below the carousel: Place the static category grid (“Made for the well-worn path” showing Belts, Kids Wear, Jackets, Purses & Handbags, Shoes, Wallets, and Women’s Wear).
- Keep the interactive liquid FlexCarousel active on the homepage, with captions, database-backed featured products, category subtitles, focus/selection behavior, and navigation to the selected product detail page.
- Render the category cards cleanly underneath the carousel for category browsing.
- Ensure buttons integrated within these sections use the custom WebGL-powered `SpecularButton` component.
- Preserve clean routing and props so both components render in the specified vertical sequence.

## 11. FoldText and site-wide SpecularButton — COMPLETE

- Integrate the GSAP-powered 3D folding text animation component for main luxury hero banners and category headers (e.g., “Timeless Craftsmanship” or “Handcrafted Leather Goods”).
- Replace every standard HTML button and CSS button across the entire application (such as “Add to Cart”, “Checkout”, “Login”, “Register”, “View Details”, and “Quick Add”) with the custom WebGL-powered `SpecularButton` component.
- Configure it with luxury styling defaults: `baseColor="#525252"`, `followMouse={true}`, `glow={1}`, `idleIntensity={0.35}`, `intensity={1}`, `lineColor="#ffffff"`, `proximity={250}`, `radius={18}`, `shineFade={34}`, `shineSize={10}`, `size="lg"`, `textColor="#f5f5f5"`, `thickness={1.2}`, `tint="#ffffff"`, and `tintOpacity={0.04}`.
- Ensure all click handlers, form submissions, and cart/checkout triggers are fully wired.

## 12. Homepage-only OGL FlexCarousel — COMPLETE

- Completely remove any legacy circular/static carousels or product grids from the top section and replace them with the WebGL-powered `FlexCarousel` component (requires `ogl`).
- Populate carousel items dynamically from the product database using luxury leather product photography, titles, and categories.
- Configure with the `"liquid"` preset; captions true; cardHeight 0.5; focusOnClick true; gap 12; intro `"rise"`; dynamic `items={productCarouselItems}`; `onSelect={(index, item) => navigateToProduct(item.id)}`; and squeeze 0.2.
- `FlexCarousel` must appear exclusively on the root landing page (`/` or `HomePage.jsx`) and nowhere else in the application (no carousels on Catalog, PDP, Cart, or Checkout views).
- Integrate `FlexCarousel.jsx`, `FlexCarousel.css`, and the OGL dependency while retaining `FoldText` and the already site-wide `SpecularButton` component.

## 13. Homepage sequence and non-carousel catalog — COMPLETE

- Homepage layout sequence: Hero Banner featuring `<FoldText />`; first section is the `FlexCarousel` showcase; second section immediately below it is the static Category Grid (“Made for the well-worn path” featuring Belts, Kids Wear, Jackets, Purses & Handbags, Shoes, Wallets, and Women’s Wear); then the Footer with trust badges and links.
- Keep FlexCarousel dynamic product imagery, titles, categories, click/focus selection and product-detail routing working.
- Ensure the catalog, product detail page, cart, and checkout contain no carousel; keep the catalog products browsable in its responsive product grid and preserve its current filters, sorting, View Details and Quick Add behavior.
- Ensure buttons integrated within the homepage carousel and category sections use the custom WebGL-powered `SpecularButton` component, and routing/props keep both homepage sections rendering in the exact sequence.
