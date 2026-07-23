'use strict';

(function exposeOcrIntake(root) {
  const ACTION_TERMS = Object.freeze([
    Object.freeze({ pattern: /\bdrop\s*off\b/i, value: 'deliver', confidence: 0.96, kind: 'explicit' }),
    Object.freeze({ pattern: /\bdeliver(?:ed)?\b/i, value: 'deliver', confidence: 1, kind: 'explicit' }),
    Object.freeze({ pattern: /\bpick\s*up\b/i, value: 'pickup', confidence: 0.98, kind: 'explicit' }),
    Object.freeze({ pattern: /\bpickup\b/i, value: 'pickup', confidence: 1, kind: 'explicit' }),
    Object.freeze({ pattern: /\bretrieve\b/i, value: 'pickup', confidence: 0.9, kind: 'explicit' }),
    Object.freeze({ pattern: /\bcollect\b/i, value: 'collect', confidence: 1, kind: 'explicit' }),
    Object.freeze({ pattern: /\bload\b/i, value: 'pickup', confidence: 0.82, kind: 'explicit' }),
    Object.freeze({ pattern: /^\s*from\s*[:\-]/i, value: 'pickup', confidence: 0.64, kind: 'derived-label' }),
    Object.freeze({ pattern: /^\s*(?:to|destination)\s*[:\-]/i, value: 'deliver', confidence: 0.64, kind: 'derived-label' })
  ]);
  const TITLE_LABEL_PATTERN = /^\s*(?:mission|contract|title|name)\s*[:\-]/i;
  const NOISE_PATTERN = /^(?:accepted|abandoned|reward|payment|reputation|deadline|distance|difficulty|legal|illegal|remaining|status|objectives?|description|contractor|verified|tracking)\b/i;

  function freeze(value) {
    if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
    Object.values(value).forEach(freeze);
    return Object.freeze(value);
  }

  function normalize(value) {
    return String(value ?? '')
      .normalize('NFKD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[’']/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, ' ')
      .trim()
      .replace(/\s+/g, ' ');
  }

  function slug(value) {
    return normalize(value).replace(/\s+/g, '-').replace(/^-|-$/g, '');
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

  function clampConfidence(value, fallback = 0.5) {
    const number = Number(value);
    if (!Number.isFinite(number)) return fallback;
    return Math.max(0, Math.min(1, number > 1 ? number / 100 : number));
  }

  function makeLines(text, options = {}) {
    const lineConfidence = options.lineConfidence ?? {};
    const globalConfidence = clampConfidence(options.globalConfidence, 0.68);
    return String(text ?? '').split(/\r?\n/).map((raw, zeroIndex) => ({
      index: zeroIndex,
      number: zeroIndex + 1,
      raw,
      text: raw.trim(),
      normalized: normalize(raw),
      confidence: clampConfidence(lineConfidence[zeroIndex + 1] ?? lineConfidence[zeroIndex], globalConfidence)
    })).filter((line) => line.text);
  }

  function extractAction(line) {
    if (!line?.text || TITLE_LABEL_PATTERN.test(line.text)) return null;
    for (const term of ACTION_TERMS) {
      if (term.pattern.test(line.text)) {
        return freeze({
          value: term.value,
          confidence: Math.min(term.confidence, line.confidence),
          provenance: { line: line.number, text: line.raw, kind: term.kind }
        });
      }
    }
    return null;
  }

  function selectActionAnchors(lines) {
    const candidates = lines.map((line, index) => ({ index, action: extractAction(line) })).filter((item) => item.action);
    const explicit = candidates.filter((item) => item.action.provenance.kind === 'explicit');
    return (explicit.length ? explicit : candidates).map((item) => item.index);
  }

  function locationTerms(location, locationModel) {
    return [
      location.name,
      location.contextName,
      location.navigationTarget,
      ...(location.aliases ?? []),
      locationModel?.formatOperationalLabel?.(location)
    ].filter(Boolean).map((value) => ({ raw: String(value), normalized: normalize(value) })).filter((item) => item.normalized.length >= 3);
  }

  function findLocation(line, locationModel) {
    if (!locationModel) return null;
    const matches = [];
    (locationModel.locations ?? []).filter((location) => location.operational).forEach((location) => {
      locationTerms(location, locationModel).forEach((term) => {
        if ((` ${line.normalized} `).includes(` ${term.normalized} `)) matches.push({ location, term, length: term.normalized.length });
      });
    });
    matches.sort((left, right) => right.length - left.length || left.location.id.localeCompare(right.location.id));

    if (!matches.length && locationModel.searchOperationalLocations) {
      const labelled = line.text.match(/\b(?:location|destination|from|to|pickup|delivery)\s*[:\-]\s*(.+)$/i)?.[1]?.trim();
      if (labelled) {
        const candidates = locationModel.searchOperationalLocations(labelled, { limit: 3 });
        if (candidates.length === 1) matches.push({ location: candidates[0], term: { raw: labelled, normalized: normalize(labelled) }, length: normalize(labelled).length });
      }
    }

    const best = matches[0];
    if (!best) return null;
    const tied = matches.filter((item) => item.length === best.length && item.location.id !== best.location.id);
    if (tied.length) {
      return freeze({
        id: null,
        value: best.term.raw,
        label: best.term.raw,
        status: 'ambiguous',
        confidence: Math.min(0.42, line.confidence),
        candidates: [best, ...tied].map((item) => ({ id: item.location.id, label: locationModel.formatOperationalLabel(item.location) })),
        provenance: { line: line.number, text: line.raw, kind: 'ambiguous-registry-match' }
      });
    }
    return freeze({
      id: best.location.id,
      value: best.location.navigationTarget ?? best.location.name,
      label: locationModel.formatOperationalLabel(best.location),
      status: 'exact',
      confidence: Math.min(1, line.confidence),
      candidates: [],
      provenance: { line: line.number, text: line.raw, kind: 'registry-match', matchedTerm: best.term.raw }
    });
  }

  function extractQuantity(line) {
    const exact = line.text.match(/(-?\d+(?:[.,]\d+)?)\s*S\s*C\s*U\b/i);
    if (exact) {
      const value = Number(exact[1].replace(',', '.'));
      return freeze({
        value: Number.isFinite(value) && value > 0 ? value : null,
        confidence: Math.min(value > 0 ? 1 : 0.2, line.confidence),
        provenance: { line: line.number, text: line.raw, kind: 'explicit-scu' },
        match: exact
      });
    }
    const labelled = line.text.match(/\b(?:quantity|amount|units)\s*[:\-]\s*(-?\d+(?:[.,]\d+)?)/i);
    if (labelled) {
      const value = Number(labelled[1].replace(',', '.'));
      return freeze({
        value: Number.isFinite(value) && value > 0 ? value : null,
        confidence: Math.min(value > 0 ? 0.66 : 0.2, line.confidence),
        provenance: { line: line.number, text: line.raw, kind: 'derived-quantity-label' },
        match: labelled
      });
    }
    return null;
  }

  function cleanCommodity(value) {
    return String(value ?? '')
      .replace(/^\s*(?:of\s+)?/i, '')
      .replace(/\b(?:from|to|at|into|onto|location|destination|pickup|delivery)\b.*$/i, '')
      .replace(/[|;,]+$/g, '')
      .trim();
  }

  function extractCommodity(line, quantity) {
    const labelled = line.text.match(/\b(?:commodity|cargo|material|item)\s*[:\-]\s*(.+)$/i);
    if (labelled) {
      const value = cleanCommodity(labelled[1]);
      if (value) return freeze({ value, confidence: Math.min(0.94, line.confidence), provenance: { line: line.number, text: line.raw, kind: 'labelled-commodity' } });
    }
    if (quantity?.match) {
      const end = (quantity.match.index ?? 0) + quantity.match[0].length;
      const value = cleanCommodity(line.text.slice(end));
      if (value && !NOISE_PATTERN.test(value)) return freeze({ value, confidence: Math.min(0.86, line.confidence), provenance: { line: line.number, text: line.raw, kind: 'same-line-after-scu' } });
    }
    return null;
  }

  function fieldCandidate(items, anchorIndex, score) {
    return items.map((item) => ({ item, score: score(item, Math.abs(item.line.index - anchorIndex)) }))
      .sort((left, right) => right.score - left.score)[0]?.item ?? null;
  }

  function objectiveWindow(lines, anchorPosition, nextAnchorPosition) {
    const anchor = lines[anchorPosition];
    const startIndex = Math.max(0, anchor.index - 2);
    const endIndex = nextAnchorPosition === null ? anchor.index + 7 : Math.min(lines[nextAnchorPosition].index - 1, anchor.index + 7);
    return lines.filter((line) => line.index >= startIndex && line.index <= endIndex);
  }

  function buildObjective(lines, anchorPosition, nextAnchorPosition, locationModel, objectiveIndex) {
    const anchor = lines[anchorPosition];
    const action = extractAction(anchor);
    const windowLines = objectiveWindow(lines, anchorPosition, nextAnchorPosition);
    const locations = windowLines.map((line) => ({ line, value: findLocation(line, locationModel) })).filter((item) => item.value);
    const quantities = windowLines.map((line) => ({ line, value: extractQuantity(line) })).filter((item) => item.value);

    const location = fieldCandidate(locations, anchor.index, (item, distance) => item.value.confidence + (item.line.index === anchor.index ? 0.25 : 0) - distance * 0.035)?.value ?? null;
    const quantityEntry = fieldCandidate(quantities, anchor.index, (item, distance) => item.value.confidence + (item.line.index === anchor.index ? 0.2 : 0) - distance * 0.04);
    const quantity = quantityEntry?.value ?? null;

    const commodityCandidates = windowLines.map((line) => {
      const lineQuantity = quantities.find((entry) => entry.line.index === line.index)?.value ?? null;
      const value = extractCommodity(line, lineQuantity);
      return value ? { line, value } : null;
    }).filter(Boolean);
    let commodity = fieldCandidate(commodityCandidates, quantityEntry?.line.index ?? anchor.index, (item, distance) => item.value.confidence - distance * 0.04)?.value ?? null;

    if (!commodity) {
      const fallbackLines = windowLines.filter((line) => (
        line.index !== anchor.index
        && !extractAction(line)
        && !findLocation(line, locationModel)
        && !extractQuantity(line)
        && !NOISE_PATTERN.test(line.text)
        && line.text.length >= 3
        && line.text.length <= 70
      ));
      const fallback = fallbackLines.sort((left, right) => Math.abs(left.index - (quantityEntry?.line.index ?? anchor.index)) - Math.abs(right.index - (quantityEntry?.line.index ?? anchor.index)))[0];
      if (fallback) commodity = freeze({ value: fallback.text, confidence: Math.min(0.48, fallback.confidence), provenance: { line: fallback.number, text: fallback.raw, kind: 'nearby-unlabelled-text' } });
    }

    const fieldScores = [action?.confidence ?? 0, location?.confidence ?? 0, quantity?.confidence ?? 0, commodity?.confidence ?? 0];
    const complete = Boolean(action?.value && location?.id && quantity?.value > 0 && commodity?.value);
    const confidence = Math.round((fieldScores.reduce((sum, value) => sum + value, 0) / fieldScores.length) * 100);
    return freeze({
      id: `ocr-objective-${objectiveIndex + 1}`,
      status: complete ? 'complete' : 'partial',
      confidence,
      action: action ?? freeze({ value: null, confidence: 0, provenance: { line: anchor.number, text: anchor.raw, kind: 'unresolved' } }),
      location: location ?? freeze({ id: null, value: null, label: null, status: 'unresolved', confidence: 0, candidates: [], provenance: { line: anchor.number, text: anchor.raw, kind: 'unresolved' } }),
      quantity: quantity ?? freeze({ value: null, confidence: 0, provenance: { line: anchor.number, text: anchor.raw, kind: 'unresolved' } }),
      commodity: commodity ?? freeze({ value: null, confidence: 0, provenance: { line: anchor.number, text: anchor.raw, kind: 'unresolved' } }),
      sourceRange: { startLine: windowLines[0]?.number ?? anchor.number, endLine: windowLines.at(-1)?.number ?? anchor.number },
      sourceLines: windowLines.map((line) => ({ line: line.number, text: line.raw, confidence: line.confidence }))
    });
  }

  function extractTitle(lines, anchors, sourceName) {
    const explicit = lines.find((line) => /\b(?:mission|contract|title|name)\s*[:\-]\s*\S/i.test(line.text));
    if (explicit) {
      const value = explicit.text.replace(/^.*?\b(?:mission|contract|title|name)\s*[:\-]\s*/i, '').trim();
      if (value) return freeze({ value, confidence: Math.min(0.92, explicit.confidence), provenance: { line: explicit.number, text: explicit.raw, kind: 'labelled-title' } });
    }
    const firstAnchorLine = anchors.length ? lines[anchors[0]].index : Number.MAX_SAFE_INTEGER;
    const candidate = lines.filter((line) => line.index < firstAnchorLine && !NOISE_PATTERN.test(line.text) && line.text.length >= 4 && line.text.length <= 90).at(-1);
    if (candidate) return freeze({ value: candidate.text, confidence: Math.min(0.62, candidate.confidence), provenance: { line: candidate.number, text: candidate.raw, kind: 'preceding-heading' } });
    const fallback = `OCR assisted import${sourceName ? ` · ${sourceName}` : ''}`;
    return freeze({ value: fallback, confidence: 0, provenance: { line: null, text: '', kind: 'generated-group-label' } });
  }

  function serializeReport(report, overrides = {}) {
    const title = String(overrides.title ?? report.title.value ?? '').trim();
    const objectives = report.objectives.map((objective) => {
      const edit = overrides.objectives?.[objective.id] ?? {};
      const action = String(edit.action ?? objective.action.value ?? '').trim();
      const location = String(edit.location ?? objective.location.value ?? objective.location.label ?? '').trim();
      const quantity = edit.quantity ?? objective.quantity.value;
      const commodity = String(edit.commodity ?? objective.commodity.value ?? '').trim();
      const cargo = Number(quantity) > 0 ? `${Number(quantity)}scu${commodity ? ` ${slug(commodity)}` : ''}` : commodity;
      return `${action} ${location} ${cargo}`.trim().replace(/\s+/g, ' ');
    }).filter(Boolean);
    return [title, ...objectives].filter(Boolean).join('\n');
  }

  function inspectOcrText(text, locationModel, options = {}) {
    const rawText = String(text ?? '');
    const lines = makeLines(rawText, options);
    const anchors = selectActionAnchors(lines);
    const title = extractTitle(lines, anchors, options.sourceName);
    const objectives = anchors.map((anchorPosition, index) => buildObjective(lines, anchorPosition, anchors[index + 1] ?? null, locationModel, index));
    const completeCount = objectives.filter((objective) => objective.status === 'complete').length;
    const confidenceParts = [title.confidence, ...objectives.map((objective) => objective.confidence / 100)];
    const confidence = Math.round((confidenceParts.length ? confidenceParts.reduce((sum, value) => sum + value, 0) / confidenceParts.length : 0) * 100);
    const report = {
      version: 1,
      id: `ocr-${hash(`${options.sourceName ?? ''}|${rawText}`)}`,
      source: {
        name: String(options.sourceName ?? 'image'),
        type: String(options.sourceType ?? 'image'),
        size: Math.max(0, Number(options.sourceSize ?? 0) || 0),
        width: Math.max(0, Number(options.width ?? 0) || 0),
        height: Math.max(0, Number(options.height ?? 0) || 0),
        hash: String(options.sourceHash ?? hash(rawText)),
        engine: String(options.engine ?? 'unknown'),
        engineVersion: String(options.engineVersion ?? ''),
        processedAt: String(options.processedAt ?? new Date().toISOString())
      },
      rawText,
      lines,
      title,
      objectives,
      confidence,
      ready: objectives.length > 0 && completeCount === objectives.length,
      summary: {
        lineCount: lines.length,
        objectiveCount: objectives.length,
        completeCount,
        unresolvedCount: objectives.length - completeCount
      }
    };
    report.draftText = serializeReport(report);
    return freeze(report);
  }

  const api = freeze({ normalize, slug, hash, makeLines, extractAction, findLocation, extractQuantity, extractCommodity, inspectOcrText, serializeReport });
  root.SCCompanionOcrIntake = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
}(typeof globalThis !== 'undefined' ? globalThis : window));
