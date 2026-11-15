// Static site generator for the personal website. No dependencies: Node 18 or later.
//
// Reads content/*.json and writes plain HTML into _site/ (or $OUT_DIR).
// Every internal link and asset reference is checked before the build succeeds.
// All links are relative, so the site works at https://USER.github.io/ and at
// https://USER.github.io/REPO/ without changes.

import { readFile, writeFile, mkdir, rm, cp } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(ROOT, process.env.OUT_DIR || "_site");

const load = async (name) =>
  JSON.parse(await readFile(path.join(ROOT, "content", name), "utf8"));

const site = await load("site.json");
const about = await load("about.json");
const research = await load("research.json");
const projects = await load("projects.json");
const tutoring = await load("tutoring.json");

// The CV button, photo and social image appear only when their files exist.
const cvAvailable = existsSync(path.join(ROOT, site.cv.file));
const photoAvailable = existsSync(path.join(ROOT, site.photo.file));
const customDomainFile = site.customDomain ? `${site.customDomain}\n` : null;
const socialImageAvailable = existsSync(path.join(ROOT, "assets", "social-card.png"));
const year = new Date().getFullYear();

// ---------- helpers ----------

const esc = (s) =>
  String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

// Escape text, then highlight any [TBC: ...] marker so unfinished content is visible.
const t = (s) => esc(s).replace(/\[TBC:[^\]]*\]/g, (m) => `<span class="tbc">${m}</span>`);
const isTBC = (v) => typeof v === "string" && v.startsWith("[TBC");
const ul = (items) => `<ul>${items.map((i) => `<li>${t(i)}</li>`).join("")}</ul>`;

// A list item for a contact link. Skipped when the URL is null, shown as a placeholder when TBC.
const contactItem = (label, url, text) => {
  if (!url) return "";
  if (isTBC(url)) return `<li><span>${esc(label)}</span> ${t(url)}</li>`;
  return `<li><span>${esc(label)}</span> <a href="${esc(url)}" rel="me">${esc(text || url)}</a></li>`;
};

const cvButton = (cls = "button") =>
  cvAvailable
    ? `<a class="${cls}" href="{{ROOT}}${esc(site.cv.file)}">${esc(site.cv.label)}</a>`
    : "";

const portrait = () =>
  photoAvailable
    ? `<img class="portrait" src="{{ROOT}}${esc(site.photo.file)}" alt="${esc(site.photo.alt)}" width="144" height="144">`
    : `<div class="portrait portrait-empty" role="img" aria-label="Photo to be added"><span class="tbc">[TBC: photo]</span></div>`;

const navItems = [
  ["projects", "projects/index.html", "Projects"],
  ["research", "research.html", "Research"],
  ["about", "about.html", "About"],
  ["tutoring", "tutoring.html", "Tutoring"],
  ["contact", "contact.html", "Contact"],
];

// ---------- page layout ----------

function layout({ root, file, title, description, current, body, ogType = "website" }) {
  const canonical = new URL(file, site.siteUrl).href;
  const image = socialImageAvailable ? new URL("assets/social-card.png", site.siteUrl).href : null;
  const nav = navItems
    .map(
      ([key, href, label]) =>
        `<li><a href="${root}${href}"${current === key ? ' aria-current="page"' : ""}>${label}</a></li>`,
    )
    .join("");

  return `<!doctype html>
<html lang="en-GB">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}">
<link rel="canonical" href="${canonical}">
<link rel="icon" href="${root}assets/favicon.svg" type="image/svg+xml">
<link rel="stylesheet" href="${root}assets/site.css">
<meta property="og:type" content="${ogType}">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(description)}">
<meta property="og:url" content="${canonical}">
<meta property="og:site_name" content="${esc(site.fullName)}">
${image ? `<meta property="og:image" content="${image}">\n` : ""}<meta name="twitter:card" content="${image ? "summary_large_image" : "summary"}">
</head>
<body>
<a class="skip-link" href="#main">Skip to content</a>
<header class="site-header">
  <div class="wrap header-inner">
    <a class="site-name" href="${root}index.html">${esc(site.name)}</a>
    <nav aria-label="Main">
      <ul>${nav}</ul>
    </nav>
  </div>
</header>
<main id="main" class="wrap">
${body.replaceAll("{{ROOT}}", root)}
</main>
<footer class="site-footer">
  <div class="wrap">
    <p>&copy; ${year} ${esc(site.fullName)}. Built as a static site with no analytics or tracking.</p>
  </div>
</footer>
</body>
</html>
`;
}

