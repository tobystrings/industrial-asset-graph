// Use the bundled static asset instead of rebuilding a very large base64 data URI at runtime.
// Keeping the image as a normal Vite/GitHub Pages asset is more reliable across browsers and
// avoids blank-map failures caused by oversized/invalid concatenated data URIs.
const buildingLayoutImage = '/industrial-asset-graph/assets/labeled-building-layout.png';

export default buildingLayoutImage;
