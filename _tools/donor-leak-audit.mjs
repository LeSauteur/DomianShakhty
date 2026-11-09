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

// Dmitry's verified service area includes Novocherkassk.
const approvedCity = "Новочеркасск";
const approvedHeroFact = "Шахты, Новочеркасск и окрестности до 30 км";

function sourceForDonorCheck(file, source) {
  if (file === "src/data/team.json" || file === "dist/assets/data/team.json") {
    const people = JSON.parse(source);
    const dmitry = people.find((person) => person.id === "dmitry-shevchenko" && person.verified === true);
    if (!dmitry) return source;
    dmitry.serviceAreas = dmitry.serviceAreas?.filter((area) => area !== approvedCity);
    dmitry.heroFacts = dmitry.heroFacts?.filter((fact) => fact !== approvedHeroFact);
    return JSON.stringify(people);
  }
  if (file === "dist/team/dmitry-shevchenko.html") {
    return source.replace(`<li>${approvedCity}</li>`, "").replace(`<li>${approvedHeroFact}</li>`, "");
  }
  return source;
}

function scan(target) {
  if (!fs.existsSync(target)) return;
  const stat = fs.statSync(target);
  if (stat.isDirectory()) {
    for (const name of fs.readdirSync(target)) scan(path.join(target, name));
    return;
  }
  if (ignored.has(path.basename(target)) || /\.(?:png|jpe?g|webp|ico)$/iu.test(target)) return;
  const file = path.relative(process.cwd(), target).split(path.sep).join("/");
  const source = sourceForDonorCheck(file, fs.readFileSync(target, "utf8"));
  forbidden.forEach((pattern) => {
    pattern.lastIndex = 0;
    if (pattern.test(source)) failures.push(`${file} matches ${pattern}`);
  });
}

roots.forEach(scan);
if (failures.length) {
  console.error(`Donor-leak audit failed:\n- ${failures.join("\n- ")}`);
  process.exit(1);
}
console.log("Donor-leak audit passed: no unapproved donor references reached public source/output.");