// ---------- components ----------

function projectCard(p, base) {
  const meta = [p.context, p.period].filter(Boolean).map((v) => t(v));
  if (p.status) meta.push(`<span class="tag">${t(p.status)}</span>`);
  return `<article class="card">
  <h3><a href="${base}${esc(p.slug)}.html">${t(p.title)}</a></h3>
  ${meta.length ? `<p class="meta">${meta.join(" &middot; ")}</p>` : ""}
  <p>${t(p.summary)}</p>
</article>`;
}

function researchBlock(item) {
  // Optional parts are left out when empty, so unpublished detail never shows as a placeholder.
  return `
  <h3>${t(item.title)}</h3>
  <p class="meta">${t(item.status)}</p>
  <p>${t(item.summary)}</p>
  ${item.accessible ? `<h4>In plain language</h4>\n  <p>${t(item.accessible)}</p>` : ""}
  ${item.technical ? `<h4>Technical summary</h4>\n  <p>${t(item.technical)}</p>` : ""}`;
}

function homePage() {
  // The home page features the projects marked "featured" in content/projects.json.
  const featured = projects.filter((p) => p.featured).slice(0, 3);
  const body = `
<section class="intro">
  <div class="intro-head">
    ${portrait()}
    <div>
      <h1>${esc(site.fullName)}</h1>
      <p class="lede">${t(site.tagline)}</p>
    </div>
  </div>
  <p>${t(site.intro.summary)}</p>
  <p>${t(site.intro.seeking)} ${t(site.intro.rightToWork)}</p>
  <p class="actions">
    <a class="button" href="{{ROOT}}projects/index.html">View projects</a>
    ${cvButton("button button-quiet")}
    <a class="button button-quiet" href="{{ROOT}}contact.html">Contact</a>
  </p>
</section>

<section aria-labelledby="featured-heading">
  <h2 id="featured-heading">Selected projects</h2>
  ${featured.map((p) => projectCard(p, "projects/")).join("\n  ")}
  <p><a href="{{ROOT}}projects/index.html">All projects</a></p>
</section>

<section aria-labelledby="research-heading">
  <h2 id="research-heading">Research</h2>
  <p>${t(research.current.summary)}</p>
  <p><a href="{{ROOT}}research.html">Research and publications</a></p>
</section>

<section aria-labelledby="education-heading">
  <h2 id="education-heading">Education</h2>
  <ul>
    <li>${t(site.education.phd)}</li>
    <li>${t(site.education.cdt)}</li>
    <li>${t(site.education.mmath)}</li>
  </ul>
  <h3>Notable module grades</h3>
  ${ul(site.education.grades)}
</section>`;
  return layout({
    root: "",
    file: "index.html",
    title: `${site.fullName} | ${site.tagline}`,
    description: site.description,
    current: "home",
    body,
  });
}

function projectsIndexPage() {
  const body = `
<h1>Projects</h1>
<p class="lede">Selected projects in time series, stochastic modelling and applied statistics. Each entry sets out the problem, approach and results, where these can be shared.</p>
${projects.map((p) => projectCard(p, "")).join("\n")}`;
  return layout({
    root: "../",
    file: "projects/index.html",
    title: `Projects | ${site.name}`,
    description: "Selected projects in time series, stochastic modelling and applied statistics, by Ben Holland Young.",
    current: "projects",
    body,
  });
}

function projectPage(p) {
  // Only sections with content are shown, so bare-bones entries stay tidy.
  const linkLabels = { code: "Source code", report: "Report", demo: "Demo", website: "Website" };
  const links = Object.entries(linkLabels)
    .filter(([key]) => p.links && p.links[key])
    .map(([key, label]) => {
      const url = p.links[key];
      return isTBC(url)
        ? `<li>${esc(label)}: ${t(url)}</li>`
        : `<li><a href="${esc(url)}">${esc(label)}</a></li>`;
    });
  const linksInner = [
    links.length ? `<ul>${links.join("")}</ul>` : "",
    p.confidentialNote ? `<p class="meta">${t(p.confidentialNote)}</p>` : "",
  ].join("");
  const facts = [["Status", p.status], ["Period", p.period], ["Context", p.context]].filter(([, v]) => v);
  const section = (id, heading, inner) =>
    `\n  <section aria-labelledby="${id}-heading">\n    <h2 id="${id}-heading">${heading}</h2>\n    ${inner}\n  </section>`;

  const body = `
<nav class="breadcrumb" aria-label="Breadcrumb"><a href="index.html">Projects</a></nav>
<article>
  <h1>${t(p.title)}</h1>
  ${facts.length ? `<dl class="facts">${facts.map(([k, v]) => `<dt>${k}</dt><dd>${t(v)}</dd>`).join("")}</dl>` : ""}
  <p class="lede">${t(p.summary)}</p>
  ${p.problem ? section("problem", "Problem", `<p>${t(p.problem)}</p>`) : ""}
  ${p.approach?.length ? section("approach", "Approach", ul(p.approach)) : ""}
  ${p.tools?.length ? section("tools", "Tools", `<p>${p.tools.map((x) => t(x)).join(", ")}</p>`) : ""}
  ${p.results?.length ? section("results", "Results", ul(p.results)) : ""}
  ${p.limitations?.length ? section("limitations", "Limitations", ul(p.limitations)) : ""}
  ${linksInner ? section("links", "Links", linksInner) : ""}
</article>`;
  return layout({
    root: "../",
    file: `projects/${p.slug}.html`,
    title: `${p.title} | ${site.name}`,
    description: p.summary,
    current: "projects",
    body,
  });
}

