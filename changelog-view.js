'use strict';

(function initializeChangelogView() {
  const root = document.querySelector('#future-pages-root');
  if (!root) return;

  const page = document.createElement('section');
  page.className = 'app-view section-block changelog-page';
  page.dataset.view = 'changelog';
  page.id = 'changelog';
  page.hidden = true;
  page.innerHTML = `
    <header class="section-heading">
      <div><p class="eyebrow">RELEASE HISTORY</p><h2>Changelog</h2></div>
      <span class="page-status is-live">LIVE</span>
    </header>
    <div class="changelog-hero" id="changelog-hero"><span>LOADING RELEASE HISTORY</span></div>
    <div class="changelog-timeline" id="changelog-timeline"></div>`;
  root.append(page);

  const hero = page.querySelector('#changelog-hero');
  const timeline = page.querySelector('#changelog-timeline');

  function parseMarkdown(markdown) {
    const releases = [];
    let release = null;
    let category = null;
    markdown.split(/\r?\n/).forEach((rawLine) => {
      const line = rawLine.trim();
      const versionMatch = line.match(/^## \[([^\]]+)\](?:\s+-\s+(.+))?$/);
      if (versionMatch) {
        release = { version: versionMatch[1], date: versionMatch[2] ?? '', categories: [] };
        releases.push(release);
        category = null;
        return;
      }
      const categoryMatch = line.match(/^###\s+(.+)$/);
      if (categoryMatch && release) {
        category = { title: categoryMatch[1], items: [] };
        release.categories.push(category);
        return;
      }
      const itemMatch = line.match(/^-\s+(.+)$/);
      if (itemMatch && category) category.items.push(itemMatch[1]);
    });
    return releases;
  }

  function normalizedVersion(value) {
    return String(value ?? '').replace(/^v/i, '').replace(/\.0$/, '');
  }

  function includeCurrentRoadmapRelease(releases) {
    const roadmap = window.SCCompanionRoadmap;
    const current = roadmap?.releases?.find((release) => release.version === roadmap.currentVersion);
    if (!current) return releases;
    const exists = releases.some((release) => normalizedVersion(release.version) === normalizedVersion(current.version));
    if (exists) return releases;
    return [{
      version: `${current.version}.0`,
      date: '2026-07-22',
      title: current.title,
      categories: [{ title: 'Delivered', items: [...current.changes] }]
    }, ...releases];
  }

  function releaseTitle(release) {
    if (release.title) return release.title;
    const named = release.categories.flatMap((category) => category.items)[0];
    return named ?? 'Product update';
  }

  function renderHero(release) {
    hero.innerHTML = `
      <div><span>CURRENT BUILD</span><strong>v${release.version}</strong><h3>${releaseTitle(release)}</h3><p>${release.date || 'Current development build'}</p></div>
      <div class="changelog-hero-summary">${release.categories.slice(0, 3).map((category) => `<span>${category.title}<strong>${category.items.length}</strong></span>`).join('')}</div>`;

    const overviewGrid = document.querySelector('#overview .overview-grid');
    if (overviewGrid && !overviewGrid.querySelector('[data-release-card]')) {
      const card = document.createElement('article');
      card.className = 'blueprint-card release-overview-card';
      card.dataset.releaseCard = 'true';
      card.innerHTML = `<span class="card-kicker">CURRENT BUILD</span><h3>v${release.version}</h3><p>${releaseTitle(release)}</p><button type="button" data-shell-link="changelog">OPEN CHANGELOG</button>`;
      overviewGrid.append(card);
    }
  }

  function renderRelease(release, index) {
    const article = document.createElement('article');
    article.className = `changelog-release${index === 0 ? ' is-current' : ''}`;
    const details = document.createElement('details');
    details.open = index < 2;
    const summary = document.createElement('summary');
    summary.innerHTML = `<span>v${release.version}</span><div><strong>${releaseTitle(release)}</strong><small>${release.date || 'Release date unavailable'}</small></div><em>${release.categories.reduce((total, category) => total + category.items.length, 0)} CHANGES</em>`;
    const body = document.createElement('div');
    body.className = 'changelog-release-body';
    release.categories.forEach((category) => {
      const section = document.createElement('section');
      section.innerHTML = `<h4>${category.title}</h4><ul>${category.items.map((item) => `<li>${item}</li>`).join('')}</ul>`;
      body.append(section);
    });
    details.append(summary, body);
    article.append(details);
    return article;
  }

  function render(releases) {
    const completeReleases = includeCurrentRoadmapRelease(releases);
    const published = completeReleases.filter((release) => release.version.toLowerCase() !== 'unreleased');
    if (!published.length) throw new Error('No published releases found in CHANGELOG.md');
    renderHero(published[0]);
    timeline.replaceChildren();
    published.forEach((release, index) => timeline.append(renderRelease(release, index)));
  }

  fetch('./CHANGELOG.md', { cache: 'no-store' })
    .then((response) => {
      if (!response.ok) throw new Error(`CHANGELOG.md returned ${response.status}`);
      return response.text();
    })
    .then((markdown) => render(parseMarkdown(markdown)))
    .catch((error) => {
      hero.innerHTML = `<strong>Changelog unavailable</strong><p>${error.message}</p>`;
      timeline.innerHTML = '<div class="empty-inline-state">Release history could not be loaded.</div>';
    });
}());
