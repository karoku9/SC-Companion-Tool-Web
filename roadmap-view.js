'use strict';

(function renderRoadmapBoard() {
  const roadmap = window.SCCompanionRoadmap;
  const board = document.querySelector('#roadmap-board');

  if (!roadmap || !board) return;

  const statusLabels = {
    done: 'COMPLETED',
    active: 'IN PROGRESS',
    next: 'NEXT',
    future: 'FUTURE'
  };

  function createItem(item) {
    const element = document.createElement('li');
    element.className = `roadmap-item is-${item.status}`;

    const marker = document.createElement('span');
    marker.className = 'roadmap-marker';
    marker.setAttribute('aria-hidden', 'true');

    const content = document.createElement('div');
    content.className = 'roadmap-item-content';

    const label = document.createElement('strong');
    label.textContent = item.label;

    const status = document.createElement('span');
    status.className = 'roadmap-item-status';
    status.textContent = statusLabels[item.status] ?? item.status;

    content.append(label, status);
    element.append(marker, content);
    return element;
  }

  function createPhase(phase) {
    const article = document.createElement('article');
    article.className = `roadmap-phase is-${phase.status}`;

    const header = document.createElement('header');
    header.className = 'roadmap-phase-header';

    const order = document.createElement('span');
    order.className = 'roadmap-order';
    order.textContent = phase.order;

    const titleGroup = document.createElement('div');
    const title = document.createElement('h3');
    title.textContent = phase.title;
    const summary = document.createElement('p');
    summary.textContent = phase.summary;
    titleGroup.append(title, summary);

    header.append(order, titleGroup);

    const list = document.createElement('ol');
    list.className = 'roadmap-items';
    phase.items.forEach((item) => list.append(createItem(item)));

    article.append(header, list);
    return article;
  }

  const fragment = document.createDocumentFragment();
  roadmap.phases.forEach((phase) => fragment.append(createPhase(phase)));
  board.replaceChildren(fragment);
}());
