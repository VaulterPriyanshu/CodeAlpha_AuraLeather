# Image asset sources

The downloadable project bundles all images required by the storefront under `public/assets/`, so the catalog does not depend on an external image CDN at runtime.

## Bundled assets

- `public/assets/hero-leather-workshop.png` — deterministic crop of the user-supplied leather workshop reference image, used as the landing-page hero background.
- `public/assets/catalog/01-1521334884684-d80222895322.jpg` — catalog image originally sourced from Unsplash photo `1521334884684-d80222895322`.
- `public/assets/catalog/02-1548036328-c9fa89d128fa.jpg` — catalog image originally sourced from Unsplash photo `1548036328-c9fa89d128fa`.
- `public/assets/catalog/03-1551488831-00ddcb6c6bd3.jpg` — catalog image originally sourced from Unsplash photo `1551488831-00ddcb6c6bd3`.
- `public/assets/catalog/04-1553062407-98eeb64c6a62.jpg` — catalog image originally sourced from Unsplash photo `1553062407-98eeb64c6a62`.
- `public/assets/catalog/05-1559563458-527698bf5295.jpg` — catalog image originally sourced from Unsplash photo `1559563458-527698bf5295`.
- `public/assets/catalog/06-1594223274512-ad4803739b7c.jpg` — catalog image originally sourced from Unsplash photo `1594223274512-ad4803739b7c`.
- `public/assets/catalog/07-1608256246200-53e635b5b65f.jpg` — catalog image originally sourced from Unsplash photo `1608256246200-53e635b5b65f`.

The original Unsplash CDN URLs were used to obtain the images, then the image files were saved locally and all seed/client fallbacks were changed to `/assets/catalog/...` paths for offline-friendly local execution. Please review the original Unsplash license and creator terms before redistributing the images publicly.
