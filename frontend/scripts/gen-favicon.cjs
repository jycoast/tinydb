const path = require("path");
const fs = require("fs");
const pngToIco = require("png-to-ico");

const assetsDir = path.join(__dirname, "../dist/assets");
const outPath = path.join(__dirname, "../public/favicon.ico");

const files = fs.existsSync(assetsDir) ? fs.readdirSync(assetsDir) : [];
const logoFile = files.find((f) => f.startsWith("logo.") && f.endsWith(".png"));
const logoPath = logoFile ? path.join(assetsDir, logoFile) : path.join(assetsDir, "logo.5b7cc99e.png");

if (!fs.existsSync(logoPath)) {
  console.error("Logo not found. Run 'npm run build' first or put logo.png in dist/assets.");
  process.exit(1);
}

pngToIco(logoPath)
  .then((buf) => {
    fs.writeFileSync(outPath, buf);
    console.log("Written:", outPath);
  })
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
