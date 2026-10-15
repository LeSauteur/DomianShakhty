const projectPath = /^construction\/projects\/[a-z0-9-]+\.html$/u;
const esc = value => String(value).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");

export function validateLegacyRedirects(entries, canonicalFiles, projects) {
  if (!Array.isArray(entries)) throw new Error("Legacy redirects must be an array");
  const canonical = new Set(canonicalFiles);
  const byId = new Map(projects.map(project => [project.id, project]));
  const byPath = new Map();
  for (const entry of entries) {
    if (!projectPath.test(entry.from || "")) throw new Error(`Invalid legacy project path: ${entry.from}`);
    if (!projectPath.test(entry.to || "") && entry.to !== "construction.html") throw new Error(`Invalid redirect target: ${entry.to}`);
    if (byPath.has(entry.from)) throw new Error(`Duplicate legacy path: ${entry.from}`);
    if (canonical.has(entry.from)) throw new Error(`Legacy redirect would replace a canonical page: ${entry.from}`);
    if (!canonical.has(entry.to)) throw new Error(`Redirect target is not a canonical generated page: ${entry.to}`);
    if (entry.to === "construction.html") {
      if (entry.projectId || !entry.fallbackReason?.trim()) throw new Error(`Catalog fallback needs an explicit reason: ${entry.from}`);
    } else {
      const project = byId.get(entry.projectId);
      if (!project || entry.to !== `construction/projects/${project.slug}.html`) throw new Error(`Redirect does not match project identity: ${entry.from}`);
    }
    byPath.set(entry.from, entry);
  }
  return byPath;
}

export function renderLegacyRedirect(ctx, entry) {
  const target = esc(ctx.absolute(entry.to));
  const destination = esc(ctx.href(entry.to));
  return `<!doctype html><html lang="ru"><head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta http-equiv="refresh" content="0; url=${destination}">
<link rel="canonical" href="${target}">
<meta name="robots" content="index,follow">
<title>У проекта дома новый адрес | Домиан Шахты</title>
<meta name="description" content="Страница проекта дома переехала. Перейдите по ссылке, чтобы посмотреть актуальное описание, характеристики и фотографии проекта.">
<style>body{margin:0;background:#f7f9f7;color:#29383a;font:18px/1.6 system-ui,sans-serif}main{max-width:42rem;margin:12vh auto;padding:24px}a{color:inherit;overflow-wrap:anywhere}h1{font-size:clamp(1.6rem,5vw,2.4rem);line-height:1.2}</style>
</head><body><main><h1>У проекта дома новый адрес</h1><p><a href="${destination}">Открыть страницу проекта</a></p></main></body></html>\n`;
}