function researchPage() {
  const publications = research.publications
    .map(
      (p) => `<li>
    <span class="pub-title">${t(p.title)}</span><br>
    ${t(p.authors)}. ${t(p.venue)}. <span class="tag">${t(p.status)}</span>${
      p.link && !isTBC(p.link) ? ` <a href="${esc(p.link)}">Paper</a>` : ""
    }
  </li>`,
    )
    .join("\n");
  const body = `
<h1>Research</h1>
<p class="lede">${t(research.intro)}</p>

<section aria-labelledby="current-heading">
  <h2 id="current-heading">Current research</h2>
  ${researchBlock(research.current)}
</section>

<section aria-labelledby="background-heading">
  <h2 id="background-heading">Background: percolation and branching processes</h2>
  ${researchBlock(research.background)}
</section>

${research.publications.length ? `<section aria-labelledby="publications-heading">
  <h2 id="publications-heading">Publications</h2>
  <ul class="pubs">
  ${publications}
  </ul>
</section>` : ""}

${research.talks.length ? `<section aria-labelledby="talks-heading">
  <h2 id="talks-heading">Talks and posters</h2>
  ${ul(research.talks)}
</section>` : ""}`;
  return layout({
    root: "",
    file: "research.html",
    title: `Research | ${site.name}`,
    description: "PhD research on statistical tools for non-stationary time series, with background in percolation and branching processes, and publications.",
    current: "research",
    body,
  });
}

function aboutPage() {
  const experience = about.experience
    .map(
      (e) => `<li>
    <p><strong>${t(e.role)}</strong>, ${t(e.organisation)} <span class="meta">${t(e.period)}</span></p>
    <p>${t(e.details)}</p>
  </li>`,
    )
    .join("\n");
  const skills = Object.entries(about.skills)
    .map(([k, v]) => `<dt>${esc(k)}</dt><dd>${t(v)}</dd>`)
    .join("\n    ");
  const body = `
<h1>About</h1>
<p class="actions" style="margin-top:0">${cvButton()}</p>

<section aria-labelledby="background-heading">
  <h2 id="background-heading">Academic background</h2>
  ${ul(about.background)}
  <p>${t(about.cdt)}</p>
</section>

<section aria-labelledby="projects-heading">
  <h2 id="projects-heading">Work with partners</h2>
  <p>${t(about.partnerProjects)}</p>
</section>

<section aria-labelledby="experience-heading">
  <h2 id="experience-heading">Teaching and experience</h2>
  <ul class="timeline">
  ${experience}
  </ul>
</section>

<section aria-labelledby="skills-heading">
  <h2 id="skills-heading">Technical skills</h2>
  <dl class="skills">
    ${skills}
  </dl>
  <p><strong>Languages:</strong> ${t(about.languages)}</p>
</section>

<section aria-labelledby="events-heading">
  <h2 id="events-heading">Other activities</h2>
  ${ul(about.events)}
</section>`;
  return layout({
    root: "",
    file: "about.html",
    title: `About | ${site.name}`,
    description: "Academic background, partner projects, teaching and technical skills of Ben Holland Young.",
    current: "about",
    body,
  });
}

