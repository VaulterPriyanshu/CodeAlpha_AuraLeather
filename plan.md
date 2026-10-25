# Aura Leather Co. — implementation plan

## Product and architecture

Build the responsive, multi-page storefront using Node.js + Express for the API and static-file server, HTML/CSS for page structure and styling, and Vanilla JavaScript feature modules using `fetch` for existing interactions. Use Prisma with SQLite and repeatable, realistic categories/products. Preserve existing registered users, hashed passwords, roles, products, stock, carts, orders, order items, reviews and newsletter behavior. Order creation continues to record price-at-purchase and decrement inventory transactionally.

Email/password registration and login remain application-owned. Keep bcrypt-compatible password hashing, server-side JWT validation, role middleware, and the existing HttpOnly, Secure, SameSite=None cookie for HTTPS Preview. Admin-only product create/update/delete and shopper profile/cart/orders remain unchanged. Guest cart merge and simulated-payment checkout continue to use the established API and safe stock validation.

Keep the existing Express/HTML/Vanilla JS host architecture. Add React and ReactDOM only as a small component runtime, GSAP for FoldText, and esbuild to bundle motion components into a committed static browser bundle under `public/js/`. The bundle mounts React micro-islands into existing page elements; it does not replace the page shell or rewrite authentication, API, cart, or checkout flows. The REST APIs, database schema, page routes and static route manifest remain unchanged.

## Pages and project structure

- `server.js`: Express startup, JSON/cookie middleware, API route registration, static hosting, friendly page routes and health response.
- `config/db.js`, `prisma/schema.prisma`, `prisma/seed.js`: Prisma client, relational data models and repeatable SQLite seed data.
- `models/`: generated Prisma model delegates used by controller modules.
- `routes/`, `controllers/`, `middleware/`: modular auth, product/category, cart, checkout/orders, review/newsletter, admin endpoints, JWT roles and request guards.
- `public/`: existing HTML pages, shared CSS, API-connected vanilla modules, static route manifest and images.
- `src/motion/`: React micro-islands for FoldText and the all-site SpecularButton mount; a pnpm build script emits `public/js/ui-motion.bundle.js` via esbuild. The shared page loader serves the bundle alongside the existing Vanilla JS modules.
- `src/components/FlexCarousel.jsx`, `src/components/FlexCarousel.css`: the OGL 1.0.11-powered React Bits FlexCarousel with liquid glass shader, dynamic product imagery, category subtitles, intro/focus/select behavior and homepage-only mount. esbuild bundles OGL into the existing browser motion bundle.
- `src/components/SpecularButton.jsx`, `src/components/SpecularButton.css`: reusable defaults, standalone accessible React button API, and one shared WebGL2 renderer that decorates all existing native button-like controls without replacing their native form/click behavior. The build copies its stylesheet to `public/css/specular-button.css`.
- `seeds/seedData.js`: reusable mock products/categories for shoes, jackets, purses/handbags, wallets, belts, women’s wear and children’s wear.

The homepage retains navigation/search/account/cart controls, the exact hero headline and Shop Now CTA, seven category tiles, trust statements, newsletter and service/policy footer. Its exact sequence is hero with FoldText, then the featured-products OGL FlexCarousel, then the “Made for the well-worn path” static category grid. The homepage carousel alone consumes the existing featured-products API and uses the `liquid` preset, `captions`, `cardHeight={0.5}`, `focusOnClick`, `gap={12}`, `intro="rise"`, `squeeze={0.2}`, dynamic product `items`, and `onSelect` navigation to the selected product detail route. It is never mounted on `/shop`, PDP, cart or checkout. The shop retains category, audience and price filters plus low/high price, popularity and newest sorting; its filtered/sorted API results render in a responsive product-card grid with View Details links and working Quick Add through the existing `AuraStore` cart helper. Product detail, cart, checkout, account and admin data contracts and actions remain unchanged.

## Motion component specifications

`FoldText` is a reusable React component for priority hero and section headings. It splits the words into characters and uses the paper-fold style, top hinge, GSAP `power3.out` easing, a subtle per-character stagger and custom 3D perspective. It preserves heading semantics and readable accessible text and honors `prefers-reduced-motion`.

