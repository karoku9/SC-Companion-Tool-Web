'use strict';

(function exposeMissionValidation(root) {
  const ACTIONS = Object.freeze(['collect', 'pickup', 'deliver']);
  const SEVERITY_WEIGHT = Object.freeze({ error: 3, warning: 2, info: 1 });

  function normalize(value) {
    return String(value ?? '')
      .normalize('NFKD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim()
      .toLowerCase()
      .replace(/\s+/g, ' ');
  }

  function slug(value) {
    return normalize(value)
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
  }

  function freezeObject(value) {
    if (!value || typeof value !== 'object') return value;
    Object.values(value).forEach(freezeObject);
    return Object.freeze(value);
  }

  function editDistance(leftValue, rightValue) {
    const left = normalize(leftValue);
    const right = normalize(rightValue);
    const rows = Array.from({ length: left.length + 1 }, (_, index) => [index]);
    for (let column = 0; column <= right.length; column += 1) rows[0][column] = column;
    for (let row = 1; row <= left.length; row += 1) {
      for (let column = 1; column <= right.length; column += 1) {
        const substitution = left[row - 1] === right[column - 1] ? 0 : 1;
        rows[row][column] = Math.min(
          rows[row - 1][column] + 1,
          rows[row][column - 1] + 1,
          rows[row - 1][column - 1] + substitution
        );
      }
    }
    return rows[left.length][right.length];
  }

  function suggestedAction(token) {
    return ACTIONS
      .map((action) => ({ action, distance: editDistance(token, action) }))
      .sort((left, right) => left.distance - right.distance)[0] ?? null;
  }

  function locationValues(location, locationModel) {
    return [
      location?.name,
      location?.contextName,
      location?.navigationTarget,
      ...(location?.aliases ?? []),
      locationModel?.formatOperationalLabel?.(location)
    ].filter(Boolean).map(normalize);
  }

  function inspectLocation(rawName, locationModel, options, entryKey) {
    const name = String(rawName ?? '').trim();
    const normalizedName = normalize(name);
    const candidates = (locationModel?.searchOperationalLocations?.(name) ?? []).slice(0, 5);
    const exact = candidates.filter((candidate) => locationValues(candidate, locationModel).includes(normalizedName));

    if (exact.length === 1) {
      const location = exact[0];
      return {
        status: 'exact',
        confidence: 1,
        id: location.id,
        label: locationModel.formatOperationalLabel(location),
        raw: name,
        candidates: []
      };
    }

    if (exact.length > 1 || candidates.length > 1) {
      return {
        status: 'ambiguous',
        confidence: 0.45,
        id: null,
        label: name,
        raw: name,
        candidates: candidates.map((location) => ({
          id: location.id,
          label: locationModel.formatOperationalLabel(location),
          navigationTarget: location.navigationTarget ?? location.name
        }))
      };
    }

    if (candidates.length === 1) {
      const location = candidates[0];
      return {
        status: 'probable',
        confidence: 0.78,
        id: location.id,
        label: locationModel.formatOperationalLabel(location),
        raw: name,
        candidates: [{
          id: location.id,
          label: locationModel.formatOperationalLabel(location),
          navigationTarget: location.navigationTarget ?? location.name
        }]
      };
    }

    const confirmedValue = normalize(options?.confirmedCustomLocations?.[entryKey]);
    if (confirmedValue && confirmedValue === normalizedName) {
      return {
        status: 'custom-confirmed',
        confidence: 0.55,
        id: `custom-${slug(name) || entryKey}`,
        label: name,
        raw: name,
        candidates: []
      };
    }

    return {
      status: 'unknown',
      confidence: 0.2,
      id: null,
      label: name,
      raw: name,
      candidates: []
    };
  }

  function tokenizeCargoDetailed(value) {
    const text = String(value ?? '').trim();
    const pattern = /(-?\d+(?:\.\d+)?)\s*scu\s+([a-z0-9][a-z0-9_-]*)/gi;
    const items = [];
    const ranges = [];
    let match;
    while ((match = pattern.exec(text)) !== null) {
      items.push({
        scu: Number(match[1]),
        commodity: match[2],
        raw: match[0],
        start: match.index,
        end: pattern.lastIndex
      });
      ranges.push([match.index, pattern.lastIndex]);
    }

    let remainder = '';
    let cursor = 0;
    ranges.forEach(([start, end]) => {
      remainder += text.slice(cursor, start);
      cursor = end;
    });
    remainder += text.slice(cursor);
    remainder = remainder.replace(/[\s,;+|/]+/g, ' ').trim();

    return {
      text,
      items,
      remainder,
      confidence: items.length && !remainder && items.every((item) => item.scu > 0) ? 1 : items.length ? 0.62 : 0
    };
  }

  function issue(input) {
    return freezeObject({
      severity: input.severity,
      code: input.code,
      line: input.line ?? null,
      entryKey: input.entryKey ?? null,
      field: input.field ?? null,
      message: input.message,
      suggestions: input.suggestions ?? []
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
      const title = String(rawTitle ?? '').trim();
      const missionIndex = missionDrafts.length;
      const key = `mission-${missionIndex}`;
      currentMission = {
        key,
        index: missionIndex,
        title,
        titleLine: lineNumber,
        explicitTitle: explicit,
        entries: [],
        pickupPools: [],
        cargoLots: []
      };
      missionDrafts.push(currentMission);
      entries.push({
        key,
        kind: 'title',
        missionKey: key,
        missionIndex,
        line: lineNumber,
        raw: rawLines[lineNumber - 1] ?? '',
        title,
        confidence: title ? 1 : 0
      });
      if (!title) {
        issues.push(issue({ severity: 'error', code: 'missing-title', line: lineNumber, entryKey: key, field: 'title', message: `Line ${lineNumber}: mission title is required.` }));
      }
    }

    rawLines.forEach((rawLine, zeroIndex) => {
      const lineNumber = zeroIndex + 1;
      const line = rawLine.trim();
      if (!line) return;

      const firstToken = line.match(/^([a-z]+)\b/i)?.[1] ?? '';
      const exactAction = ACTIONS.includes(normalize(firstToken));
      const actionCandidate = suggestedAction(firstToken);
      const hasCargoQuantity = /-?\d+(?:\.\d+)?\s*scu\b/i.test(line);
      const looksLikeObjective = hasCargoQuantity && actionCandidate?.distance <= 2;
      const explicitTitle = line.match(/^mission\s*:\s*(.*)$/i);

      if (!exactAction && !looksLikeObjective) {
        startMission(explicitTitle ? explicitTitle[1] : line, lineNumber, Boolean(explicitTitle));
        actionIndex = 0;
        return;
      }

      const missionKey = currentMission?.key ?? `orphan-${lineNumber}`;
      const entryKey = currentMission ? `${missionKey}-action-${actionIndex}` : missionKey;
      actionIndex += 1;
      const action = exactAction ? normalize(firstToken) : actionCandidate?.action ?? normalize(firstToken);
      const payload = line.slice(firstToken.length).trim();
      const firstCargo = payload.search(/-?\d+(?:\.\d+)?\s*scu/i);
      const rawLocation = firstCargo >= 0 ? payload.slice(0, firstCargo).trim() : payload.trim();
      const cargoText = firstCargo >= 0 ? payload.slice(firstCargo).trim() : '';
      const cargo = tokenizeCargoDetailed(cargoText);
      const location = inspectLocation(rawLocation, locationModel, options, entryKey);
      const entry = {
        key: entryKey,
        kind: 'action',
        missionKey,
        missionIndex: currentMission?.index ?? -1,
        line: lineNumber,
        raw: rawLine,
        action,
        originalAction: normalize(firstToken),
        actionConfidence: exactAction ? 1 : 0.35,
        rawLocation,
        location,
        cargoText,
        cargo,
        confidence: Math.min(exactAction ? 1 : 0.35, location.confidence, cargo.confidence)
      };
      entries.push(entry);

      if (!currentMission) {
        issues.push(issue({ severity: 'error', code: 'objective-before-title', line: lineNumber, entryKey, field: 'mission', message: `Line ${lineNumber}: add a mission title before this objective.` }));
        return;
      }
      currentMission.entries.push(entry);

      if (!exactAction) {
        issues.push(issue({ severity: 'error', code: 'unknown-action', line: lineNumber, entryKey, field: 'action', message: `Line ${lineNumber}: “${firstToken}” is not a supported action. Review the suggested “${action}”.`, suggestions: [action] }));
      }
      if (!rawLocation) {
        issues.push(issue({ severity: 'error', code: 'missing-location', line: lineNumber, entryKey, field: 'location', message: `Line ${lineNumber}: location is required before the cargo quantity.` }));
      } else if (location.status === 'unknown') {
        issues.push(issue({ severity: 'error', code: 'unverified-location', line: lineNumber, entryKey, field: 'location', message: `Line ${lineNumber}: “${rawLocation}” is not in the verified location registry. Correct it or explicitly keep it as a custom location.` }));
      } else if (location.status === 'ambiguous') {
        issues.push(issue({ severity: 'error', code: 'ambiguous-location', line: lineNumber, entryKey, field: 'location', message: `Line ${lineNumber}: “${rawLocation}” matches more than one location. Select the intended destination.`, suggestions: location.candidates }));
      } else if (location.status === 'probable') {
        issues.push(issue({ severity: 'warning', code: 'probable-location', line: lineNumber, entryKey, field: 'location', message: `Line ${lineNumber}: interpreted “${rawLocation}” as ${location.label}.`, suggestions: location.candidates }));
      } else if (location.status === 'custom-confirmed') {
        issues.push(issue({ severity: 'warning', code: 'custom-location', line: lineNumber, entryKey, field: 'location', message: `Line ${lineNumber}: custom location “${rawLocation}” is accepted but has no verified map or navigation data.` }));
      }

      if (firstCargo < 0 || !cargo.items.length) {
        issues.push(issue({ severity: 'error', code: 'missing-cargo', line: lineNumber, entryKey, field: 'cargo', message: `Line ${lineNumber}: add cargo as “2scu commodity”.` }));
      }
      cargo.items.filter((item) => !Number.isFinite(item.scu) || item.scu <= 0).forEach((item) => {
        issues.push(issue({ severity: 'error', code: 'invalid-scu', line: lineNumber, entryKey, field: 'cargo', message: `Line ${lineNumber}: SCU for ${item.commodity} must be greater than zero.` }));
      });
      if (cargo.remainder) {
        issues.push(issue({ severity: 'error', code: 'unparsed-cargo', line: lineNumber, entryKey, field: 'cargo', message: `Line ${lineNumber}: could not parse “${cargo.remainder}”. Use repeated “SCU commodity” pairs.` }));
      }
    });

    if (!missionDrafts.length && originalText.trim()) {
      issues.push(issue({ severity: 'error', code: 'no-missions', line: null, field: 'mission', message: 'No mission titles were found.' }));
    }
    if (!originalText.trim()) {
      issues.push(issue({ severity: 'error', code: 'empty-input', line: null, field: 'mission', message: 'Paste at least one mission before reviewing.' }));
    }

    missionDrafts.forEach((mission) => {
      if (!mission.entries.length) {
        issues.push(issue({ severity: 'error', code: 'mission-without-objectives', line: mission.titleLine, entryKey: mission.key, field: 'mission', message: `${mission.title || 'Mission'} has no pickup or delivery objectives.` }));
      }

      mission.entries.forEach((entry) => {
        if (!entry.location.id || !entry.cargo.items.length || entry.cargo.remainder || entry.cargo.items.some((item) => item.scu <= 0)) return;
        if (entry.action === 'collect' || entry.action === 'pickup') {
          entry.cargo.items.forEach((item) => mission.pickupPools.push({
            commodity: item.commodity,
            remaining: item.scu,
            pickupType: entry.action,
            pickupLocationId: entry.location.id,
            pickupLocationLabel: entry.location.label,
            sourceEntry: entry
          }));
          return;
        }

        entry.cargo.items.forEach((deliveryItem) => {
          let remaining = deliveryItem.scu;
          mission.pickupPools
            .filter((pool) => normalize(pool.commodity) === normalize(deliveryItem.commodity) && pool.remaining > 0)
            .forEach((pool) => {
              if (remaining <= 0) return;
              const allocated = Math.min(pool.remaining, remaining);
              const confidence = Math.min(pool.sourceEntry.confidence, entry.confidence);
              mission.cargoLots.push({
                id: `${mission.key}-lot-${mission.cargoLots.length + 1}`,
                commodity: pool.commodity,
                scu: allocated,
                pickupType: pool.pickupType,
                pickupLocationId: pool.pickupLocationId,
                pickupLocationLabel: pool.pickupLocationLabel,
                deliveryLocationId: entry.location.id,
                deliveryLocationLabel: entry.location.label,
                confidence,
                source: {
                  missionTitleLine: mission.titleLine,
                  pickupLine: pool.sourceEntry.line,
                  deliveryLine: entry.line,
                  pickupText: pool.sourceEntry.raw,
                  deliveryText: entry.raw,
                  pickupLocationStatus: pool.sourceEntry.location.status,
                  deliveryLocationStatus: entry.location.status
                }
              });
              pool.remaining -= allocated;
              remaining -= allocated;
            });
          if (remaining > 0) {
            issues.push(issue({ severity: 'error', code: 'unmatched-delivery', line: entry.line, entryKey: entry.key, field: 'cargo', message: `Line ${entry.line}: ${remaining} SCU ${deliveryItem.commodity} has no matching pickup in ${mission.title}.` }));
          }
        });
      });

      mission.pickupPools.filter((pool) => pool.remaining > 0).forEach((pool) => {
        issues.push(issue({ severity: 'warning', code: 'undelivered-pickup', line: pool.sourceEntry.line, entryKey: pool.sourceEntry.key, field: 'cargo', message: `${mission.title}: ${pool.remaining} SCU ${pool.commodity} at ${pool.pickupLocationLabel} has no delivery.` }));
      });

      if (mission.entries.length && !mission.cargoLots.length) {
        issues.push(issue({ severity: 'error', code: 'no-complete-cargo-flow', line: mission.titleLine, entryKey: mission.key, field: 'cargo', message: `${mission.title} has no complete pickup-to-delivery cargo flow.` }));
      }
    });

    const sortedIssues = [...issues].sort((left, right) => (
      SEVERITY_WEIGHT[right.severity] - SEVERITY_WEIGHT[left.severity]
      || (left.line ?? Number.MAX_SAFE_INTEGER) - (right.line ?? Number.MAX_SAFE_INTEGER)
    ));
    const blockingIssues = sortedIssues.filter((item) => item.severity === 'error');
    const warnings = sortedIssues.filter((item) => item.severity === 'warning');
    const fieldScores = entries.flatMap((entry) => entry.kind === 'title'
      ? [entry.confidence]
      : [entry.actionConfidence, entry.location.confidence, entry.cargo.confidence]);
    const rawConfidence = fieldScores.length
      ? fieldScores.reduce((sum, value) => sum + value, 0) / fieldScores.length
      : 0;
    const confidence = Math.max(0, Math.min(100, Math.round(rawConfidence * 100)));
    const ready = blockingIssues.length === 0 && missionDrafts.some((mission) => mission.cargoLots.length);
    const status = blockingIssues.length ? 'blocked' : warnings.length ? 'review' : 'ready';
    const missions = missionDrafts
      .filter((mission) => mission.title && mission.cargoLots.length)
      .map((mission, missionIndex) => ({
        id: `mission-${missionIndex + 1}-${slug(mission.title)}`,
        title: mission.title,
        category: 'cargo',
        confidence: mission.entries.length
          ? Math.round(Math.min(...mission.entries.map((entry) => entry.confidence)) * 100)
          : 0,
        source: {
          originalTitle: mission.title,
          titleLine: mission.titleLine,
          originalText,
          entryKeys: mission.entries.map((entry) => entry.key)
        },
        cargoLots: mission.cargoLots.map((lot, lotIndex) => ({
          ...lot,
          id: `mission-${missionIndex + 1}-${slug(mission.title)}-lot-${lotIndex + 1}`
        }))
      }));

    return freezeObject({
      version: 1,
      originalText,
      entries,
      missions,
      issues: sortedIssues,
      blockingIssues,
      warnings,
      ready,
      status,
      confidence,
      summary: {
        missionCount: missionDrafts.length,
        cargoLotCount: missions.reduce((sum, mission) => sum + mission.cargoLots.length, 0),
        blockerCount: blockingIssues.length,
        warningCount: warnings.length,
        exactLocationCount: entries.filter((entry) => entry.kind === 'action' && entry.location.status === 'exact').length,
        customLocationCount: entries.filter((entry) => entry.kind === 'action' && entry.location.status === 'custom-confirmed').length
      }
    });
  }

  function serializeReview(reviewMissions) {
    return (reviewMissions ?? []).map((mission) => {
      const title = String(mission.title ?? '').trim();
      const objectives = (mission.objectives ?? []).map((objective) => {
        const action = ACTIONS.includes(normalize(objective.action)) ? normalize(objective.action) : String(objective.action ?? '').trim();
        return `${action} ${String(objective.location ?? '').trim()} ${String(objective.cargo ?? '').trim()}`.trim();
      });
      return [title, ...objectives].join('\n');
    }).join('\n\n');
  }

  function snapshot(report, sourceText, reviewedText) {
    return freezeObject({
      version: report.version,
      sourceText: String(sourceText ?? report.originalText),
      reviewedText: String(reviewedText ?? report.originalText),
      status: report.status,
      confidence: report.confidence,
      summary: report.summary,
      issues: report.issues.map((item) => ({
        severity: item.severity,
        code: item.code,
        line: item.line,
        entryKey: item.entryKey,
        field: item.field,
        message: item.message
      })),
      reviewedAt: new Date().toISOString()
    });
  }

  const api = freezeObject({ ACTIONS, inspectMissionText, tokenizeCargoDetailed, serializeReview, snapshot });
  root.SCCompanionMissionValidation = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
}(typeof globalThis !== 'undefined' ? globalThis : window));
