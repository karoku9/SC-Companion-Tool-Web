'use strict';

(function renderReleaseRoadmap() {
  const roadmap = window.SCCompanionRoadmap;
  const board = document.querySelector('#roadmap-board');
  if (!roadmap?.releases || !board) return;

  const statusLabels = { done: 'RELEASED', current: 'CURRENT', next: 'NEXT', future: 'PLANNED' };

  function releaseCard(release) {
    const article = document.createElement('article');
    article.className = `release-roadmap-card is-${release.status}`;
    article.dataset.version = release.version;

    const header = document.createElement('header');
    header.innerHTML = `<span>v${release.version}</span><em>${statusLabels[release.status]}</em>`;

    const title = document.createElement('h3');
    title.textContent = release.title;
    const summary = document.createElement('p');
    summary.textContent = release.summary;

    const list = document.createElement('ul');
    release.changes.forEach((change) => {
      const item = document.createElement('li');
      item.textContent = change;
      list.append(item);
    });

    article.append(header, title, summary, list);
    return article;
  }

  const released = roadmap.releases.filter((release) => release.status === 'done' || release.status === 'current').length;
  const progress = document.createElement('div');
  progress.className = 'release-roadmap-progress';
  progress.innerHTML = `<span>PRODUCT PATH</span><strong>${released} / ${roadmap.releases.length} RELEASES</strong><div><i style="width:${(released / roadmap.releases.length) * 100}%"></i></div><small>Current build: v${roadmap.currentVersion}</small>`;

  const track = document.createElement('div');
  track.className = 'release-roadmap-track';
  roadmap.releases.forEach((release) => track.append(releaseCard(release)));
  board.replaceChildren(progress, track);

  const current = track.querySelector('.is-current');
  if (current) requestAnimationFrame(() => { track.scrollLeft = Math.max(0, current.offsetLeft - 20); });
}());
