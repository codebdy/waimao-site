// Old address → new address, answered with a permanent 301 by the hosting platform (not by a page).
// Key: old path, lowercase, starting with "/", without trailing slash (both spellings are redirected).
// Value: the final same-site page path with trailing slash (must be a page this build generates; checked at build),
// matching canonical and sitemap; never another old key (one hop only).
// For other languages add the prefixed paths explicitly, e.g. '/de/old-page': '/de/products/new-page/'.
// After editing run `npm run configure:redirects` and commit the generated public/_redirects and vercel.json.
export default {
  // '/old-product.html': '/products/new-product/',
};
