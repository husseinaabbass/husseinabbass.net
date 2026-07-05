const sections = [
  { id: "about", file: "about.csv", accent: "#38BDF8" },
  {
    id: "publications",
    file: "research.csv",
    groupFilter: "Publications",
    title: "Publications",
    kicker: "Research",
    description: "Publications preserved from the original research page, with original categories, dates, and links retained.",
    completeUrl: "complete.html#research-publications",
    accent: "#22C55E"
  },
  {
    id: "grants",
    file: "research.csv",
    groupFilter: "Grants",
    title: "Grants",
    kicker: "Research",
    description: "Research grants preserved from the original Grants category.",
    completeUrl: "complete.html#research-grants",
    accent: "#38BDF8"
  },
  { id: "team", file: "team.csv", accent: "#A78BFA" },
  { id: "teaching", file: "teaching.csv", accent: "#F59E0B" },
  { id: "services", file: "services.csv", accent: "#38BDF8" },
  { id: "media", file: "media.csv", accent: "#22C55E" },
  { id: "contact", file: "contact.csv", accent: "#A78BFA" }
];

const completeSections = [
  { id: "about", file: "about.csv", accent: "#38BDF8" },
  { id: "research", file: "research.csv", accent: "#22C55E" },
  { id: "team", file: "team.csv", accent: "#A78BFA" },
  { id: "teaching", file: "teaching.csv", accent: "#F59E0B" },
  { id: "services", file: "services.csv", accent: "#38BDF8" },
  { id: "media", file: "media.csv", accent: "#22C55E" },
  { id: "contact", file: "contact.csv", accent: "#A78BFA" }
];

const escapeHtml = (value = "") => String(value)
  .replaceAll("&", "&amp;")
  .replaceAll("<", "&lt;")
  .replaceAll(">", "&gt;")
  .replaceAll('"', "&quot;");

function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = "";
  let quoted = false;

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    const next = text[i + 1];

    if (quoted) {
      if (char === '"' && next === '"') {
        field += '"';
        i += 1;
      } else if (char === '"') {
        quoted = false;
      } else {
        field += char;
      }
      continue;
    }

    if (char === '"') {
      quoted = true;
    } else if (char === ',') {
      row.push(field);
      field = "";
    } else if (char === '\n') {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else if (char !== '\r') {
      field += char;
    }
  }

  if (field || row.length) {
    row.push(field);
    rows.push(row);
  }

  const headers = rows.shift() || [];
  return rows
    .filter(values => values.some(value => value.trim()))
    .map(values => Object.fromEntries(headers.map((header, index) => [header, values[index] || ""])));
}

function fromCsvRows(rows) {
  const metadata = rows.find(row => row.kind === "metadata") || {};
  const data = {
    title: metadata.title || "Untitled",
    kicker: metadata.kicker || "",
    description: metadata.description || "",
    completeUrl: metadata.completeUrl || "",
    featured: rows.filter(row => row.kind === "featured").map(toItem)
  };

  const groupRows = rows.filter(row => row.kind === "group");
  if (groupRows.length) {
    data.groups = groupRows.map(group => ({
      title: group.group,
      description: group.summary || "",
      items: rows
        .filter(row => row.kind === "item" && row.group === group.group)
        .map(toItem)
    }));
  } else {
    data.complete = rows.filter(row => row.kind === "item").map(toItem);
  }

  return data;
}

function toItem(row) {
  return {
    group: row.group || "",
    title: row.title || "",
    type: row.type || "",
    summary: row.summary || "",
    url: row.url || "",
    linkLabel: row.linkLabel || ""
  };
}

