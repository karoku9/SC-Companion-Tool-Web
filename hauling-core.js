'use strict';

(function exposeHaulingCore(root) {
  const clone = value => JSON.parse(JSON.stringify(value));
  const makeId = prefix => `${prefix}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;
  const reliabilityWeight = { high: 1, medium: 0.65, low: 0.3 };

  function defaultFilters(startingLocationId = 'everus', selectedFleetShipId = '') {
    return {
      startingLocationId, selectedFleetShipId, commodityId: 'all', legality: 'legal', minProfit: 0,
      minProfitPerScu: 0, maxInvestment: 500000, mode: 'one-way', includeLowReliability: false,
      capacityLimit: 0, quantity: 0, search: '', sort: 'balanced'
    };
  }

  function defaultHaulingState(startingLocationId = 'everus', selectedFleetShipId = '') {
    return { filters: defaultFilters(startingLocationId, selectedFleetShipId), draftPlan: null, activeRun: null, history: [], lastSearchAt: null, selectedOpportunityId: null };
  }

  function distanceBetween(a, b) {
    if (!a || !b || !Number.isFinite(a.x) || !Number.isFinite(a.y) || !Number.isFinite(b.x) || !Number.isFinite(b.y)) return null;
    return Math.hypot(a.x - b.x, a.y - b.y) * 1.35;
  }

  function normalizedFilters(filters, startId, fleetId) {
    const base = defaultFilters(startId, fleetId);
    const result = { ...base, ...(filters || {}) };
    ['minProfit', 'minProfitPerScu', 'maxInvestment', 'capacityLimit', 'quantity'].forEach(key => { result[key] = Math.max(0, Number(result[key] || 0)); });
    result.mode = result.mode === 'multi-stop' ? 'multi-stop' : 'one-way';
    result.includeLowReliability = Boolean(result.includeLowReliability);
    return result;
  }

  function opportunityQuantity(buy, sell, shipCapacity, filters) {
    const capacity = Math.max(0, Math.min(shipCapacity, filters.capacityLimit || shipCapacity));
    const availability = Number.isFinite(buy.inventorySCU) ? Math.max(0, buy.inventorySCU) : capacity;
    const demand = Number.isFinite(sell.demandSCU) ? Math.max(0, sell.demandSCU) : capacity;
    const investment = filters.maxInvestment > 0 ? Math.floor(filters.maxInvestment / buy.pricePerSCU) : capacity;
    const requested = filters.quantity > 0 ? filters.quantity : capacity;
    const quantity = Math.max(0, Math.floor(Math.min(capacity, availability, demand, investment, requested)));
    const limiters = [];
    if (quantity === capacity) limiters.push('capacity');
    if (quantity === availability) limiters.push('availability');
    if (quantity === demand) limiters.push('demand');
    if (quantity === investment) limiters.push('investment');
    if (filters.quantity > 0 && quantity === requested) limiters.push('requested quantity');
    return { quantity, capacity, availability, demand, investment, requested, limiters };
  }

  function findOpportunities({ data, ship, filters, showIllegal = false }) {
    const resolved = normalizedFilters(filters, filters?.startingLocationId, filters?.selectedFleetShipId);
    const commodities = new Map(data.commodities.map(item => [item.id, item]));
    const locations = new Map(data.locations.map(item => [item.id, item]));
    const buys = data.marketRecords.filter(record => record.transactionType === 'buy');
    const sells = data.marketRecords.filter(record => record.transactionType === 'sell');
    const rows = [];
    buys.forEach(buy => {
      sells.filter(sell => sell.commodityId === buy.commodityId && sell.locationId !== buy.locationId && sell.pricePerSCU > buy.pricePerSCU).forEach(sell => {
        const commodity = commodities.get(buy.commodityId); const buyLocation = locations.get(buy.locationId); const sellLocation = locations.get(sell.locationId);
        if (!commodity || !buyLocation || !sellLocation) return;
        if (commodity.legality === 'illegal' && !showIllegal) return;
        if (resolved.legality !== 'all' && commodity.legality !== resolved.legality) return;
        if (resolved.commodityId !== 'all' && commodity.id !== resolved.commodityId) return;
        if (!resolved.includeLowReliability && (buy.reliability === 'low' || sell.reliability === 'low')) return;
        const search = resolved.search.trim().toLowerCase();
        if (search && !`${commodity.name} ${buyLocation.name} ${sellLocation.name} ${buy.terminalName} ${sell.terminalName}`.toLowerCase().includes(search)) return;
        const limits = opportunityQuantity(buy, sell, ship.capacity, resolved);
        if (!limits.quantity) return;
        const profitPerSCU = sell.pricePerSCU - buy.pricePerSCU;
        const investment = limits.quantity * buy.pricePerSCU; const revenue = limits.quantity * sell.pricePerSCU; const profit = revenue - investment;
        if (profit < resolved.minProfit || profitPerSCU < resolved.minProfitPerScu) return;
        const distance = distanceBetween(buyLocation, sellLocation); const durationMinutes = distance === null ? null : Math.round(distance * 1.8 + 16);
        const confidence = Math.min(reliabilityWeight[buy.reliability] || 0.3, reliabilityWeight[sell.reliability] || 0.3);
        const legalityRisk = commodity.legality === 'illegal' ? 3 : commodity.legality === 'restricted' ? 2 : 0;
        const riskScore = legalityRisk + (confidence < 0.5 ? 2 : confidence < 0.8 ? 1 : 0) + (commodity.valueTier === 'high' ? 1 : 0);
        rows.push({
          id: `opp-${buy.id}-${sell.id}`, commodityId: commodity.id, commodityName: commodity.name, category: commodity.category, legality: commodity.legality,
          buyRecordId: buy.id, sellRecordId: sell.id, buyLocationId: buy.locationId, buyLocationName: buyLocation.name, sellLocationId: sell.locationId,
          sellLocationName: sellLocation.name, buyTerminalName: buy.terminalName, sellTerminalName: sell.terminalName, buyPricePerSCU: buy.pricePerSCU,
          sellPricePerSCU: sell.pricePerSCU, profitPerSCU, quantity: limits.quantity, requiredInvestment: investment, estimatedRevenue: revenue,
          estimatedProfit: profit, distance, durationMinutes, risk: riskScore >= 4 ? 'High' : riskScore >= 2 ? 'Moderate' : 'Low', confidence,
          reliability: confidence >= 0.9 ? 'high' : confidence >= 0.55 ? 'medium' : 'low', referenceAge: `${buy.referenceAge} / ${sell.referenceAge}`,
          notes: [buy.note, sell.note].filter(Boolean), capacityCompatible: limits.quantity <= ship.capacity, shipCapacity: ship.capacity,
          unusedCapacity: Math.max(0, ship.capacity - limits.quantity), limits, balancedScore: 0
        });
      });
    });
    const maxProfit = Math.max(1, ...rows.map(row => row.estimatedProfit)); const maxMargin = Math.max(1, ...rows.map(row => row.profitPerSCU));
    const maxDuration = Math.max(1, ...rows.map(row => row.durationMinutes || 180));
    rows.forEach(row => { row.balancedScore = (row.estimatedProfit / maxProfit) * 45 + (row.profitPerSCU / maxMargin) * 25 + row.confidence * 15 + (1 - Math.min(1, (row.durationMinutes || maxDuration) / maxDuration)) * 15; });
    const sorters = {
      profit: (a, b) => b.estimatedProfit - a.estimatedProfit,
      margin: (a, b) => b.profitPerSCU - a.profitPerSCU,
      investment: (a, b) => a.requiredInvestment - b.requiredInvestment,
      distance: (a, b) => (a.distance ?? Infinity) - (b.distance ?? Infinity),
      confidence: (a, b) => b.confidence - a.confidence,
      balanced: (a, b) => b.balancedScore - a.balancedScore
    };
    return rows.sort((a, b) => (sorters[resolved.sort] || sorters.balanced)(a, b) || a.id.localeCompare(b.id));
  }

  function batchFromOpportunity(opportunity) {
    return {
      id: makeId('batch'), commodityId: opportunity.commodityId, commodityName: opportunity.commodityName, plannedSCU: opportunity.quantity,
      purchasedSCU: 0, loadedSCU: 0, soldSCU: 0, lostOrAdjustedSCU: 0, buyLocationId: opportunity.buyLocationId,
      sellLocationId: opportunity.sellLocationId, plannedBuyPrice: opportunity.buyPricePerSCU, actualBuyPrice: null,
      plannedSellPrice: opportunity.sellPricePerSCU, actualSellPrice: null, purchaseFees: 0, saleFees: 0,
      sourceBuyRecordId: opportunity.buyRecordId, sourceSellRecordId: opportunity.sellRecordId, manualNote: '', adjustment: null
    };
  }

  function appendTradeSteps(steps, batch, locations, currentLocationId) {
    const buy = locations.get(batch.buyLocationId); const sell = locations.get(batch.sellLocationId); let current = locations.get(currentLocationId) || buy;
    if (current.id !== buy.id) steps.push({ id: makeId('haul-step'), kind: 'travel', locationId: current.id, location: current.name, nextLocationId: buy.id, nextLocation: buy.name, title: `Travel to ${buy.name}`, detail: `Proceed to ${buy.name} for ${batch.commodityName}.` });
    steps.push({ id: makeId('haul-step'), kind: 'arrive-buy', locationId: buy.id, location: buy.name, nextLocationId: buy.id, nextLocation: buy.name, batchId: batch.id, title: `Arrive at ${buy.name}`, detail: 'Verify terminal and local reference record.' });
    steps.push({ id: makeId('haul-step'), kind: 'purchase', locationId: buy.id, location: buy.name, nextLocationId: buy.id, nextLocation: buy.name, batchId: batch.id, title: `Purchase ${batch.plannedSCU} SCU ${batch.commodityName}`, detail: `Planned ${batch.plannedSCU} SCU at ${batch.plannedBuyPrice} aUEC / SCU.` });
    steps.push({ id: makeId('haul-step'), kind: 'load', locationId: buy.id, location: buy.name, nextLocationId: buy.id, nextLocation: buy.name, batchId: batch.id, title: `Load ${batch.commodityName}`, detail: 'Confirm purchased cargo is physically on board.' });
    steps.push({ id: makeId('haul-step'), kind: 'depart', locationId: buy.id, location: buy.name, nextLocationId: sell.id, nextLocation: sell.name, batchId: batch.id, title: `Depart ${buy.name}`, detail: 'Confirm doors, cargo grid and route.' });
    if (buy.id !== sell.id) steps.push({ id: makeId('haul-step'), kind: 'travel', locationId: buy.id, location: buy.name, nextLocationId: sell.id, nextLocation: sell.name, batchId: batch.id, title: `Travel to ${sell.name}`, detail: `Carry ${batch.commodityName} to the planned sale terminal.` });
    steps.push({ id: makeId('haul-step'), kind: 'arrive-sell', locationId: sell.id, location: sell.name, nextLocationId: sell.id, nextLocation: sell.name, batchId: batch.id, title: `Arrive at ${sell.name}`, detail: 'Verify demand before unloading.' });
    steps.push({ id: makeId('haul-step'), kind: 'sell', locationId: sell.id, location: sell.name, nextLocationId: sell.id, nextLocation: sell.name, batchId: batch.id, title: `Sell ${batch.commodityName}`, detail: `Planned sale at ${batch.plannedSellPrice} aUEC / SCU.` });
    return sell.id;
  }

  function planMetrics(batches, data) {
    const locations = new Map(data.locations.map(item => [item.id, item])); let distance = 0; let unknownLegs = 0;
    batches.forEach(batch => { const leg = distanceBetween(locations.get(batch.buyLocationId), locations.get(batch.sellLocationId)); if (leg === null) unknownLegs += 1; else distance += leg; });
    const plannedInvestment = batches.reduce((sum, batch) => sum + batch.plannedSCU * batch.plannedBuyPrice, 0);
    const plannedRevenue = batches.reduce((sum, batch) => sum + batch.plannedSCU * batch.plannedSellPrice, 0);
    return { plannedInvestment, plannedRevenue, plannedGrossProfit: plannedRevenue - plannedInvestment, distance, unknownLegs, durationMinutes: Math.round(distance * 1.8 + batches.length * 24), batches: batches.length, plannedSCU: batches.reduce((sum, batch) => sum + batch.plannedSCU, 0) };
  }

  function createPlan({ opportunities, selectedOpportunityId, filters, shipEntry, ship, data }) {
    if (!opportunities.length) throw new Error('No compatible hauling opportunity is available.');
    const locations = new Map(data.locations.map(item => [item.id, item])); const selected = opportunities.find(item => item.id === selectedOpportunityId) || opportunities[0];
    const chosen = [selected];
    if (filters.mode === 'multi-stop') {
      const chained = opportunities.find(item => item.buyLocationId === selected.sellLocationId && item.sellLocationId !== selected.buyLocationId && item.commodityId !== selected.commodityId);
      if (chained) chosen.push(chained);
    }
    let remainingBudget = filters.maxInvestment > 0 ? filters.maxInvestment : Infinity;
    const batches = chosen.map(opportunity => {
      const adjusted = clone(opportunity); const affordable = Math.floor(remainingBudget / adjusted.buyPricePerSCU); adjusted.quantity = Math.max(0, Math.min(adjusted.quantity, affordable)); remainingBudget -= adjusted.quantity * adjusted.buyPricePerSCU; return adjusted.quantity ? batchFromOpportunity(adjusted) : null;
    }).filter(Boolean);
    if (!batches.length) throw new Error('The investment limit cannot fund this plan.');
    const steps = []; let current = filters.startingLocationId;
    batches.forEach(batch => { current = appendTradeSteps(steps, batch, locations, current); });
    const finalLocation = locations.get(current); steps.push({ id: makeId('haul-step'), kind: 'complete', locationId: current, location: finalLocation?.name || 'Unknown', nextLocationId: current, nextLocation: finalLocation?.name || 'Unknown', title: 'Hauling run complete', detail: 'Close the ledger after reviewing realized results.' });
    const metrics = planMetrics(batches, data);
    return {
      id: makeId('haul-plan'), createdAt: new Date().toISOString(), selectedFleetShipId: shipEntry.id, startingLocationId: filters.startingLocationId,
      status: 'draft', mode: filters.mode, batches, stops: [...new Set(steps.flatMap(step => [step.locationId, step.nextLocationId]).filter(Boolean))], steps,
      metrics, accounting: { plannedInvestment: metrics.plannedInvestment, plannedRevenue: metrics.plannedRevenue, plannedGrossProfit: metrics.plannedGrossProfit },
      sourceMarketRecordIds: batches.flatMap(batch => [batch.sourceBuyRecordId, batch.sourceSellRecordId]),
      shipSnapshot: { fleetEntryId: shipEntry.id, shipId: ship.id, label: shipEntry.nickname ? `${shipEntry.nickname} — ${ship.name}` : ship.name, capacity: ship.capacity },
      explanation: batches.map((batch, index) => `Stop chain ${index + 1}: buy ${batch.plannedSCU} SCU ${batch.commodityName}, constrained by capacity, availability, demand and budget, then sell before the next purchase.`)
    };
  }

  function createRun(plan) {
    const run = clone(plan); run.id = makeId('haul-run'); run.planId = plan.id; run.status = 'active'; run.startedAt = new Date().toISOString(); run.completedAt = null; run.stepIndex = 0; run.events = []; run.manualAdjustments = {}; run.sourcePlanSnapshot = clone(plan); run.accounting = calculateAccounting(run); return run;
  }

  function heldSCU(batch) { return Math.max(0, batch.loadedSCU - batch.soldSCU - batch.lostOrAdjustedSCU); }

  function cargoState(batch, step) {
    const held = heldSCU(batch);
    if (batch.adjustment && batch.lostOrAdjustedSCU > 0) return held > 0 ? 'Adjusted or lost' : 'Adjusted or lost';
    if (batch.soldSCU > 0 && held > 0) return 'Partially sold';
    if (batch.soldSCU > 0 && held === 0) return 'Sold';
    if (batch.loadedSCU > 0) return step?.kind === 'sell' ? 'Ready to sell' : 'On board';
    if (batch.purchasedSCU > 0) return step?.kind === 'load' ? 'Ready to load' : 'Purchased';
    if (step?.kind === 'purchase') return 'Ready to purchase';
    return 'Planned';
  }

  function validateTransaction(run, step, values) {
    const batch = run.batches.find(item => item.id === step.batchId); const errors = {};
    if (!batch) return { valid: false, errors: { form: 'Cargo batch was not found.' } };
    const quantity = Number(values.quantity); const price = Number(values.price); const fees = Number(values.fees || 0);
    if (!Number.isFinite(quantity) || quantity < 0) errors.quantity = 'Quantity cannot be negative.';
    if (!Number.isFinite(price) || price < 0) errors.price = 'Price cannot be negative.';
    if (!Number.isFinite(fees) || fees < 0) errors.fees = 'Fees cannot be negative.';
    if (step.kind === 'purchase') {
      const heldAcrossRun = run.batches.reduce((sum, item) => sum + heldSCU(item), 0);
      if (quantity > run.shipSnapshot.capacity - heldAcrossRun) errors.quantity = `Purchase exceeds ${run.shipSnapshot.capacity - heldAcrossRun} SCU available capacity.`;
      if (quantity > batch.plannedSCU) errors.quantity = `Purchase cannot exceed the planned ${batch.plannedSCU} SCU reference quantity.`;
    }
    if (step.kind === 'sell' && quantity > heldSCU(batch)) errors.quantity = `Sale cannot exceed ${heldSCU(batch)} SCU currently held.`;
    return { valid: !Object.keys(errors).length, errors, values: { quantity, price, fees, note: String(values.note || '').trim() } };
  }

  function calculateAccounting(run) {
    const batches = run.batches || [];
    const plannedInvestment = batches.reduce((sum, batch) => sum + batch.plannedSCU * batch.plannedBuyPrice, 0);
    const plannedRevenue = batches.reduce((sum, batch) => sum + batch.plannedSCU * batch.plannedSellPrice, 0);
    const actualInvestment = batches.reduce((sum, batch) => sum + batch.purchasedSCU * (batch.actualBuyPrice ?? batch.plannedBuyPrice), 0);
    const actualRevenue = batches.reduce((sum, batch) => sum + batch.soldSCU * (batch.actualSellPrice ?? batch.plannedSellPrice), 0);
    const soldCost = batches.reduce((sum, batch) => sum + batch.soldSCU * (batch.actualBuyPrice ?? batch.plannedBuyPrice), 0);
    const fees = batches.reduce((sum, batch) => sum + Number(batch.purchaseFees || 0) + Number(batch.saleFees || 0), 0);
    const losses = batches.reduce((sum, batch) => sum + batch.lostOrAdjustedSCU * (batch.actualBuyPrice ?? batch.plannedBuyPrice), 0);
    const unrealizedCargoValue = batches.reduce((sum, batch) => sum + heldSCU(batch) * batch.plannedSellPrice, 0);
    const estimatedRemainingProfit = batches.reduce((sum, batch) => sum + heldSCU(batch) * (batch.plannedSellPrice - (batch.actualBuyPrice ?? batch.plannedBuyPrice)), 0);
    const realizedGrossProfit = actualRevenue - soldCost; const finalNetProfit = realizedGrossProfit - fees - losses;
    const completedSCU = batches.reduce((sum, batch) => sum + batch.soldSCU, 0); const remainingSCU = batches.reduce((sum, batch) => sum + heldSCU(batch), 0);
    const durationMinutes = run.startedAt ? Math.max(0, Math.round((new Date(run.completedAt || Date.now()) - new Date(run.startedAt)) / 60000)) : 0;
    return { plannedInvestment, actualInvestment, plannedRevenue, actualRevenue, plannedGrossProfit: plannedRevenue - plannedInvestment, realizedGrossProfit, unrealizedCargoValue, estimatedRemainingProfit, fees, losses, finalNetProfit, profitPerSCU: completedSCU ? finalNetProfit / completedSCU : 0, roi: actualInvestment ? finalNetProfit / actualInvestment * 100 : 0, durationMinutes, completedSCU, remainingSCU };
  }

  function executeStep(run, values = null) {
    const nextRun = clone(run); const step = nextRun.steps[nextRun.stepIndex];
    if (!step || nextRun.status !== 'active') return { run: nextRun, errors: { form: 'No active hauling step is available.' } };
    const batch = step.batchId ? nextRun.batches.find(item => item.id === step.batchId) : null;
    if (step.kind === 'purchase' || step.kind === 'sell') {
      const defaults = step.kind === 'purchase' ? { quantity: batch.plannedSCU, price: batch.plannedBuyPrice, fees: 0, note: '' } : { quantity: heldSCU(batch), price: batch.plannedSellPrice, fees: 0, note: '' };
      const validation = validateTransaction(nextRun, step, values || defaults); if (!validation.valid) return { run: clone(run), errors: validation.errors };
      if (step.kind === 'purchase') { batch.purchasedSCU = validation.values.quantity; batch.actualBuyPrice = validation.values.price; batch.purchaseFees = validation.values.fees; batch.manualNote = validation.values.note; }
      else { batch.soldSCU += validation.values.quantity; batch.actualSellPrice = validation.values.price; batch.saleFees += validation.values.fees; batch.manualNote = validation.values.note || batch.manualNote; }
      nextRun.events.push({ id: makeId('haul-event'), stepId: step.id, batchId: batch.id, kind: step.kind, at: new Date().toISOString(), values: validation.values });
    }
    if (step.kind === 'load' && batch) batch.loadedSCU = batch.purchasedSCU;
    if (step.kind === 'complete') { nextRun.status = 'completed'; nextRun.completedAt = new Date().toISOString(); }
    else nextRun.stepIndex = Math.min(nextRun.steps.length - 1, nextRun.stepIndex + 1);
    nextRun.accounting = calculateAccounting(nextRun); return { run: nextRun, errors: {} };
  }

  function reverseStep(run, confirmed = false) {
    const nextRun = clone(run); if (nextRun.stepIndex <= 0) return { run: nextRun, requiresConfirmation: false };
    const previousIndex = nextRun.stepIndex - 1; const step = nextRun.steps[previousIndex]; const event = nextRun.events.find(item => item.stepId === step.id);
    if (event && !confirmed) return { run: clone(run), requiresConfirmation: true, message: `Reversing this ${step.kind} discards recorded quantity, price, fees and note.` };
    const batch = step.batchId ? nextRun.batches.find(item => item.id === step.batchId) : null;
    if (step.kind === 'purchase' && batch) { batch.purchasedSCU = 0; batch.loadedSCU = 0; batch.actualBuyPrice = null; batch.purchaseFees = 0; }
    if (step.kind === 'load' && batch) batch.loadedSCU = 0;
    if (step.kind === 'sell' && batch && event) { batch.soldSCU = Math.max(0, batch.soldSCU - event.values.quantity); batch.actualSellPrice = null; batch.saleFees = Math.max(0, batch.saleFees - event.values.fees); }
    nextRun.events = nextRun.events.filter(item => item.stepId !== step.id); nextRun.stepIndex = previousIndex; nextRun.status = 'active'; nextRun.completedAt = null; nextRun.accounting = calculateAccounting(nextRun);
    return { run: nextRun, requiresConfirmation: false };
  }

  function applyAdjustment(run, batchId, quantity, reason, note = '') {
    const nextRun = clone(run); const batch = nextRun.batches.find(item => item.id === batchId); if (!batch) throw new Error('Cargo batch was not found.');
    const amount = Number(quantity); if (!Number.isFinite(amount) || amount < 0 || amount > heldSCU(batch)) throw new Error(`Adjustment must be between 0 and ${heldSCU(batch)} SCU.`);
    batch.lostOrAdjustedSCU = amount; batch.adjustment = amount ? { quantity: amount, reason, note: String(note || '').trim(), at: new Date().toISOString() } : null; nextRun.accounting = calculateAccounting(nextRun); return nextRun;
  }

  const api = { defaultFilters, defaultHaulingState, normalizedFilters, findOpportunities, opportunityQuantity, createPlan, createRun, validateTransaction, executeStep, reverseStep, cargoState, heldSCU, calculateAccounting, applyAdjustment, distanceBetween };
  root.HAULING_CORE = Object.freeze(api);
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
