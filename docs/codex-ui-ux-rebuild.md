# SC Companion Tool — Codex UI/UX Rebuild

## Purpose

Rebuild the product experience around the real hauling workflow rather than around a collection of equally weighted dashboard panels.

The current 0.40 runtime remains the functional reference for route, cargo, mission, ship, location and persistence behaviour. Its visual structure is not the design basis for this rebuild.

## Product job

During a hauling session the interface must let the player answer, without searching:

1. Where do I go now?
2. What must I do when I arrive?
3. Which cargo moves now?
4. Where did each load originate?
5. Where should each load sit in the ship?
6. What is the next meaningful operation?
7. How much capacity remains?

Any information that does not support one of those decisions is secondary and should move into progressive disclosure.

## Problems in the current experience

### Global structure

- Workspaces are presented with nearly equal visual importance even though Live Operations is the primary use case.
- The product shell consumes space without improving orientation during play.
- Development and implementation-oriented pages leak into the user-facing navigation.
- Page layouts are built as isolated dashboards instead of stages in one continuous hauling workflow.

### Mission intake

- Manual text, OCR and Game.log are presented as technical input modes rather than a single contract acquisition task.
- Route settings appear only after parsing but are visually mixed with mission correction.
- Validation messages, editable objectives and route configuration compete for attention.
- The stage progression exists but does not clearly communicate completion, blocking issues or the next required action.

### Session planning

- Generated sessions are treated as output cards rather than choices with meaningful trade-offs.
- The user needs a clearer comparison of route time, systems, gateways, peak cargo and included missions.
- Starting a session should feel like committing a plan, not opening another generic page.

### Operations

- The current layout still reads as a dashboard: status strip, session strip, cargo panel, step panel, timeline and dock all compete simultaneously.
- The cargo hold is large but its relationship to the current action is not explicit enough.
- Current action, next action, timeline and top metrics duplicate route context.
- The persistent dock uses significant space for actions that are not equally frequent.
- Session tabs remain visible even when the player is executing one selected session.
- The design optimizes for fitting regions into a viewport rather than for a clear operational hierarchy.

### Mobile

- The current mobile experience is mostly natural stacking of desktop regions.
- The primary action and current cargo move need to remain near the thumb and visible earlier.
- Dense cargo detail should use a dedicated focused view instead of an oversized desktop grid compressed into the page.

## New information architecture

### Primary navigation

1. **Live Ops** — current session execution.
2. **Contracts** — acquire and review missions.
3. **Plan** — build, compare and select play sessions.
4. **Fleet** — ships and cargo profiles.
5. **Intel** — locations and the separate starmap.

Development, changelog and UI-kit content must not occupy primary product navigation. They may remain available through a secondary About/Development entry.

### Continuous workflow

`Acquire contracts → Resolve issues → Configure route → Compare sessions → Start session → Execute route → Complete session`

The product should preserve the user's place in this workflow and present one obvious next action at every stage.

## Experience principles

### 1. Action before context

The current instruction must be the strongest visual element in Live Ops. Route context supports it but never competes with it.

### 2. Cargo is spatial, not just numeric

The cargo interface must connect physical cells, destination groups and the current pickup/delivery operation. Numbers alone are insufficient.

### 3. One source of truth per fact

- Current location appears in the action module.
- Next meaningful action appears once.
- Capacity appears with the cargo hold.
- Session identity appears in the shell.
- Route progress appears in the route rail.

Do not repeat the same fact in the shell, action card, timeline and footer.

### 4. Progressive disclosure

Editing missions, changing route order, viewing location risk and manually arranging the cargo grid belong in drawers or focused workspaces. They should not permanently occupy Live Ops.

### 5. Compactness through hierarchy

Recover space by removing duplicated labels, grouping related values and hiding secondary controls until needed. Do not recover space through tiny type or whole-page scaling.

## Visual direction

### Character

- Industrial cargo terminal rather than generic sci-fi dashboard.
- Restrained Drake-like utilitarian construction.
- Dense but calm, with clear working surfaces and strong state changes.
- Rectangular geometry with occasional structural cuts only where they communicate hierarchy.

