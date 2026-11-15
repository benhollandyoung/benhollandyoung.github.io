# Benjamin Holland Young: personal website

A static academic portfolio for GitHub Pages. It has no backend, no analytics and no runtime dependencies. The only tool is Node.js, which generates the HTML from the content files.

## Structure

```
content/            Editable content (JSON). Change text here, not in the layout.
  site.json         Name, contact details, links, introduction, CV settings
  about.json        Academic background, experience, skills
  research.json     Current research, background, publications, talks (hidden while the talks list is empty)
  projects.json     One entry per project (drives the project pages)
assets/             Stylesheet, favicon, CV PDF, optional social card
scripts/build.mjs   Generates HTML into _site/ and checks every internal link
scripts/preview.mjs Local preview server
.github/workflows/pages.yml  Builds and deploys to GitHub Pages
```

Pages produced: `index.html` (home), `projects/index.html`, `projects/<slug>.html` (one per project), `research.html`, `about.html`, `contact.html`.

## Preview locally

Requires Node.js 18 or later.

```sh
npm run build      # generates _site/ and checks links
npm run preview    # serves http://localhost:8000/
```

To check the project-site path (`USER.github.io/REPO/`):

```sh
PREVIEW_BASE=/REPO npm run preview   # serves http://localhost:8000/REPO/
```

Every link in the site is relative, so the same build works at both `USER.github.io/` and `USER.github.io/REPO/`.

## Editing content

Edit the JSON files in `content/`, then run `npm run build`. Keep the JSON valid. Each file's keys are self-explanatory, and the build will fail with a clear error if a link or asset is missing.

**Placeholders.** Anything still to be written is marked `[TBC: ...]`. It appears on the site as a yellow highlight, so unfinished content is easy to find. Search the content for `TBC` to see what remains:

```sh
grep -rn "TBC" content/
```

**Links.** A link set to `null` is hidden. A `[TBC: ...]` link is shown as a placeholder, not a link. So the site never shows a broken link.

**CV.** The CV button appears only when the file named in `content/site.json` (`cv.file`) exists in `assets/`. To update it, replace the PDF with a file of the same name, or change `cv.file`.

## Adding or changing a project

Add an object to `content/projects.json`. Use a unique `slug`, which becomes the page address (`projects/<slug>.html`).

```json
{
  "slug": "my-project",
  "title": "Project title",
  "status": "In progress",
  "period": "2026",
  "context": "Department or partner",
  "summary": "One sentence used on cards and in the page description.",
  "problem": "The problem, and why it matters.",
  "approach": ["Method step one", "Method step two"],
  "tools": ["Python", "NumPy"],
  "results": ["Only results you can verify."],
  "limitations": ["An honest limitation."],
  "links": { "code": "https://github.com/...", "report": null, "demo": null },
  "featured": false
}
```

- Set `"featured": true` to show the project on the home page (the first three featured projects are shown).
- Add the repository, report or demo URL to `links` when it is public. Leave it `null` until then.
- Delete an entry to remove its page. The build also fails on duplicate slugs.

## Adding research and publications

- **Publications:** add an entry to `publications` in `content/research.json`, with `status` set to "Submitted", "Under review", "Accepted" or "Published". Add the `link` only once it is public.
- **Talks:** add a line to `talks`.
- **Current research or background:** edit `current` or `background`. The fields are `title`, `status`, `summary`, `accessible` (plain language) and `technical`.

## Social sharing image (optional)

Add a 1200 × 630 PNG at `assets/social-card.png`. The build will then include it in the Open Graph and Twitter metadata. Without it, the site uses a text-only card.

## Changing the domain or URL

Set `siteUrl` in `content/site.json` to the public address. It is used for canonical links and social metadata. For a project site, use `https://USER.github.io/REPO/`.

## Deployment to GitHub Pages

The workflow in `.github/workflows/pages.yml` builds the site and deploys it on every push to `main`.

### One-time repository setup

1. Name the repository for a user site, `benhollandyoung.github.io`. This gives the address `https://benhollandyoung.github.io/`. Any other repository name gives a project site at `https://benhollandyoung.github.io/REPO/`.
2. In the repository, open **Settings > Pages**. Under **Build and deployment**, set **Source** to **GitHub Actions**.
3. Commit the files and push to `main`. Under the **Actions** tab, the "Deploy site to GitHub Pages" workflow runs, and the site goes live when it finishes.

Then check the live address. Any later push to `main` redeploys automatically.

### Publishing from the terminal

```sh
git add .
git commit -m "Build personal website"
git push -u origin main
```

Pushes are not needed for preview. Use `npm run preview` for that.

## Accessibility and performance

- Semantic HTML, a skip link, `aria-current` on the active page, and visible keyboard focus.
- Colours chosen for WCAG AA contrast in both light and dark modes. Dark mode follows the system setting.
- Reduced-motion support. The site has no animation.
- No JavaScript on the page, no web fonts and no external requests, so pages load quickly.
- No analytics or tracking.
