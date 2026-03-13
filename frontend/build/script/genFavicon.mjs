/**
 * 从 logo.png 生成 public/favicon.ico（先缩放到 256 再转 ico）
 * 运行: node build/script/genFavicon.mjs
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import Jimp from "jimp";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "../..");
const logoPath = path.join(root, "src/assets/images/logo.png");
const outPath = path.join(root, "public/favicon.ico");

const toIco = (await import("to-ico")).default;
const img = await Jimp.read(logoPath);
await img.resize(256, 256);
const resized = await img.getBufferAsync(Jimp.MIME_PNG);
const buf = await toIco(resized);
fs.writeFileSync(outPath, buf);
console.log("favicon.ico 已生成: public/favicon.ico");