### Palette roles

- Near-black graphite: primary background.
- Warm off-white: readable operational text.
- Muted amber: primary action and active selection.
- Cyan: navigation/travel information.
- Green: verified, completed and capacity-safe states.
- Red: blocking errors, over-capacity and dangerous destructive actions.
- Muted sand/grey: secondary labels and inactive structure.

Amber must not tint every border and panel. Colour is reserved for state and interaction.

### Typography

- Body and operational values: readable sans-serif, typically 13–15 px on desktop.
- Technical labels: monospace or technical face, minimum 11 px.
- Current action title: 24–32 px depending on viewport.
- Long location names may wrap naturally; they must not be reduced to unreadable sizes.

## Screen architecture

## Contracts

### Stage 1 — Acquire

A single acquisition surface with three clear methods:

- Paste/type contract text.
- Add screenshot.
- Import from Game.log (marked experimental).

The selected method owns the central workspace. Other methods remain as compact tabs, not simultaneous panels.

Primary action: **Review contracts**.

### Stage 2 — Resolve

Two-column desktop layout:

- Left: mission index with status, contractor, reward and cargo total.
- Right: selected mission editor with pickup/delivery objectives.

Blocking location ambiguity is shown inline at the exact objective. A top summary reports how many missions are ready and how many need attention.

Primary action: **Configure route**.

### Stage 3 — Configure

A focused route setup panel containing:

- Current location.
- Active ship and usable capacity.
- Fastest route or time-boxed sessions.
- Session travel-time target when applicable.

The mission list becomes a compact verified summary.

Primary action: **Build plan**.

## Plan

### Session comparison

Use a comparison-oriented layout, not generic cards.

Each session exposes:

- Session number and selected state.
- Estimated travel time.
- Systems and gateways.
- Number of missions.
- Pickup/delivery count.
- Peak onboard SCU versus ship capacity.
- Start and final location.

The selected session receives a persistent detail area containing its ordered route and mission contents.

Primary action: **Start session**.

## Live Ops

### Desktop hierarchy

1. **Compact mission bar**
   - Session identity.
   - Active ship.
   - Route progress.
   - Capacity state.
   - One overflow/menu control for session management.

2. **Action workspace**
   - Current action is the dominant module.
   - Cargo hold is the second primary module.
   - Their relative width can change by step type:
     - Pickup/delivery: cargo receives more space.
     - Travel/gateway/jump: action receives more space while cargo becomes a concise hold summary.

3. **Route rail**
   - Completed, current and next operational steps.
   - Focus on orientation, not full mission details.
   - Expandable into route management when requested.

4. **Sticky execution controls**
   - Previous.
   - Mark arrived / complete pickup / complete delivery / continue jump, depending on step type.
   - Secondary actions remain in an overflow menu.

### Current action module

Must show:

- Action verb.
- Exact destination.
- In-game navigation target when different.
- System/body context only when useful.
- Cargo moves for this step, including commodity, quantity, mission and pickup origin.
- One concise next-action preview.

Do not include a generic risk/intel card. Location intel is opened on demand.

### Cargo module

Must show:

- Active ship and capacity.
- Onboard/free/reserved SCU.
- Physical grid.
- Destination or mission legend.
- Highlighted cells affected by the current operation.
- Access/ramp orientation.
- Edit layout action.

For travel steps, the default view may collapse the manifest while preserving the physical state.

### Route rail

- Current step is centred or automatically brought into view.
- Completed steps are visually quiet.
- Upcoming steps show action, destination and cargo delta.
- Gateway approach, jump and post-jump travel remain explicit.
- A detailed route drawer handles reordering and mission management.

### Empty and completed states

Empty state:

- Explain that no session is active.
- Primary action opens Contracts or Plan depending on available state.
- Do not render empty cargo and timeline dashboards.

Completed state:

- Session completion summary.
- Delivered SCU and missions completed.
- Option to start the next planned session or return to Plan.