`SpecularButton` is a reusable React component in `src/components/SpecularButton.jsx` with companion `SpecularButton.css`. Enhance every native `<button>`, button-style `.button` link and button-like input across the site with a shared WebGL2 fragment-shader overlay, using one page-level WebGL context to avoid exhausting browser context limits. Preserve each element’s existing text, form submission, native disabled behavior, click listeners and navigation; overlay and canvas must never capture pointer input. Apply the requested defaults: `baseColor="#525252"`, `followMouse={true}`, `glow={1}`, `idleIntensity={0.35}`, `intensity={1}`, `lineColor="#ffffff"`, `proximity={250}`, `radius={18}`, `shineFade={34}`, `shineSize={10}`, `size="lg"`, `textColor="#f5f5f5"`, `thickness={1.2}`, `tint="#ffffff"`, and `tintOpacity={0.04}`. Use `sm`, `md`, and `lg` sizes for compact controls, preserve responsive sizing, and render a graceful CSS fallback where WebGL2 is unavailable.

`FlexCarousel` is a React component in `src/components/FlexCarousel.jsx` with `src/components/FlexCarousel.css`, based on React Bits' OGL WebGL implementation (upstream source: `https://github.com/DavidHDev/react-bits/tree/main/src/content/Components/FlexCarousel`; component dependency OGL, MIT + Commons Clause). It accepts dynamic `src`, `alt`, `title`, `subtitle` item records from the featured-products endpoint; the subtitle is the category. The root page passes `preset="liquid"`, `captions={true}`, `cardHeight={0.5}`, `focusOnClick={true}`, `gap={12}`, `intro="rise"`, `squeeze={0.2}`, and `onSelect={(index, item) => navigateToProduct(item.id)}`. Keep the component unmounted outside `/`; maintain working loading/empty/error states, selection navigation and reduced-motion/accessibility behavior. The previous CircularCarousel is removed rather than retained as a second option.

`SpecularButton` remains site-wide for every button and button-styled control, with its requested luxury shader defaults, working existing submit/click/navigation/cart handlers, disabled behavior and `sm`/`md`/`lg` sizing. `FoldText` remains active for the homepage hero and category headings.

## Visual direction

- **Design Movement:** Modern leather atelier meets restrained editorial luxury, using the requested dark/warm-brown palette.
- **Core Principles:** tactile materials; generous editorial whitespace; quiet, credible craftsmanship; clear shopping affordances.
- **Color Philosophy:** oxblood-dark `#2C1A1D` anchors the brand, saddle brown `#8B5A2B` adds warmth, tan `#D2B48C` suggests leather patina, and ivory `#F5F5DC` keeps product photography and text legible. A muted brass accent may be used sparingly for highlights.
- **Layout Paradigm:** asymmetric editorial hero with copy and product still-life in opposing columns, followed by the liquid-glass FlexCarousel and a distinct category gallery; the catalog uses a responsive product grid for direct comparison.
- **Signature Elements:** fine saddle-stitch rules; softly framed leather-grain panels; small maker-stamp labels and restrained brass separators.
- **Interaction Philosophy:** immediate cart feedback, clear selection/stock state, gentle motion and checkout totals that remain transparent.
- **Animation:** paper-like character folds on priority headings, restrained specular edge glints on all buttons, and the homepage-only liquid-glass FlexCarousel entrance/drag/focus motion; honor reduced-motion and avoid motion that obscures product details.
- **Typography System:** refined high-contrast serif display faces for editorial headings paired with a neutral sans-serif for product data, navigation and controls; establish a deliberate display/body/eyebrow scale.
- **Brand Essence:** thoughtfully crafted leather essentials for people and families who value durable materials and enduring design; **considered, warm, enduring**.
- **Brand Voice:** concise, tactile and assured. Example lines: “Handcrafted Elegance in Pure Leather.” “Made slowly. Carried for years.”
- **Wordmark & Logo:** compact “AL” maker's stamp inside a fine rounded-rectangle leather label, paired with a custom-spaced Aura Leather Co. wordmark in the UI.
- **Signature Brand Color:** deep oxblood `#2C1A1D`, balanced by patinated saddle and ivory.

For site imagery, retain the original text-safe artisan-workshop/hero still-life and distinct product/category photography. Keep asset paths stable.

## Build and delivery scope

Keep the initialized Express runtime on port 3000 and public paths relative. Use the pinned pnpm toolchain, retain reviewed lifecycle permissions, preserve registered JavaScript/HTML/CSS/JSON diagnostics, and verify existing page routes/route manifest remain synchronized. Build and serve the static React motion bundle as part of the existing site; do not introduce another listener. Keep the site in Preview and checkpoint code changes to canonical `main`; do not publish unless separately requested. SQLite is the selected development-friendly database; multiple production instances need a durable shared database plan before launch.