function tutoringPage() {
  const levels = ul(tutoring.levels);
  const body = `
<h1>Tutoring</h1>
<p class="lede">${t(tutoring.intro)}</p>

<section aria-labelledby="levels-heading">
  <h2 id="levels-heading">What I teach</h2>
  ${levels}
</section>

<section aria-labelledby="terms-heading">
  <h2 id="terms-heading">Format and rates</h2>
  <dl class="skills">
    <dt>Format</dt><dd>${t(tutoring.format)}</dd>
    <dt>Rates</dt><dd>${ul(tutoring.rates)}</dd>
  </dl>
</section>

<section aria-labelledby="enquire-heading">
  <h2 id="enquire-heading">Get in touch</h2>
  <p>${t(tutoring.contactNote)}</p>
  <p class="tutor-email"><a href="mailto:${esc(tutoring.email)}">${esc(tutoring.email)}</a></p>
</section>`;
  return layout({
    root: "",
    file: "tutoring.html",
    title: `Tutoring | ${site.name}`,
    description: "One-to-one mathematics tuition for IGCSE, GCSE, A-level, International A-level and TMUA preparation, by Ben Holland Young.",
    current: "tutoring",
    body,
  });
}

function contactPage() {
  const body = `
<h1>Contact</h1>
<p class="lede">I am looking for quantitative research and machine learning internships. Email is the quickest way to reach me.</p>

<section>
  <ul class="contact-list">
    <li><span>Email</span> <a href="mailto:${esc(site.email)}">${esc(site.email)}</a></li>
    <li><span>Tutoring</span> <a href="{{ROOT}}tutoring.html">Tutoring enquiries</a></li>
    ${contactItem("LinkedIn", site.linkedin, "linkedin.com/in/benhollandyoung")}
    ${contactItem("GitHub", site.github, "github.com/benhollandyoung")}
    ${contactItem("Google Scholar", site.scholar)}
    ${contactItem("ORCID", site.orcid)}
  </ul>
  <p class="actions">${cvButton()}</p>
  <p class="meta">${t(site.intro.rightToWork)}</p>
</section>`;
  return layout({
    root: "",
    file: "contact.html",
    title: `Contact | ${site.name}`,
    description: "Contact Ben Holland Young about quantitative research and machine learning internships.",
    current: "contact",
    body,
  });
}

// ---------- build ----------

const pages = [
  { file: "index.html", html: homePage() },
  { file: "projects/index.html", html: projectsIndexPage() },
  { file: "research.html", html: researchPage() },
  { file: "about.html", html: aboutPage() },
  { file: "tutoring.html", html: tutoringPage() },
  { file: "contact.html", html: contactPage() },
  ...projects.map((p) => ({ file: `projects/${p.slug}.html`, html: projectPage(p) })),
];

// Fail fast on duplicate slugs, which would silently overwrite a page.
const slugs = projects.map((p) => p.slug);
const dupes = slugs.filter((s, i) => slugs.indexOf(s) !== i);
if (dupes.length) throw new Error(`Duplicate project slugs: ${dupes.join(", ")}`);

await rm(OUT, { recursive: true, force: true });
await mkdir(path.join(OUT, "projects"), { recursive: true });
await cp(path.join(ROOT, "assets"), path.join(OUT, "assets"), {
  recursive: true,
  filter: (src) => !path.basename(src).startsWith("."),
});
// GitHub Pages reads CNAME from the published site to keep the custom domain.
if (customDomainFile) await writeFile(path.join(OUT, "CNAME"), customDomainFile, "utf8");
for (const page of pages) {
  await writeFile(path.join(OUT, page.file), page.html, "utf8");
}
await writeFile(path.join(OUT, ".nojekyll"), "", "utf8");

// ---------- internal link check ----------

const problems = [];
for (const page of pages) {
  const dir = path.dirname(path.join(OUT, page.file));
  for (const m of page.html.matchAll(/\b(?:href|src)="([^"]+)"/g)) {
    const target = m[1];
    if (/^(https?:|mailto:|tel:|#)/.test(target)) continue;
    const clean = decodeURIComponent(target.split("#")[0].split("?")[0]);
    const resolved = path.resolve(dir, clean);
    if (!resolved.startsWith(OUT) || !existsSync(resolved)) {
      problems.push(`${page.file} -> ${target}`);
    }
  }
}
if (problems.length) {
  console.error("Broken internal links or missing assets:\n  " + problems.join("\n  "));
  process.exit(1);
}

console.log(
  `Built ${pages.length} pages into ${path.relative(ROOT, OUT)}/. CV button: ${
    cvAvailable ? "shown" : "hidden (file missing)"
  }. Photo: ${photoAvailable ? "included" : "placeholder (add assets/photo.jpg)"}. Custom domain: ${site.customDomain || "none"}. Social image: ${socialImageAvailable ? "included" : "not included"}.`,
);