## Fleet

- Fleet list and selected ship should form one master-detail workspace.
- Cargo capacity and access model are primary.
- Decorative schematic is secondary and must not dominate configuration.
- Clearly distinguish official capacity from tool-defined planning geometry.

## Intel

- Combine location lookup and route-focused starmap under one secondary workspace with tabs.
- Keep the map separate from Live Ops.
- Intel should answer navigation target, services, risk, provenance and estimated approach—not repeat current-step controls.

## Responsive behaviour

### Desktop targets

- 1700 × 900
- 1664 × 800
- 1600 × 900
- 1366 × 768

Live Ops should fit in one viewport for common step states without whole-page scaling. When unusually long content cannot fit, allow a single predictable content scroller rather than several nested panel scrollbars.

### Tablet

- Mission bar remains compact.
- Action module precedes cargo.
- Route rail becomes horizontal or a compact next-steps list.
- Secondary editing opens full-screen drawers.

### Mobile

- Current action first.
- Primary execution control sticky at the bottom.
- Cargo summary follows, with a button to open a dedicated full-screen grid.
- Route shows current plus the next two meaningful steps; full route opens separately.
- Minimum touch target approximately 44 px.
- No desktop grid squeezed to phone width.

## Component model

Shared components should be semantic and state-driven rather than versioned hotfix layers:

- ProductShell
- WorkflowStepper
- StatusSummary
- ContractSourceSwitcher
- MissionIndex
- MissionEditor
- RouteConfiguration
- SessionComparison
- SessionDetail
- OperationCommand
- CargoHold
- CargoLegend
- RouteRail
- ExecutionBar
- ContextDrawer
- EmptyState
- CompletionSummary

The project currently uses vanilla JavaScript. The rebuild may remain vanilla, but modules must have clear ownership and avoid mutating arbitrary legacy markup after load.

## Technical boundaries

Preserve and reuse the existing application models where valid:

- `SCCompanionSession`
- mission parsing and validation
- route session planner
- route corrections and operational steps
- cargo state and auto layout
- manual cargo layout persistence
- ship catalog and cargo zones
- OCR and Game.log intake
- location registry and context

Do not change persisted state formats only to simplify presentation. Use small named adapters when view models are needed.

The new UI must have:

- One clear application shell entry.
- One coherent design-token layer.
- Feature-owned view modules.
- No chained `v027 → v028 → v030x → v040` visual runtime.
- No hidden legacy dashboard retained only to satisfy tests.

## Acceptance criteria

### Behaviour

- Manual text, OCR and Game.log flows remain usable.
- Mission ambiguity resolution remains explicit.
- Route generation and session selection work.
- Ship changes rebuild the plan safely.
- Explicit gateway approach, jump, travel and action steps remain intact.
- Cargo grouping by destination and mission works.
- Manual grid drag, assign, reserve, keep-empty, reset and persistence work.
- Route reordering cannot violate pickup-before-delivery or ship capacity.

### Visual and UX

- Live Ops has one obvious dominant action.
- Cargo is visually connected to pickup/delivery steps.
- No repeated current/next/capacity facts across multiple permanent regions.
- No generic SaaS card wall.
- No large unused panel areas.
- No operational text below 11 px.
- No horizontal document overflow.
- No avoidable nested scrollbars.
- Long locations and multi-cargo objectives remain readable.
- Empty and completed states do not render meaningless dashboard chrome.

### Test states

Capture and manually review:

- Contracts acquisition: text, OCR and Game.log.
- Mission review with resolved and ambiguous locations.
- Plan with multiple sessions and one inter-system route.
- Live Ops empty state.
- Travel step.
- Pickup with several commodities.
- Delivery with mixed mission origins.
- Gateway approach.
- Jump.
- Nearly full cargo hold.
- Completed session.
- Manual cargo editor.
- 1700×900, 1664×800, 1600×900, 1366×768, 768×1024 and 390×844.

Tests must assert behaviour and visible outcomes, not retired class names or exact panel heights chosen by the previous implementation.
