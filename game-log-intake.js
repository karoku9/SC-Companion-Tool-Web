'use strict';

(function exposeGameLogIntake(root) {
  const ACTION_TERMS = Object.freeze([
    ['drop off', 'deliver'],
    ['dropoff', 'deliver'],
    ['delivered', 'deliver'],
    ['deliver', 'deliver'],
    ['delivery', 'deliver'],
    ['pick up', 'pickup'],
    ['pickup', 'pickup'],
    ['picked up', 'pickup'],
    ['retrieve', 'pickup'],
    ['load', 'pickup'],
    ['collect', 'collect']
  ]);
  const CANDIDATE_PATTERN = /\b(?:mission|contract|objective|cargo|scu|collect|pickup|pick\s+up|deliver|delivery|drop\s*off|haul(?:ing)?)\b/i;
  const TIMESTAMP_PATTERN = /^<([^>]+)>/;
  const GUID_PATTERN = /\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/i;

  function freeze(value) {
    if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
    Object.values(value).forEach(freeze);
    return Object.freeze(value);
  }

  function normalize(value) {
    return String(value ?? '')
      .normalize('NFKD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[’']/g, '')
      .replace(/[^a-z0-9]+/g, ' ')
      .trim()
      .replace(/\s+/g, ' ');
  }

  function hash(value) {
    let result = 0x811c9dc5;
    const text = String(value ?? '');
    for (let index = 0; index < text.length; index += 1) {
      result ^= text.charCodeAt(index);
      result = Math.imul(result, 0x01000193);
    }
    return (result >>> 0).toString(16).padStart(8, '0');
  }

  function decodeQuoted(value) {
    return String(value ?? '')
      .replace(/\\"/g, '"')
      .replace(/\\n/g, ' ')
      .replace(/\\r/g, ' ')
      .replace(/\\t/g, ' ')
      .replace(/\\\\/g, '\\')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function parseEnvelope(rawLine) {
    const line = String(rawLine ?? '');
    const timestamp = line.match(TIMESTAMP_PATTERN)?.[1] ?? null;
    const notification = line.match(/<UpdateNotificationItem>\s+Notification\s+"((?:\\.|[^"\\])*)"/i);
    if (notification) {
      return freeze({ timestamp, message: decodeQuoted(notification[1]), kind: 'notification' });
    }
    const message = line.replace(TIMESTAMP_PATTERN, '').trim();
    return freeze({ timestamp, message, kind: /\b(?:mission|contract)\b/i.test(message) ? 'mission-log' : 'log-line' });
  }

  function keyValue(message, keys) {
    for (const key of keys) {
      const escaped = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const quoted = message.match(new RegExp(`\\b${escaped}\\s*[:=]\\s*["']([^"']+)["']`, 'i'));
      if (quoted) return quoted[1].trim();
      const plain = message.match(new RegExp(`\\b${escaped}\\s*[:=]\\s*([^,;|]+)`, 'i'));
      if (plain) return plain[1].trim();
    }
    return null;
  }

  function extractContractId(message) {
    const explicit = keyValue(message, ['contractId', 'contractGuid', 'contractInstanceId', 'missionId', 'missionGuid', 'missionInstanceId']);
    if (explicit) return explicit;
    const tagged = message.match(/\b(?:mission|contract)(?:\s+(?:id|guid|instance))?\s*[:=#]\s*["']?([a-z0-9_-]{6,})/i);
    if (tagged) return tagged[1];
    const guid = message.match(GUID_PATTERN)?.[0];
    return guid ?? null;
  }

  function extractTitle(message) {
    const explicit = keyValue(message, ['missionTitle', 'contractTitle', 'missionName', 'contractName', 'title']);
    if (explicit) return explicit;
    const accepted = message.match(/\b(?:mission|contract)\s+(?:accepted|started|tracked)\s*[:\-]\s*["']?([^"']+?)["']?(?=$|[.;])/i)
      ?? message.match(/\b(?:accepted|started|tracking)\s+(?:mission|contract)\s*["']([^"']+)["']/i);
    return accepted?.[1]?.trim() ?? null;
  }

  function extractAction(message) {
    const explicit = keyValue(message, ['action', 'objectiveAction', 'task']);
    const normalizedMessage = normalize(explicit ?? message);
    for (const [term, action] of ACTION_TERMS) {
      if (new RegExp(`(?:^|\\s)${term.replace(/\s+/g, '\\s+').replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?:$|\\s)`, 'i').test(normalizedMessage)) return action;
    }
    return null;
  }

  function operationalTerms(location, locationModel) {
    return [
      location.name,
      location.contextName,
      location.navigationTarget,
      ...(location.aliases ?? []),
      locationModel?.formatOperationalLabel?.(location)
    ].filter(Boolean).map((value) => ({ raw: String(value), normalized: normalize(value) })).filter((item) => item.normalized.length >= 3);
  }

  function extractLocation(message, locationModel) {
    const explicit = keyValue(message, ['location', 'destination', 'pickupLocation', 'deliveryLocation', 'address']);
    const haystacks = [explicit, message].filter(Boolean).map(normalize);
    const matches = [];
    (locationModel?.locations ?? []).filter((location) => location.operational).forEach((location) => {
      operationalTerms(location, locationModel).forEach((term) => {
        if (haystacks.some((haystack) => (` ${haystack} `).includes(` ${term.normalized} `))) {
          matches.push({ location, length: term.normalized.length, term: term.raw });
        }
      });
    });
    matches.sort((left, right) => right.length - left.length || left.location.id.localeCompare(right.location.id));
    if (!matches.length && explicit && locationModel?.searchOperationalLocations) {
      const candidates = locationModel.searchOperationalLocations(explicit, { limit: 2 });
      if (candidates.length === 1) matches.push({ location: candidates[0], length: normalize(explicit).length, term: explicit });
    }
    const best = matches[0];
    if (!best) return freeze({ status: 'unresolved', id: null, label: explicit ?? null, target: explicit ?? null, matchedTerm: null });
    const tied = matches.filter((item) => item.length === best.length && item.location.id !== best.location.id);
    if (tied.length) {
      return freeze({
        status: 'ambiguous',
        id: null,
        label: explicit ?? best.term,
        target: explicit ?? best.term,
        matchedTerm: best.term,
        candidates: [best, ...tied].map((item) => ({ id: item.location.id, label: locationModel.formatOperationalLabel(item.location) }))
      });
    }
    return freeze({
      status: 'exact',
      id: best.location.id,
      label: locationModel.formatOperationalLabel(best.location),
      target: best.location.navigationTarget ?? best.location.name,
      matchedTerm: best.term,
      candidates: []
    });
  }

  function extractCargo(message) {
    const explicitScu = keyValue(message, ['scu', 'quantity', 'amount', 'cargoScu']);
    const explicitCommodity = keyValue(message, ['commodity', 'cargo', 'item', 'material']);
    let scu = explicitScu ? Number(String(explicitScu).match(/-?\d+(?:\.\d+)?/)?.[0]) : null;
    let commodity = explicitCommodity;

    const quantityMatch = message.match(/(-?\d+(?:\.\d+)?)\s*SCU\b/i);
    if (!Number.isFinite(scu) && quantityMatch) scu = Number(quantityMatch[1]);

    if (!commodity && quantityMatch) {
      const after = message.slice((quantityMatch.index ?? 0) + quantityMatch[0].length)
        .replace(/^\s*(?:of\s+)?/i, '');
      const afterMatch = after.match(/^([a-z0-9][a-z0-9 _-]*?)(?=\s+(?:from|to|at|into|onto|for|on)\b|\s*[.,;|]|$)/i);
      if (afterMatch) commodity = afterMatch[1].trim();
    }

    if (!commodity && quantityMatch) {
      const before = message.slice(0, quantityMatch.index).match(/([a-z][a-z0-9 _-]{1,40})\s*$/i);
      if (before && !/\b(?:collect|pickup|deliver|dropoff|mission|contract|objective)$/i.test(before[1].trim())) commodity = before[1].trim();
    }

    if (commodity) {
      commodity = commodity
        .replace(/\b(?:from|to|at|into|onto|for|on)\b.*$/i, '')
        .replace(/^["']|["']$/g, '')
        .trim();
    }

    return freeze({
      scu: Number.isFinite(scu) ? scu : null,
      commodity: commodity || null,
      token: commodity ? normalize(commodity).replace(/\s+/g, '-') : null
    });
  }

  function confidenceFor(event) {
    const fields = [event.action, event.location.id, event.cargo.scu, event.cargo.commodity];
    const present = fields.filter((value) => value !== null && value !== undefined && value !== '').length;
    if (present === 4 && event.location.status === 'exact' && event.cargo.scu > 0) return 1;
    if (present >= 3) return 0.72;
    if (present >= 2) return 0.5;
    return 0.25;
  }

  function parseLine(rawLine, options = {}) {
    const sourceName = String(options.sourceName ?? 'Game.log');
    const lineNumber = Number(options.lineNumber ?? 0) || null;
    const byteOffset = Number(options.byteOffset ?? 0) || 0;
    const envelope = parseEnvelope(rawLine);
    const message = envelope.message;
    if (!CANDIDATE_PATTERN.test(message)) return null;

    const location = extractLocation(message, options.locationModel);
    const action = extractAction(message);
    const cargo = extractCargo(message);
    const title = extractTitle(message);
    const contractId = extractContractId(message);
    const candidate = Boolean(action || cargo.scu || cargo.commodity || location.id || title || contractId);
    if (!candidate) return null;

    const base = {
      version: 1,
      id: `gle-${hash(String(rawLine))}`,
      sourceName,
      lineNumber,
      byteOffset,
      timestamp: envelope.timestamp,
      envelopeKind: envelope.kind,
      rawLine: String(rawLine),
      message,
      contractId,
      title,
      action,
      location,
      cargo
    };
    const confidence = confidenceFor(base);
    const complete = Boolean(action && location.id && Number.isFinite(cargo.scu) && cargo.scu > 0 && cargo.commodity);
    return freeze({ ...base, confidence, status: complete ? 'complete' : 'partial' });
  }

  function parseLines(text, options = {}) {
    const lines = String(text ?? '').split(/\r?\n/);
    const baseLineNumber = Number(options.baseLineNumber ?? 1);
    let relativeByteOffset = 0;
    const events = [];
    lines.forEach((line, index) => {
      if (!line && index === lines.length - 1) return;
      const event = parseLine(line, {
        ...options,
        lineNumber: baseLineNumber + index,
        byteOffset: Number(options.baseByteOffset ?? 0) + relativeByteOffset
      });
      if (event) events.push(event);
      relativeByteOffset += new TextEncoder().encode(`${line}\n`).byteLength;
    });
    return freeze(events);
  }

  function missionKey(event) {
    return event.contractId ? `contract:${normalize(event.contractId)}` : event.title ? `title:${normalize(event.title)}` : 'batch:unidentified';
  }

  function buildDraft(events) {
    const completeEvents = (events ?? []).filter((event) => event.status === 'complete');
    const unresolvedEvents = (events ?? []).filter((event) => event.status !== 'complete');
    const groups = new Map();
    completeEvents.forEach((event) => {
      const key = missionKey(event);
      const group = groups.get(key) ?? { key, title: event.title, contractId: event.contractId, events: [] };
      if (!group.title && event.title) group.title = event.title;
      if (!group.contractId && event.contractId) group.contractId = event.contractId;
      if (!group.events.some((existing) => existing.id === event.id)) group.events.push(event);
      groups.set(key, group);
    });

    const missions = [...groups.values()].map((group, index) => {
      const title = group.title || (group.contractId ? `Game.log contract ${String(group.contractId).slice(0, 12)}` : `Game.log assisted import ${index + 1}`);
      const objectiveKeys = new Set();
      const objectives = group.events.flatMap((event) => {
        const key = [event.action, event.location.id, event.cargo.scu, event.cargo.token].join('|');
        if (objectiveKeys.has(key)) return [];
        objectiveKeys.add(key);
        return [{
          action: event.action,
          location: event.location.target,
          cargo: `${event.cargo.scu}scu ${event.cargo.token}`,
          eventId: event.id,
          provenance: {
            sourceName: event.sourceName,
            lineNumber: event.lineNumber,
            timestamp: event.timestamp,
            rawLine: event.rawLine
          }
        }];
      });
      return freeze({ key: group.key, title, contractId: group.contractId, objectives: freeze(objectives) });
    });

    const draftText = missions.map((mission) => [mission.title, ...mission.objectives.map((objective) => `${objective.action} ${objective.location} ${objective.cargo}`)].join('\n')).join('\n\n');
    const confidence = completeEvents.length
      ? Math.round((completeEvents.reduce((sum, event) => sum + event.confidence, 0) / completeEvents.length) * 100)
      : 0;
    return freeze({
      version: 1,
      draftText,
      missions: freeze(missions),
      completeEvents: freeze(completeEvents),
      unresolvedEvents: freeze(unresolvedEvents),
      confidence,
      summary: freeze({
        eventCount: (events ?? []).length,
        completeEventCount: completeEvents.length,
        unresolvedEventCount: unresolvedEvents.length,
        missionCount: missions.length
      })
    });
  }

  function mergeImportedEvents(previousEvents, incomingEvents, processedIds = []) {
    const seen = new Set(processedIds);
    const fresh = [];
    (incomingEvents ?? []).forEach((event) => {
      if (seen.has(event.id)) return;
      seen.add(event.id);
      fresh.push(event);
    });
    const merged = [...(previousEvents ?? []), ...fresh].slice(-500);
    return freeze({
      events: freeze(merged),
      fresh: freeze(fresh),
      processedIds: freeze([...seen].slice(-4000))
    });
  }

  const api = freeze({
    normalize,
    hash,
    parseEnvelope,
    parseLine,
    parseLines,
    buildDraft,
    mergeImportedEvents
  });
  root.SCCompanionGameLogIntake = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
}(typeof globalThis !== 'undefined' ? globalThis : window));