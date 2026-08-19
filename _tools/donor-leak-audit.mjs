import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const roots = ["assets", "src", "scripts", "tests", "dist"];
const ignored = new Set(["RESEARCH_SHAKHTY.md", "RESEARCH_BUILDERS.md"]);
const forbidden = [
  /DomianKvartal/giu,
  /DomianNov/giu,
  /Malinovskogo/giu,
  /domian-nov/giu,
  /домиа?н\s+квартал/giu,
  /малиновского/giu,
  /ульяновск/giu,
  /новочеркасск/giu
];
const failures = [];

function scan(target) {
  if (!fs.existsSync(target)) return;
  const stat = fs.statSync(target);
  if (stat.isDirectory()) {
    for (const name of fs.readdirSync(target)) scan(path.join(target, name));
    return;
  }
  if (ignored.has(path.basename(target)) || /\.(?:png|jpe?g|webp|ico)$/iu.test(target)) return;
  const source = fs.readFileSync(target, "utf8");
  forbidden.forEach((pattern) => {
    pattern.lastIndex = 0;
    if (pattern.test(source)) failures.push(`${path.relative(process.cwd(), target)} matches ${pattern}`);
  });
}

roots.forEach(scan);
if (failures.length) {
  console.error(`Donor-leak audit failed:\n- ${failures.join("\n- ")}`);
  process.exit(1);
}
console.log("Donor-leak audit passed: no donor brands, cities or project names reached public source/output.");
