'use strict';

(function exposeRichMissionValidation(root) {
  const ACTIONS = Object.freeze(['collect', 'pickup', 'deliver']);
  const normalize = (value) => String(value ?? '').normalize('NFKD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase().replace(/\s+/g, ' ');
  const slug = (value) => normalize(value).replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

  function freeze(value) {
    if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
    Object.values(value).forEach(freeze);
    return Object.freeze(value);
  }

  function parseReward(value) {
    const match = String(value ?? '').match(/([\d][\d.,]*)\s*auec\b/i);
    if (!match) return null;
    const number = Number(match[1].replace(/[.,](?=\d{3}(?:\D|$))/g, '').replace(',', '.'));
    return Number.isFinite(number) ? number : null;
  }

  function tokenizeCargoDetailed(value) {
    const text = String(value ?? '').trim();
    const marker = /(-?\d+(?:[.,]\d+)?)\s*scu\b/gi;
    const matches = [...text.matchAll(marker)];
    const items = matches.map((match, index) => {
      const start = (match.index ?? 0) + match[0].length;
      const end = matches[index + 1]?.index ?? text.length;
      const commodity = text.slice(start, end)
        .replace(/^[\s,;+|/:-]+/, '')
        .replace(/[\s,;+|/:-]+$/, '')
        .replace(/\s+(?:totale|total)$/i, '')
        .trim();
      return {
        scu: Number(match[1].replace(',', '.')),
        commodity,
        raw: text.slice(match.index, end).trim(),
        start: match.index,
        end
      };
    });
    const prefix = matches.length ? text.slice(0, matches[0].index).replace(/[\s,;+|/:-]+/g, ' ').trim() : text;
    const valid = items.length > 0 && items.every((item) => item.scu > 0 && item.commodity);
    return freeze({ text, items, remainder: prefix, confidence: valid && !prefix ? 1 : items.length ? 0.65 : 0 });
  }

  function locationValues(location, model) {
    return [location?.name, location?.contextName, location?.navigationTarget, ...(location?.aliases ?? []), model?.formatOperationalLabel?.(location)]
      .filter(Boolean).map(normalize);
  }

  function inspectLocation(rawName, model, options, entryKey) {
    const name = String(rawName ?? '').trim();
    const normalized = normalize(name);
    const candidates = (model?.searchOperationalLocations?.(name, { limit: 5 }) ?? []).slice(0, 5);
    const exact = candidates.filter((candidate) => locationValues(candidate, model).includes(normalized));
    if (exact.length === 1) {
      const location = exact[0];
      return freeze({ status: 'exact', confidence: 1, id: location.id, label: model.formatOperationalLabel(location), raw: name, candidates: [] });
    }
    if (exact.length > 1 || candidates.length > 1) {
      return freeze({
        status: 'ambiguous', confidence: 0.45, id: null, label: name, raw: name,
        candidates: candidates.map((location) => ({ id: location.id, label: model.formatOperationalLabel(location), navigationTarget: location.navigationTarget ?? location.name }))
      });
    }
    if (candidates.length === 1) {
      const location = candidates[0];
      return freeze({
        status: 'probable', confidence: 0.78, id: location.id, label: model.formatOperationalLabel(location), raw: name,
        candidates: [{ id: location.id, label: model.formatOperationalLabel(location), navigationTarget: location.navigationTarget ?? location.name }]
      });
    }
    const confirmed = normalize(options?.confirmedCustomLocations?.[entryKey]);
    if (confirmed && confirmed === normalized) {
      return freeze({ status: 'custom-confirmed', confidence: 0.55, id: `custom-${slug(name) || entryKey}`, label: name, raw: name, candidates: [] });
    }
    return freeze({ status: 'unknown', confidence: 0.2, id: null, label: name, raw: name, candidates: [] });
  }

  function issue(severity, code, line, entryKey, field, message, suggestions = []) {
    return freeze({ severity, code, line: line ?? null, entryKey: entryKey ?? null, field: field ?? null, message, suggestions });
  }

  function inspectMissionText(value, locationModel, options = {}) {
    const originalText = String(value ?? '');
    const rawLines = originalText.split(/\r?\n/);
    const entries = [];
    const issues = [];
    const drafts = [];
    let current = null;
    let actionIndex = 0;

    function startMission(title, line) {
      const index = drafts.length;
      const key = `mission-${index}`;
      current = { key, index, title: String(title ?? '').trim(), titleLine: line, contractor: '', rewardAuec: null, entries: [], pickupPools: [], cargoLots: [] };
      drafts.push(current);
      entries.push({ key, kind: 'title', missionKey: key, missionIndex: index, line, raw: rawLines[line - 1] ?? '', title: current.title, confidence: current.title ? 1 : 0 });
      actionIndex = 0;
    }

    rawLines.forEach((rawLine, zeroIndex) => {
      const lineNumber = zeroIndex + 1;
      const line = rawLine.trim();
      if (!line) return;
      const actionMatch = line.match(/^(collect|pickup|deliver)\s+(.+)$/i);
      if (!actionMatch) {
        const contractor = line.match(/^contractor\s*:?\s*(.+)$/i);
        const reward = line.match(/^(?:paga|pay|payment|reward)\s*:?\s*(.+)$/i);
        if (contractor && current) {
          current.contractor = contractor[1].trim();
          entries.push({ key: `${current.key}-contractor`, kind: 'metadata', metadataType: 'contractor', missionKey: current.key, missionIndex: current.index, line: lineNumber, value: current.contractor, raw: rawLine, confidence: 1 });
          return;
        }
        if (reward && current) {
          current.rewardAuec = parseReward(reward[1]);
          entries.push({ key: `${current.key}-reward`, kind: 'metadata', metadataType: 'reward', missionKey: current.key, missionIndex: current.index, line: lineNumber, value: current.rewardAuec, raw: rawLine, confidence: current.rewardAuec ? 1 : 0.35 });
          if (!current.rewardAuec) issues.push(issue('warning', 'unparsed-reward', lineNumber, `${current.key}-reward`, 'reward', `Line ${lineNumber}: reward could not be read as aUEC.`));
          return;
        }
        const explicit = line.match(/^mission\s*:\s*(.+)$/i);
        startMission(explicit ? explicit[1] : line, lineNumber);
        return;
      }

      const action = normalize(actionMatch[1]);
      const payload = actionMatch[2].trim();
      const firstCargo = payload.search(/-?\d+(?:[.,]\d+)?\s*scu\b/i);
      const missionKey = current?.key ?? `orphan-${lineNumber}`;
      const entryKey = current ? `${missionKey}-action-${actionIndex++}` : missionKey;
      const rawLocation = firstCargo >= 0 ? payload.slice(0, firstCargo).trim() : payload;
      const cargoText = firstCargo >= 0 ? payload.slice(firstCargo).trim() : '';
      const locationNames = rawLocation.split(/\s*\+\s*/).map((item) => item.trim()).filter(Boolean);
      const locations = locationNames.map((name, index) => inspectLocation(name, locationModel, options, `${entryKey}-location-${index}`));
      const cargo = tokenizeCargoDetailed(cargoText);
      const locationConfidence = locations.length ? Math.min(...locations.map((item) => item.confidence)) : 0;
      const entry = {
        key: entryKey, kind: 'action', missionKey, missionIndex: current?.index ?? -1, line: lineNumber, raw: rawLine,
        action, originalAction: action, actionConfidence: 1, rawLocation, rawLocations: locationNames, locations,
        location: locations[0] ?? inspectLocation('', locationModel, options, entryKey), cargoText, cargo,
        sharedPickup: locations.length > 1 && action !== 'deliver', confidence: Math.min(1, locationConfidence, cargo.confidence)
      };
      entries.push(entry);
      if (!current) {
        issues.push(issue('error', 'objective-before-title', lineNumber, entryKey, 'mission', `Line ${lineNumber}: add a mission title before this objective.`));
        return;
      }
      current.entries.push(entry);
      if (firstCargo < 0 || !cargo.items.length) issues.push(issue('error', 'missing-cargo', lineNumber, entryKey, 'cargo', `Line ${lineNumber}: add cargo as “2scu commodity”.`));
      cargo.items.filter((item) => item.scu <= 0 || !item.commodity).forEach((item) => issues.push(issue('error', 'invalid-cargo', lineNumber, entryKey, 'cargo', `Line ${lineNumber}: each SCU amount needs a commodity name.`)));
      locations.forEach((location, index) => {
        const name = locationNames[index];
        if (location.status === 'unknown') issues.push(issue('error', 'unverified-location', lineNumber, `${entryKey}-location-${index}`, 'location', `Line ${lineNumber}: “${name}” is not in the location registry.`));
        if (location.status === 'ambiguous') issues.push(issue('error', 'ambiguous-location', lineNumber, `${entryKey}-location-${index}`, 'location', `Line ${lineNumber}: “${name}” matches more than one destination.`, location.candidates));
        if (location.status === 'probable') issues.push(issue('warning', 'probable-location', lineNumber, `${entryKey}-location-${index}`, 'location', `Line ${lineNumber}: interpreted “${name}” as ${location.label}.`, location.candidates));
      });
      if (entry.sharedPickup) issues.push(issue('warning', 'shared-pickup-total', lineNumber, entryKey, 'cargo', `Line ${lineNumber}: ${cargo.items.map((item) => `${item.scu} SCU ${item.commodity}`).join(', ')} is treated as a shared total across ${locations.length} pickup stops; the split per stop remains unknown.`));
    });

    if (!originalText.trim()) issues.push(issue('error', 'empty-input', null, null, 'mission', 'Paste at least one mission before reviewing.'));

    drafts.forEach((mission) => {
      if (!mission.entries.length) issues.push(issue('error', 'mission-without-objectives', mission.titleLine, mission.key, 'mission', `${mission.title || 'Mission'} has no cargo objectives.`));
      mission.entries.forEach((entry) => {
        if (!entry.locations.length || entry.locations.some((location) => !location.id) || !entry.cargo.items.length || entry.cargo.items.some((item) => item.scu <= 0 || !item.commodity)) return;
        if (entry.action === 'collect' || entry.action === 'pickup') {
          entry.cargo.items.forEach((item) => mission.pickupPools.push({
            commodity: item.commodity, remaining: item.scu, pickupType: entry.action,
            pickupLocations: entry.locations.map((location) => ({ id: location.id, label: location.label })), sourceEntry: entry
          }));
          return;
        }
        entry.cargo.items.forEach((deliveryItem) => {
          let remaining = deliveryItem.scu;
          mission.pickupPools.filter((pool) => normalize(pool.commodity) === normalize(deliveryItem.commodity) && pool.remaining > 0).forEach((pool) => {
            if (remaining <= 0) return;
            const allocated = Math.min(pool.remaining, remaining);
            mission.cargoLots.push({
              id: `${mission.key}-lot-${mission.cargoLots.length + 1}`,
              commodity: pool.commodity, scu: allocated, pickupType: pool.pickupType,
              pickupLocations: pool.pickupLocations,
              pickupLocationId: pool.pickupLocations[0].id,
              pickupLocationLabel: pool.pickupLocations.map((location) => location.label).join(' + '),
              sharedPickup: pool.pickupLocations.length > 1,
              deliveryLocationId: entry.locations[0].id,
              deliveryLocationLabel: entry.locations[0].label,
              confidence: Math.round(Math.min(pool.sourceEntry.confidence, entry.confidence) * 100),
              source: { missionTitleLine: mission.titleLine, pickupLine: pool.sourceEntry.line, deliveryLine: entry.line, pickupText: pool.sourceEntry.raw, deliveryText: entry.raw }
            });
            pool.remaining -= allocated;
            remaining -= allocated;
          });
          if (remaining > 0) issues.push(issue('error', 'unmatched-delivery', entry.line, entry.key, 'cargo', `Line ${entry.line}: ${remaining} SCU ${deliveryItem.commodity} has no matching pickup in ${mission.title}.`));
        });
      });
      mission.pickupPools.filter((pool) => pool.remaining > 0).forEach((pool) => issues.push(issue('warning', 'undelivered-pickup', pool.sourceEntry.line, pool.sourceEntry.key, 'cargo', `${mission.title}: ${pool.remaining} SCU ${pool.commodity} has no delivery.`)));
      const titleEntry = entries.find((entry) => entry.kind === 'title' && entry.missionKey === mission.key);
      if (titleEntry) {
        titleEntry.contractor = mission.contractor;
        titleEntry.rewardAuec = mission.rewardAuec;
      }
    });

    const blockingIssues = issues.filter((item) => item.severity === 'error');
    const warnings = issues.filter((item) => item.severity === 'warning');
    const missions = drafts.filter((mission) => mission.title && mission.cargoLots.length).map((mission, missionIndex) => ({
      id: `mission-${missionIndex + 1}-${slug(mission.title)}`,
      title: mission.title,
      contractor: mission.contractor || null,
      rewardAuec: mission.rewardAuec,
      category: 'cargo',
      confidence: mission.entries.length ? Math.round(Math.min(...mission.entries.map((entry) => entry.confidence)) * 100) : 0,
      source: { originalTitle: mission.title, titleLine: mission.titleLine, originalText, entryKeys: mission.entries.map((entry) => entry.key) },
      cargoLots: mission.cargoLots.map((lot, lotIndex) => ({ ...lot, id: `mission-${missionIndex + 1}-${slug(mission.title)}-lot-${lotIndex + 1}` }))
    }));
    const ready = blockingIssues.length === 0 && missions.length > 0;
    const report = freeze({
      version: 2, originalText, entries, missions, issues, blockingIssues, warnings, ready,
      status: blockingIssues.length ? 'blocked' : warnings.length ? 'review' : 'ready',
      confidence: entries.length ? Math.round(entries.reduce((sum, entry) => sum + Number(entry.confidence ?? 0), 0) / entries.length * 100) : 0,
      summary: { missionCount: drafts.length, cargoLotCount: missions.reduce((sum, mission) => sum + mission.cargoLots.length, 0), blockerCount: blockingIssues.length, warningCount: warnings.length }
    });
    root.SCCompanionLastMissionReport = report;
    return report;
  }

  function serializeReview(reviewMissions) {
    const previous = root.SCCompanionLastMissionReport?.missions ?? [];
    return (reviewMissions ?? []).map((mission, index) => {
      const metadata = previous[index] ?? {};
      const lines = [String(mission.title ?? '').trim()];
      const contractor = String(mission.contractor ?? metadata.contractor ?? '').trim();
      const reward = Number(mission.rewardAuec ?? metadata.rewardAuec);
      if (contractor) lines.push(`contractor ${contractor}`);
      if (Number.isFinite(reward) && reward > 0) lines.push(`paga ${reward.toLocaleString('en-US')} aUEC`);
      (mission.objectives ?? []).forEach((objective) => lines.push(`${objective.action} ${objective.location} ${objective.cargo}`.trim()));
      return lines.join('\n');
    }).join('\n\n');
  }

  function snapshot(report, sourceText, reviewedText) {
    return freeze({ version: report.version, sourceText: String(sourceText ?? report.originalText), reviewedText: String(reviewedText ?? report.originalText), status: report.status, confidence: report.confidence, summary: report.summary, issues: report.issues, reviewedAt: new Date().toISOString() });
  }

  const api = freeze({ ACTIONS, inspectMissionText, tokenizeCargoDetailed, serializeReview, snapshot, parseReward });
  root.SCCompanionMissionValidation = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
}(typeof globalThis !== 'undefined' ? globalThis : window));