async function loadSection(section) {
  const response = await fetch(`data/${section.file}`, { cache: "no-store" });
  if (!response.ok) throw new Error(`Unable to load ${section.file}`);
  const rows = parseCsv(await response.text());
  const data = fromCsvRows(rows);

  if (section.groupFilter && Array.isArray(data.groups)) {
    const group = data.groups.find(candidate => candidate.title === section.groupFilter);
    const groupItems = group?.items || [];
    const featured = (data.featured || []).filter(item => item.type === section.groupFilter || item.group === section.groupFilter || groupItems.some(candidate => candidate.title === item.title));
    return {
      ...section,
      data: {
        title: section.title || group?.title || data.title,
        kicker: section.kicker || data.kicker,
        description: section.description || group?.description || data.description,
        completeUrl: section.completeUrl || data.completeUrl,
        featured: featured.length ? featured : groupItems.slice(0, 3),
        complete: groupItems
      }
    };
  }

  return { ...section, data: { ...data, completeUrl: section.completeUrl || data.completeUrl } };
}

function flattenItems(data) {
  if (Array.isArray(data.complete)) return data.complete;
  const grouped = data.groups || [];
  return grouped.flatMap(group => (group.items || []).map(item => ({ ...item, group: group.title })));
}

function itemTitle(item) {
  return item.title || item.name || item.text || "Untitled";
}

function itemDetail(item) {
  return item.summary || item.detail || item.type || item.year || item.group || "";
}

function splitLinks(url = "") {
  return String(url).split(/\s+\|\s+/).map(link => link.trim()).filter(Boolean);
}

function firstLink(url = "") {
  return splitLinks(url)[0] || "";
}

function externalLinks(url, label = "Open link", className = "card-link") {
  const links = splitLinks(url);
  if (!links.length) return "";
  return `<span class="link-group">${links.map((link, index) => {
    const linkLabel = links.length === 1 ? label : `${label} ${index + 1}`;
    return `<a class="${className}" href="${escapeHtml(link)}" target="_blank" rel="noopener noreferrer">${escapeHtml(linkLabel)}</a>`;
  }).join("")}</span>`;
}

function card(item, accent) {
  return `
    <article class="featured-card">
      <p class="card-meta">${escapeHtml(item.type || item.year || item.group || "Featured")}</p>
      <h3>${escapeHtml(itemTitle(item))}</h3>
      <p>${escapeHtml(itemDetail(item))}</p>
      ${externalLinks(item.url, item.linkLabel || "Open link")}
    </article>`;
}

function tickerClass(item) {
  const length = itemTitle(item).length;
  if (length > 190) return "ticker-item ticker-item-xl";
  if (length > 120) return "ticker-item ticker-item-lg";
  if (length > 70) return "ticker-item ticker-item-md";
  return "ticker-item";
}

function tickerItem(item) {
  const title = escapeHtml(itemTitle(item));
  const itemClass = tickerClass(item);
  const link = firstLink(item.url);
  if (link) {
    return `<a class="${itemClass}" href="${escapeHtml(link)}" target="_blank" rel="noopener noreferrer">${title}</a>`;
  }
  return `<span class="${itemClass}">${title}</span>`;
}

function tickerDensity(items) {
  const totalLength = items.reduce((sum, item) => sum + itemTitle(item).length, 0);
  if (totalLength > 46000 || items.length > 300) return "ticker-marathon";
  if (totalLength > 14000 || items.length > 90) return "ticker-long";
  if (totalLength > 4500 || items.length > 28) return "ticker-medium";
  return "ticker-short";
}

function renderHome(section) {
  const { id, data } = section;
  const completeHref = data.completeUrl || `complete.html#${id}`;
  const flattened = flattenItems(data);
  const repeatedItems = flattened.length > 4 ? [...flattened, ...flattened] : [...flattened, ...flattened, ...flattened, ...flattened];
  const tickerItems = repeatedItems.map(tickerItem).join("");
  const tickerClassName = `ticker ${tickerDensity(flattened)}`;

  return `
    <section id="${id}" class="content-section section-band">
      <div class="section-shell">
        <div class="section-heading">
          <div>
            <p class="eyebrow">${escapeHtml(data.kicker || id)}</p>
            <h2>${escapeHtml(data.title)}</h2>
            <p class="section-intro">${escapeHtml(data.description || "")}</p>
          </div>
          <div class="section-actions">
            <a class="button ghost" href="${escapeHtml(completeHref)}">Complete list</a>
          </div>
        </div>
        <div class="featured-grid">
          ${(data.featured || []).map(item => card(item)).join("")}
        </div>
        <div class="${tickerClassName}" aria-label="${escapeHtml(data.title)} complete list preview">
          <div class="ticker-track">${tickerItems}</div>
        </div>
      </div>
    </section>`;
}

