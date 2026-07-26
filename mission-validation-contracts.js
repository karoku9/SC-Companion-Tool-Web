'use strict';

(function enhanceMissionValidation(root) {
  const base = root.SCCompanionMissionValidation
    ?? (typeof require !== 'undefined' ? require('./mission-validation.js') : null);
  if (!base) throw new Error('Base mission validation must load before mission-validation-contracts.js');

  const ACTIONS = base.ACTIONS;
  const severityWeight = { error: 3, warning: 2, info: 1 };

  function normalize(value) {
    return String(value ?? '').normalize('NFKD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase().replace(/\s+/g, ' ');
  }
  function slug(value) { return normalize(value).replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''); }
  function freeze(value) {
    if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
    Object.values(value).forEach(freeze);
    return Object.freeze(value);
  }
  function issue(input) { return freeze({ severity: input.severity, code: input.code, line: input.line ?? null, entryKey: input.entryKey ?? null, field: input.field ?? null, message: input.message, suggestions: input.suggestions ?? [] }); }

  function editDistance(leftValue, rightValue) {
    const left = normalize(leftValue);
    const right = normalize(rightValue);
    const rows = Array.from({ length: left.length + 1 }, (_, index) => [index]);
    for (let column = 0; column <= right.length; column += 1) rows[0][column] = column;
    for (let row = 1; row <= left.length; row += 1) {
      for (let column = 1; column <= right.length; column += 1) {
        const substitution = left[row - 1] === right[column - 1] ? 0 : 1;
        rows[row][column] = Math.min(rows[row - 1][column] + 1, rows[row][column - 1] + 1, rows[row - 1][column - 1] + substitution);
      }
    }
    return rows[left.length][right.length];
  }
  function suggestedAction(token) {
    return ACTIONS.map((action) => ({ action, distance: editDistance(token, action) })).sort((a, b) => a.distance - b.distance)[0] ?? null;
  }

  function cleanCommodity(value) {
    return String(value ?? '')
      .trim()
      .replace(/^[,;+|/\-]+|[,;+|/\-]+$/g, '')
      .replace(/\s+(?:totale|total)$/i, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function tokenizeCargoDetailed(value) {
    const text = String(value ?? '').trim();
    const pattern = /(-?\d+(?:\.\d+)?)\s*scu\b\s*([\s\S]*?)(?=\s+-?\d+(?:\.\d+)?\s*scu\b|$)/gi;
    const items = [];
    const ranges = [];
    let match;
    while ((match = pattern.exec(text)) !== null) {
      const commodity = cleanCommodity(match[2]);
      if (commodity) {
        items.push({ scu: Number(match[1]), commodity, raw: match[0], start: match.index, end: pattern.lastIndex });
        ranges.push([match.index, pattern.lastIndex]);
      }
    }
    let remainder = '';
    let cursor = 0;
    ranges.forEach(([start, end]) => { remainder += text.slice(cursor, start); cursor = end; });
    remainder += text.slice(cursor);
    remainder = remainder.replace(/\b(?:totale|total)\b/gi, '').replace(/[\s,;+|/]+/g, ' ').trim();
    return freeze({
      text,
      items,
      remainder,
      confidence: items.length && !remainder && items.every((item) => item.scu > 0) ? 1 : items.length ? 0.62 : 0
    });
  }

  function locationValues(location, locationModel) {
    return [location?.name, location?.contextName, location?.navigationTarget, ...(location?.aliases ?? []), locationModel?.formatOperationalLabel?.(location)]
      .filter(Boolean).map(normalize);
  }

  function inspectSingleLocation(rawName, locationModel) {
    const name = String(rawName ?? '').trim();
    const normalizedName = normalize(name);
    const candidates = (locationModel?.searchOperationalLocations?.(name) ?? []).slice(0, 5);
    const exact = candidates.filter((candidate) => locationValues(candidate, locationModel).includes(normalizedName));
    if (exact.length === 1) {
      const location = exact[0];
      return { status: 'exact', confidence: 1, id: location.id, label: locationModel.formatOperationalLabel(location), raw: name, candidates: [] };
    }
    if (exact.length > 1 || candidates.length > 1) {
      return { status: 'ambiguous', confidence: 0.45, id: null, label: name, raw: name, candidates: candidates.map((location) => ({ id: location.id, label: locationModel.formatOperationalLabel(location), navigationTarget: location.navigationTarget ?? location.name })) };
    }
    if (candidates.length === 1) {
      const location = candidates[0];
      return { status: 'probable', confidence: 0.78, id: location.id, label: locationModel.formatOperationalLabel(location), raw: name, candidates: [{ id: location.id, label: locationModel.formatOperationalLabel(location), navigationTarget: location.navigationTarget ?? location.name }] };
    }
    return { status: 'unknown', confidence: 0.2, id: null, label: name, raw: name, candidates: [] };
  }

  function inspectLocations(rawName, locationModel, options, entryKey) {
    const names = String(rawName ?? '').split(/\s+\+\s+/).map((item) => item.trim()).filter(Boolean);
    const locations = names.map((name) => inspectSingleLocation(name, locationModel));
    locations.forEach((location, index) => {
      if (location.status !== 'unknown') return;
      const confirmed = normalize(options?.confirmedCustomLocations?.[`${entryKey}:${index}`] ?? options?.confirmedCustomLocations?.[entryKey]);
      if (confirmed && confirmed === normalize(location.raw)) {
        locations[index] = { ...location, status: 'custom-confirmed', confidence: 0.55, id: `custom-${slug(location.raw) || `${entryKey}-${index}`}` };
      }
    });
    const rank = { exact: 5, probable: 4, 'custom-confirmed': 3, ambiguous: 2, unknown: 1 };
    const worst = [...locations].sort((a, b) => rank[a.status] - rank[b.status])[0] ?? { status: 'unknown', confidence: 0, candidates: [] };
    return freeze({
      status: worst.status,
      confidence: locations.length ? Math.min(...locations.map((item) => item.confidence)) : 0,
      id: locations.length === 1 ? locations[0].id : null,
      label: locations.map((item) => item.label).join(' + '),
      raw: String(rawName ?? '').trim(),
      candidates: locations.flatMap((item) => item.candidates ?? []),
      locations
    });
  }

  function inspectMissionText(text, locationModel, options = {}) {
    const originalText = String(text ?? '');
    const rawLines = originalText.split(/\r?\n/);
    const entries = [];
    const issues = [];
    const missionDrafts = [];
    let currentMission = null;
    let actionIndex = 0;

    function startMission(rawTitle, lineNumber, explicit = false) {
      const title = String(rawTitle ?? '').trim() || `Mission ${missionDrafts.length + 1}`;
      const missionIndex = missionDrafts.length;
      const key = `mission-${missionIndex}`;
      currentMission = { key, index: missionIndex, title, titleLine: lineNumber, explicitTitle: explicit, entries: [], pickupPools: [], cargoLots: [], metadata: {} };
      missionDrafts.push(currentMission);
      entries.push({ key, kind: 'title', missionKey: key, missionIndex, line: lineNumber, raw: rawLines[lineNumber - 1] ?? '', title, confidence: 1 });
    }

    rawLines.forEach((rawLine, zeroIndex) => {
      const lineNumber = zeroIndex + 1;
      const line = rawLine.trim();
      if (!line) return;

      const contractor = line.match(/^(?:contractor|committente)\s*:?[ \t]*(.+)$/i);
      const reward = line.match(/^(?:paga|pay|reward)\s*:?[ \t]*([\d.,]+)\s*auec\b/i);
      if (contractor || reward) {
        if (!currentMission) startMission(`Mission ${missionDrafts.length + 1}`, lineNumber, false);
        if (contractor) currentMission.metadata.contractor = contractor[1].trim();
        if (reward) currentMission.metadata.rewardAuec = Number(reward[1].replace(/[.,](?=\d{3}\b)/g, '').replace(',', '.'));
        entries.push({ key: `${currentMission.key}-metadata-${lineNumber}`, kind: 'metadata', missionKey: currentMission.key, missionIndex: currentMission.index, line: lineNumber, raw: rawLine, metadata: contractor ? { contractor: contractor[1].trim() } : { rewardAuec: currentMission.metadata.rewardAuec }, confidence: 1 });
        return;
      }

      const firstToken = line.match(/^([a-z]+)\b/i)?.[1] ?? '';
      const exactAction = ACTIONS.includes(normalize(firstToken));
      const candidate = suggestedAction(firstToken);
      const hasCargo = /-?\d+(?:\.\d+)?\s*scu\b/i.test(line);
      const looksObjective = hasCargo && candidate?.distance <= 2;
      const numberedMission = line.match(/^mission\s*(\d+)?\s*:?[ \t]*(.*)$/i);
      const explicitMission = line.match(/^mission\s*:[ \t]*(.*)$/i);

      if (!exactAction && !looksObjective) {
        const title = numberedMission
          ? (numberedMission[2].trim() || `Mission ${numberedMission[1] || missionDrafts.length + 1}`)
          : explicitMission ? explicitMission[1].trim() : line;
        startMission(title, lineNumber, Boolean(numberedMission || explicitMission));
        actionIndex = 0;
        return;
      }

      const missionKey = currentMission?.key ?? `orphan-${lineNumber}`;
      const entryKey = currentMission ? `${missionKey}-action-${actionIndex}` : missionKey;
      actionIndex += 1;
      const action = exactAction ? normalize(firstToken) : candidate?.action ?? normalize(firstToken);
      const payload = line.slice(firstToken.length).trim();
      const firstCargo = payload.search(/-?\d+(?:\.\d+)?\s*scu/i);
      const rawLocation = firstCargo >= 0 ? payload.slice(0, firstCargo).trim() : payload;
      const cargoText = firstCargo >= 0 ? payload.slice(firstCargo).trim() : '';
      const cargo = tokenizeCargoDetailed(cargoText);
      const location = inspectLocations(rawLocation, locationModel, options, entryKey);
      const entry = freeze({ key: entryKey, kind: 'action', missionKey, missionIndex: currentMission?.index ?? -1, line: lineNumber, raw: rawLine, action, originalAction: normalize(firstToken), actionConfidence: exactAction ? 1 : 0.35, rawLocation, location, cargoText, cargo, confidence: Math.min(exactAction ? 1 : 0.35, location.confidence, cargo.confidence) });
      entries.push(entry);

      if (!currentMission) {
        issues.push(issue({ severity: 'error', code: 'objective-before-title', line: lineNumber, entryKey, field: 'mission', message: `Line ${lineNumber}: add a mission title before this objective.` }));
        return;
      }
      currentMission.entries.push(entry);
      if (!exactAction) issues.push(issue({ severity: 'error', code: 'unknown-action', line: lineNumber, entryKey, field: 'action', message: `Line ${lineNumber}: “${firstToken}” is not supported. Review “${action}”.`, suggestions: [action] }));
      if (!rawLocation) issues.push(issue({ severity: 'error', code: 'missing-location', line: lineNumber, entryKey, field: 'location', message: `Line ${lineNumber}: location is required before cargo.` }));
      location.locations.forEach((item) => {
        if (item.status === 'unknown') issues.push(issue({ severity: 'error', code: 'unverified-location', line: lineNumber, entryKey, field: 'location', message: `Line ${lineNumber}: “${item.raw}” is not in the destination registry.` }));
        if (item.status === 'ambiguous') issues.push(issue({ severity: 'error', code: 'ambiguous-location', line: lineNumber, entryKey, field: 'location', message: `Line ${lineNumber}: “${item.raw}” matches multiple destinations.`, suggestions: item.candidates }));
        if (item.status === 'probable') issues.push(issue({ severity: 'warning', code: 'probable-location', line: lineNumber, entryKey, field: 'location', message: `Line ${lineNumber}: interpreted “${item.raw}” as ${item.label}.`, suggestions: item.candidates }));
      });
      if (firstCargo < 0 || !cargo.items.length) issues.push(issue({ severity: 'error', code: 'missing-cargo', line: lineNumber, entryKey, field: 'cargo', message: `Line ${lineNumber}: add cargo as “2scu commodity”.` }));
      cargo.items.filter((item) => !Number.isFinite(item.scu) || item.scu <= 0).forEach((item) => issues.push(issue({ severity: 'error', code: 'invalid-scu', line: lineNumber, entryKey, field: 'cargo', message: `Line ${lineNumber}: SCU for ${item.commodity} must be greater than zero.` })));
      if (cargo.remainder) issues.push(issue({ severity: 'error', code: 'unparsed-cargo', line: lineNumber, entryKey, field: 'cargo', message: `Line ${lineNumber}: could not parse “${cargo.remainder}”.` }));
    });

    if (!originalText.trim()) issues.push(issue({ severity: 'error', code: 'empty-input', field: 'mission', message: 'Paste at least one mission before reviewing.' }));
    if (!missionDrafts.length && originalText.trim()) issues.push(issue({ severity: 'error', code: 'no-missions', field: 'mission', message: 'No mission titles were found.' }));

    missionDrafts.forEach((mission) => {
      if (!mission.entries.length) issues.push(issue({ severity: 'error', code: 'mission-without-objectives', line: mission.titleLine, entryKey: mission.key, field: 'mission', message: `${mission.title} has no pickup or delivery objectives.` }));
      mission.entries.forEach((entry) => {
        const resolvedLocations = entry.location.locations.filter((item) => item.id);
        if (!resolvedLocations.length || resolvedLocations.length !== entry.location.locations.length || !entry.cargo.items.length || entry.cargo.remainder || entry.cargo.items.some((item) => item.scu <= 0)) return;
        if (entry.action === 'collect' || entry.action === 'pickup') {
          entry.cargo.items.forEach((item) => mission.pickupPools.push({ commodity: item.commodity, remaining: item.scu, pickupType: entry.action, pickupLocations: resolvedLocations.map((location) => ({ id: location.id, label: location.label })), sourceEntry: entry }));
          return;
        }
        entry.cargo.items.forEach((deliveryItem) => {
          let remaining = deliveryItem.scu;
          mission.pickupPools.filter((pool) => normalize(pool.commodity) === normalize(deliveryItem.commodity) && pool.remaining > 0).forEach((pool) => {
            if (remaining <= 0) return;
            const allocated = Math.min(pool.remaining, remaining);
            const firstPickup = pool.pickupLocations[0];
            mission.cargoLots.push({
              id: `${mission.key}-lot-${mission.cargoLots.length + 1}`,
              commodity: pool.commodity,
              scu: allocated,
              pickupType: pool.pickupType,
              pickupLocationId: firstPickup.id,
              pickupLocationLabel: pool.pickupLocations.map((item) => item.label).join(' + '),
              pickupLocations: pool.pickupLocations,
              sharedPickupTotal: pool.pickupLocations.length > 1,
              deliveryLocationId: resolvedLocations[0].id,
              deliveryLocationLabel: resolvedLocations[0].label,
              confidence: Math.min(pool.sourceEntry.confidence, entry.confidence),
              source: { missionTitleLine: mission.titleLine, pickupLine: pool.sourceEntry.line, deliveryLine: entry.line, pickupText: pool.sourceEntry.raw, deliveryText: entry.raw, sharedPickupTotal: pool.pickupLocations.length > 1 }
            });
            pool.remaining -= allocated;
            remaining -= allocated;
          });
          if (remaining > 0) issues.push(issue({ severity: 'error', code: 'unmatched-delivery', line: entry.line, entryKey: entry.key, field: 'cargo', message: `Line ${entry.line}: ${remaining} SCU ${deliveryItem.commodity} has no matching pickup in ${mission.title}.` }));
        });
      });
      mission.pickupPools.filter((pool) => pool.remaining > 0).forEach((pool) => issues.push(issue({ severity: 'warning', code: 'undelivered-pickup', line: pool.sourceEntry.line, entryKey: pool.sourceEntry.key, field: 'cargo', message: `${mission.title}: ${pool.remaining} SCU ${pool.commodity} has no delivery.` })));
      if (mission.entries.length && !mission.cargoLots.length) issues.push(issue({ severity: 'error', code: 'no-complete-cargo-flow', line: mission.titleLine, entryKey: mission.key, field: 'cargo', message: `${mission.title} has no complete pickup-to-delivery cargo flow.` }));
    });

    const sortedIssues = [...issues].sort((a, b) => severityWeight[b.severity] - severityWeight[a.severity] || (a.line ?? Number.MAX_SAFE_INTEGER) - (b.line ?? Number.MAX_SAFE_INTEGER));
    const blockingIssues = sortedIssues.filter((item) => item.severity === 'error');
    const warnings = sortedIssues.filter((item) => item.severity === 'warning');
    const actionEntries = entries.filter((entry) => entry.kind === 'action');
    const fieldScores = entries.flatMap((entry) => entry.kind === 'title' ? [entry.confidence] : entry.kind === 'action' ? [entry.actionConfidence, entry.location.confidence, entry.cargo.confidence] : []);
    const confidence = fieldScores.length ? Math.round(fieldScores.reduce((sum, value) => sum + value, 0) / fieldScores.length * 100) : 0;
    const missions = missionDrafts.filter((mission) => mission.title && mission.cargoLots.length).map((mission, missionIndex) => ({
      id: `mission-${missionIndex + 1}-${slug(mission.title)}`,
      title: mission.title,
      contractor: mission.metadata.contractor ?? null,
      rewardAuec: mission.metadata.rewardAuec ?? null,
      category: 'cargo',
      confidence: mission.entries.length ? Math.round(Math.min(...mission.entries.map((entry) => entry.confidence)) * 100) : 0,
      source: { originalTitle: mission.title, titleLine: mission.titleLine, originalText, entryKeys: mission.entries.map((entry) => entry.key), contractor: mission.metadata.contractor ?? null, rewardAuec: mission.metadata.rewardAuec ?? null },
      cargoLots: mission.cargoLots.map((lot, lotIndex) => ({ ...lot, id: `mission-${missionIndex + 1}-${slug(mission.title)}-lot-${lotIndex + 1}` }))
    }));
    const ready = blockingIssues.length === 0 && missions.length > 0;
    return freeze({
      version: 2,
      originalText,
      entries,
      missions,
      issues: sortedIssues,
      blockingIssues,
      warnings,
      ready,
      status: blockingIssues.length ? 'blocked' : warnings.length ? 'review' : 'ready',
      confidence: Math.max(0, Math.min(100, confidence)),
      summary: { missionCount: missionDrafts.length, cargoLotCount: missions.reduce((sum, mission) => sum + mission.cargoLots.length, 0), blockerCount: blockingIssues.length, warningCount: warnings.length, exactLocationCount: actionEntries.filter((entry) => entry.location.status === 'exact').length, customLocationCount: actionEntries.filter((entry) => entry.location.status === 'custom-confirmed').length }
    });
  }

  const api = freeze({ ...base, inspectMissionText, tokenizeCargoDetailed });
  root.SCCompanionMissionValidation = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
}(typeof globalThis !== 'undefined' ? globalThis : window));
