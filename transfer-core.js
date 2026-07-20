'use strict';

(function exposeTransferCore(root) {
  const APPLICATION_ID = 'waypoint-cargo-companion';
  const EXPORT_SCHEMA_VERSION = 1;
  const clone = value => JSON.parse(JSON.stringify(value));
  const makeId = prefix => `${prefix}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;

  function payloadFor(type, state) {
    if (type === 'full') return clone(state);
    if (type === 'missions') return { missions: clone(state.missions || []) };
    if (type === 'fleet') return { fleet: clone(state.fleet || []), selectedShipId: state.selectedShipId };
    if (type === 'hauling-history') return { history: clone(state.hauling?.history || []) };
    if (type === 'preferences') return { preferences: clone(state.preferences || {}) };
    throw new Error(`Unsupported export type: ${type}`);
  }

  function createEnvelope(type, state, sourceApplicationVersion = 'checkpoint-3') {
    return { applicationId: APPLICATION_ID, exportSchemaVersion: EXPORT_SCHEMA_VERSION, exportType: type, exportedAt: new Date().toISOString(), sourceApplicationVersion, payload: payloadFor(type, state) };
  }

  function safeFilename(type, date = new Date()) { return `waypoint-cargo-companion-${type}-${date.toISOString().slice(0, 10)}.json`; }

  function validateMission(mission) {
    if (!mission || typeof mission.id !== 'string' || !Array.isArray(mission.cargo)) return 'Mission requires an id and cargo array.';
    if (mission.cargo.some(lot => !lot || typeof lot.id !== 'string' || lot.missionId !== mission.id)) return `Mission ${mission.id} has invalid cargo references.`;
    return '';
  }

  function validateRun(run) {
    if (!run || typeof run.id !== 'string' || !Array.isArray(run.batches) || !Array.isArray(run.steps)) return 'Hauling history entry requires id, batches and steps.';
    const batchIds = new Set(run.batches.map(batch => batch.id));
    if (run.steps.some(step => step.batchId && !batchIds.has(step.batchId))) return `Hauling run ${run.id} contains an invalid batch reference.`;
    if (Array.isArray(run.events) && run.events.some(event => event.batchId && !batchIds.has(event.batchId))) return `Hauling run ${run.id} contains an invalid event batch reference.`;
    return '';
  }

  function validateEnvelope(input) {
    let envelope;
    try { envelope = typeof input === 'string' ? JSON.parse(input) : clone(input); } catch (error) { return { valid: false, errors: ['Malformed JSON file.'], envelope: null }; }
    const errors = [];
    if (!envelope || envelope.applicationId !== APPLICATION_ID) errors.push('Unsupported application identifier.');
    if (envelope?.exportSchemaVersion !== EXPORT_SCHEMA_VERSION) errors.push('Unsupported export schema version.');
    if (!['full', 'missions', 'fleet', 'hauling-history', 'preferences'].includes(envelope?.exportType)) errors.push('Unsupported or missing export type.');
    if (!envelope?.payload || typeof envelope.payload !== 'object') errors.push('Export payload is missing.');
    const missions = envelope?.exportType === 'missions' ? envelope.payload?.missions : envelope?.exportType === 'full' ? envelope.payload?.missions : [];
    if (missions && !Array.isArray(missions)) errors.push('Mission payload must be an array.'); else (missions || []).forEach(mission => { const error = validateMission(mission); if (error) errors.push(error); });
    const history = envelope?.exportType === 'hauling-history' ? envelope.payload?.history : envelope?.exportType === 'full' ? envelope.payload?.hauling?.history : [];
    if (history && !Array.isArray(history)) errors.push('Hauling history payload must be an array.'); else (history || []).forEach(run => { const error = validateRun(run); if (error) errors.push(error); });
    if (envelope?.exportType === 'fleet' && !Array.isArray(envelope.payload?.fleet)) errors.push('Fleet payload must be an array.');
    return { valid: !errors.length, errors, envelope };
  }

  function remapMission(mission, existingMissionIds, existingLotIds, report) {
    const result = clone(mission); const oldMissionId = result.id;
    if (existingMissionIds.has(result.id)) { result.id = makeId('mission-import'); report.remapped += 1; }
    existingMissionIds.add(result.id);
    result.cargo = result.cargo.map(lot => { const next = clone(lot); if (existingLotIds.has(next.id)) { next.id = makeId('lot-import'); report.remapped += 1; } existingLotIds.add(next.id); next.missionId = result.id; return next; });
    if (oldMissionId !== result.id) report.messages.push(`Mission ${oldMissionId} remapped to ${result.id}.`);
    return result;
  }

  function remapRun(run, existingRunIds, report) {
    const result = clone(run); if (existingRunIds.has(result.id)) { const previous = result.id; result.id = makeId('haul-import'); report.remapped += 1; report.messages.push(`Hauling run ${previous} remapped to ${result.id}.`); } existingRunIds.add(result.id);
    const batchMap = new Map(); result.batches = result.batches.map(batch => { const next = clone(batch); const old = next.id; next.id = makeId('batch-import'); batchMap.set(old, next.id); report.remapped += 1; return next; });
    result.steps = result.steps.map(step => ({ ...clone(step), batchId: step.batchId ? batchMap.get(step.batchId) : undefined }));
    if (result.events) result.events = result.events.map(event => ({ ...clone(event), batchId: event.batchId ? batchMap.get(event.batchId) : undefined }));
    return result;
  }

  function previewImport(envelope, currentState) {
    const validation = validateEnvelope(envelope); if (!validation.valid) return { ...validation, report: null };
    const payload = validation.envelope.payload; const type = validation.envelope.exportType;
    const incomingMissions = type === 'missions' ? payload.missions : type === 'full' ? payload.missions || [] : [];
    const incomingFleet = type === 'fleet' ? payload.fleet : type === 'full' ? payload.fleet || [] : [];
    const incomingHistory = type === 'hauling-history' ? payload.history : type === 'full' ? payload.hauling?.history || [] : [];
    const missionIds = new Set((currentState.missions || []).map(item => item.id)); const fleetKeys = new Set((currentState.fleet || []).map(item => `${item.shipId}|${String(item.nickname || '').toLowerCase()}`)); const runIds = new Set((currentState.hauling?.history || []).map(item => item.id));
    return { valid: true, errors: [], envelope: validation.envelope, report: { type, missions: incomingMissions.length, missionCollisions: incomingMissions.filter(item => missionIds.has(item.id)).length, fleet: incomingFleet.length, fleetDuplicates: incomingFleet.filter(item => fleetKeys.has(`${item.shipId}|${String(item.nickname || '').toLowerCase()}`)).length, history: incomingHistory.length, historyCollisions: incomingHistory.filter(item => runIds.has(item.id)).length, preferences: Boolean(type === 'preferences' || type === 'full') } };
  }

  function mergeEnvelope(currentState, envelope, mode = 'merge') {
    const preview = previewImport(envelope, currentState); if (!preview.valid) throw new Error(preview.errors.join(' '));
    const source = preview.envelope.payload; const type = preview.envelope.exportType;
    if (mode === 'replace' && type === 'full') return { state: clone(source), report: { added: 0, skipped: 0, remapped: 0, replaced: 1, messages: ['Full local state replaced from validated backup.'] } };
    const next = clone(currentState); const report = { added: 0, skipped: 0, remapped: 0, replaced: 0, messages: [] };
    if (type === 'missions' || type === 'full') {
      const incoming = type === 'missions' ? source.missions : source.missions || []; const missionIds = new Set(next.missions.map(item => item.id)); const lotIds = new Set(next.missions.flatMap(item => item.cargo.map(lot => lot.id)));
      incoming.forEach(mission => { next.missions.push(remapMission(mission, missionIds, lotIds, report)); report.added += 1; });
    }
    if (type === 'fleet' || type === 'full') {
      const incoming = type === 'fleet' ? source.fleet : source.fleet || []; const keys = new Set(next.fleet.map(item => `${item.shipId}|${String(item.nickname || '').toLowerCase()}`)); const ids = new Set(next.fleet.map(item => item.id));
      incoming.forEach(entry => { const key = `${entry.shipId}|${String(entry.nickname || '').toLowerCase()}`; if (keys.has(key)) { report.skipped += 1; return; } const copy = clone(entry); if (ids.has(copy.id)) { copy.id = makeId('fleet-import'); report.remapped += 1; } ids.add(copy.id); keys.add(key); next.fleet.push(copy); report.added += 1; });
    }
    if (type === 'hauling-history' || type === 'full') {
      const incoming = type === 'hauling-history' ? source.history : source.hauling?.history || []; const ids = new Set((next.hauling?.history || []).map(item => item.id));
      incoming.forEach(run => { next.hauling.history.push(remapRun(run, ids, report)); report.added += 1; });
    }
    if (type === 'preferences' || type === 'full') { next.preferences = { ...next.preferences, ...clone(source.preferences || {}) }; report.replaced += 1; }
    return { state: next, report };
  }

  const api = { APPLICATION_ID, EXPORT_SCHEMA_VERSION, createEnvelope, safeFilename, validateEnvelope, previewImport, mergeEnvelope };
  root.TRANSFER_CORE = Object.freeze(api);
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
