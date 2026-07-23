'use strict';

(function extendGameLogIntake(root) {
  const base = root.SCCompanionGameLogIntake
    ?? (typeof require !== 'undefined' ? require('./game-log-intake.js') : null);
  if (!base) throw new Error('game-log-intake.js must load before the correlation layer.');

  function freeze(value) {
    if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
    Object.values(value).forEach(freeze);
    return Object.freeze(value);
  }

  function normalizeActionPhrases(rawLine) {
    return String(rawLine ?? '')
      .replace(/\bpicked\s+up\b/gi, 'pickup')
      .replace(/\bpick\s+up\b/gi, 'pickup')
      .replace(/\bdropped\s+off\b/gi, 'deliver')
      .replace(/\bdrop\s+off\b/gi, 'dropoff');
  }

  function parseLine(rawLine, options = {}) {
    const normalizedLine = normalizeActionPhrases(rawLine);
    const parsed = base.parseLine(normalizedLine, options);
    if (!parsed) return null;
    const envelope = base.parseEnvelope(rawLine);
    return freeze({
      ...parsed,
      id: `gle-${base.hash(String(rawLine))}`,
      rawLine: String(rawLine),
      message: envelope.message,
      timestamp: envelope.timestamp,
      envelopeKind: envelope.kind
    });
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

  function correlatedEvents(events) {
    let context = null;
    return freeze((events ?? []).map((event) => {
      const hasIdentity = Boolean(event.contractId || event.title);
      if (hasIdentity) {
        context = {
          sourceKey: event.sourceKey ?? null,
          contractId: event.contractId ?? null,
          title: event.title ?? null,
          lineNumber: event.lineNumber ?? null,
          timestamp: event.timestamp ?? null,
          eventId: event.id
        };
      }
      if (event.status !== 'complete' || hasIdentity || !context) return event;
      const sameSource = !context.sourceKey || !event.sourceKey || context.sourceKey === event.sourceKey;
      const lineDistance = Number.isFinite(event.lineNumber) && Number.isFinite(context.lineNumber)
        ? event.lineNumber - context.lineNumber
        : 0;
      const closeEnough = lineDistance >= 0 && lineDistance <= 120;
      if (!sameSource || !closeEnough) return event;
      return freeze({
        ...event,
        contractId: context.contractId,
        title: context.title,
        correlation: freeze({
          kind: 'nearest-preceding-contract-context',
          sourceEventId: context.eventId,
          lineDistance,
          confidence: 0.72
        }),
        confidence: Math.min(event.confidence, 0.9)
      });
    }));
  }

  function missionKey(event) {
    return event.contractId
      ? `contract:${base.normalize(event.contractId)}`
      : event.title
        ? `title:${base.normalize(event.title)}`
        : 'batch:unidentified';
  }

  function buildDraft(events) {
    const correlated = correlatedEvents(events);
    const completeEvents = correlated.filter((event) => event.status === 'complete');
    const unresolvedEvents = correlated.filter((event) => event.status !== 'complete');
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
      const title = group.title || (group.contractId
        ? `Game.log contract ${String(group.contractId).slice(0, 12)}`
        : `Game.log assisted import ${index + 1}`);
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
            rawLine: event.rawLine,
            correlation: event.correlation ?? null
          }
        }];
      });
      return freeze({ key: group.key, title, contractId: group.contractId, objectives: freeze(objectives) });
    });

    const draftText = missions
      .map((mission) => [mission.title, ...mission.objectives.map((objective) => `${objective.action} ${objective.location} ${objective.cargo}`)].join('\n'))
      .join('\n\n');
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
        eventCount: correlated.length,
        completeEventCount: completeEvents.length,
        unresolvedEventCount: unresolvedEvents.length,
        missionCount: missions.length,
        correlatedEventCount: completeEvents.filter((event) => event.correlation).length
      })
    });
  }

  const api = freeze({
    ...base,
    normalizeActionPhrases,
    parseLine,
    parseLines,
    correlatedEvents,
    buildDraft
  });
  root.SCCompanionGameLogIntake = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
}(typeof globalThis !== 'undefined' ? globalThis : window));