function listItem(item, accent) {
  const title = escapeHtml(itemTitle(item));
  const detail = itemDetail(item);
  const link = firstLink(item.url);
  return `
    <article class="list-card">
      <h3>${link ? `<a href="${escapeHtml(link)}" target="_blank" rel="noopener noreferrer">${title}</a>` : title}</h3>
      ${detail ? `<p>${escapeHtml(detail)}</p>` : ""}
      ${externalLinks(item.url, item.linkLabel || "Open link", "inline-link")}
    </article>`;
}

function slug(value) {
  return String(value).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

function renderGroupedLists(data, id, accent) {
  const grouped = data.groups;
  if (!Array.isArray(grouped)) {
    return `<div class="complete-list">${(data.complete || []).map(item => listItem(item, accent)).join("")}</div>`;
  }
  return grouped.map(group => `
    <section id="${id}-${slug(group.title)}" class="subsection">
      <div class="subsection-heading">
        <h3>${escapeHtml(group.title)}</h3>
        ${group.description ? `<p>${escapeHtml(group.description)}</p>` : ""}
      </div>
      <div class="complete-list">${(group.items || []).map(item => listItem(item, accent)).join("")}</div>
    </section>`).join("");
}



function scrollToCurrentHash() {
  if (!window.location.hash) return;
  const target = document.querySelector(window.location.hash);
  if (!target) return;
  const header = document.querySelector('.site-header');
  const offset = (header?.getBoundingClientRect().height || 0) + 14;
  const top = target.getBoundingClientRect().top + window.scrollY - offset;
  window.scrollTo({ top, behavior: 'auto' });
}
function configureTickers() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const pixelsPerSecond = 44;
  document.querySelectorAll('.ticker').forEach(ticker => {
    const track = ticker.querySelector('.ticker-track');
    if (!track) return;
    const distance = Math.max(track.scrollWidth / 2, ticker.clientWidth);
    const duration = Math.max(30000, (distance / pixelsPerSecond) * 1000);
    const animation = track.animate([
      { transform: 'translateX(0)' },
      { transform: `translateX(-${distance}px)` }
    ], {
      duration,
      iterations: Infinity,
      easing: 'linear'
    });
    ticker.addEventListener('mouseenter', () => animation.pause());
    ticker.addEventListener('mouseleave', () => animation.play());
    ticker.addEventListener('focusin', () => animation.pause());
    ticker.addEventListener('focusout', () => animation.play());
  });
}
function renderComplete(section) {
  const { id, accent, data } = section;
  return `
    <section id="${id}" class="content-section">
      <div class="section-shell">
        <div class="section-heading">
          <div>
            <p class="eyebrow">${escapeHtml(data.kicker || id)}</p>
            <h2>${escapeHtml(data.title)}</h2>
            <p class="section-intro">${escapeHtml(data.description || "")}</p>
          </div>
        </div>
        ${renderGroupedLists(data, id, accent)}
      </div>
    </section>`;
}

async function boot() {
  const homeRoot = document.querySelector("#content-root");
  const completeRoot = document.querySelector("#complete-root");
  if (homeRoot) {
    const loaded = await Promise.all(sections.map(loadSection));
    homeRoot.innerHTML = loaded.map(renderHome).join("");
    configureTickers();
  }
  if (completeRoot) {
    const loaded = await Promise.all(completeSections.map(loadSection));
    completeRoot.innerHTML = loaded.map(renderComplete).join("");
    requestAnimationFrame(() => {
      scrollToCurrentHash();
      [120, 420, 900].forEach(delay => setTimeout(scrollToCurrentHash, delay));
    });
  }
}

boot().catch(error => {
  const root = document.querySelector("#content-root") || document.querySelector("#complete-root");
  if (root) root.innerHTML = `<section class="content-section"><div class="section-shell"><h2>Content could not load</h2><p>${escapeHtml(error.message)}</p></div></section>`;
});








