# UI/UX Research v0.27

## Purpose

Build an original industrial interface language for SC Companion Tool. The result may be informed by modern Star Citizen terminals and community workflows, but it must not reproduce CIG artwork, proprietary fonts, logos, exact screen layouts, or extracted game assets.

The target blend is:

- Commodity Shop interaction patterns: 40%
- Freight Manager and Freight Elevator patterns: 30%
- New vehicle MFD information hierarchy: 20%
- Warehouse and cargo-terminal patterns: 10%

The product priorities are legibility, information density, fast desktop use, modular components, restrained motion, dark surfaces, minimal glow, and clear operational state.

## Primary product questions

Every screen must answer one question immediately:

- Intake: did the tool receive the contracts?
- Review: did it parse every mission, location, action, quantity, and commodity correctly?
- Sessions: what complete work fits inside the exact time available?
- Operations: where do I go next and what do I do there?
- Cargo: what is onboard, where is it accessible, and where must it go?
- Route map: which leg and gateway come next?

Anything that does not help answer the current question is secondary, collapsible, or removed.

## Official Star Citizen evidence

### Cargo and freight flow

The Alpha 3.24 cargo release introduced freight elevators, local warehouses, physicalized cargo access, commodity container sizes, mission-relevant item handling, and cargo-hauling mission variants. This supports a UI language based on inventory rows, transfer states, constrained capacity, mission ownership, and explicit source/destination relationships.

Sources:

- https://robertsspaceindustries.com/en/comm-link/Patch-Notes/20087-Star-Citizen-Alpha-3240
- https://robertsspaceindustries.com/en/comm-link/transmission/20040-Cargo-Guide

### Building Blocks and cohesive terminal systems

Official development reports describe Building Blocks work for freight elevators, commodity kiosks, contracts, and the updated mobiGlas, including a specific UX pass and cohesive art mockups. This supports shared primitives and consistent state behavior rather than page-specific decorative CSS.

Sources:

- https://robertsspaceindustries.com/comm-link/transmission/19779-Star-Citizen-Monthly-Report-January-2024
- https://robertsspaceindustries.com/en/comm-link/transmission/19831-Star-Citizen-Monthly-Report-February-2024
- https://robertsspaceindustries.com/comm-link/transmission/19999-Star-Citizen-Monthly-Report-May-2024

### New vehicle MFDs

Alpha 3.24.2 replaced the previous vehicle HUD/MFD implementation with a Building Blocks system, a new visual language, manufacturer treatments, and panels for diagnostics, communications, weapons, engineering, and status. The reusable lesson is layered operational hierarchy and manufacturer treatment applied over stable semantics.

Source:

- https://robertsspaceindustries.com/en/comm-link/Patch-Notes/20255-Star-Citizen-Alpha-3242

### Recent freight-elevator behavior

Alpha 4.9 simplified warehouse scope selection, added disabled-action explanations, and clarified partial-transfer results. The relevant UX lesson is that disabled and partial states must explain themselves near the action rather than relying on generic error banners.

Source:

- https://robertsspaceindustries.com/en/comm-link/Patch-Notes/21245-Star-Citizen-Alpha-49

## Community projects

### LithoScan HUD

Repository: https://github.com/Lomikk/SC-LithoScan-HUD

Useful lessons:

- transparent overlay architecture separated from the OCR/backend process;
- compact data presentation that remains readable over a game scene;
- local processing and explicit hotkeys;
- theme variants that change treatment without changing information meaning;
- edit mode separated from game mode.

Do not copy its screenshots, styling, or theme definitions. Study its separation of capture, interpretation, and display.

### mfd-starcitizen

Repository: https://github.com/Skhmt/mfd-starcitizen

Useful lesson:

- a small MFD display benefits from strict proportions, low component count, and immediate control affordances.

The project is intentionally simple and is a proportional reference, not a source for the application architecture.

### SC Trade Companion

Repository: https://github.com/EtienneLamoureux/sc-trade-companion

Useful lessons:

- kiosk capture is a repeated workflow rather than a one-time import;
- captured data and captured images have separate provenance;
- OCR success depends on controlled framing, glare, overlays, and language;
- users need visible best-practice guidance before capture;
- local processing and explicit disclosure improve trust.

### SC Hauler Helper and Schaulers Manifest

Workflow references:

- https://sc-haulerhelper.com/
- https://schaulers.space/manifest

Use them for workflow study only:

- compact mission overview;
- cargo represented as quantities and commodity objects rather than repeated raw text;
- route progress that can be checked at a glance;
- mission editing and removal close to the operation;
- direct manipulation instead of separate management pages.

The SC Companion visual language must remain original.

## Reference capture policy

The repository must not become a mirror of copyrighted screenshots. `/reference` stores source manifests, notes, and optional locally supplied filenames. Actual screenshot collections remain outside Git by default.

For each reference record, capture:

- category;
- source URL;
- game/version context when known;
- capture date;
- visible component patterns;
- interaction/state patterns;
- accessibility or usability problems;
- original design lesson;
- prohibition against direct asset reuse.

Initial target: 100–150 high-value references across all categories. Expand only categories that materially affect the product.

## Typography direction

Preferred evaluation order:

1. Rajdhani for headings and section numerals.
2. IBM Plex Sans Condensed for body copy and controls.
3. Saira Condensed for telemetry and tabular numbers.
4. Oxanium for limited labels only.

Orbitron must not be used as the primary UI face. Eurostile, Microgramma, and Bank Gothic may be evaluated only when licensing and delivery are clear.

Required behavior:

- body and control text: at least 12 px;
- primary operational values: 14–18 px;
- tabular numerals for SCU, aUEC, time, and sequence numbers;
- uppercase only for short labels, never for paragraphs;
- no low-contrast microcopy below the readable floor.

## Icon direction

Use one coherent library. The current local Lucide-derived subset remains the default because it is already bundled and ISC licensed. Add original domain symbols only where generic icons are insufficient: gateway, quantum leg, freight elevator, cargo grid, mission cargo, local warehouse, and external warehouse.

Rules:

- stable meaning across themes;
- icon-only controls require an accessible label and tooltip;
- unfamiliar or destructive actions retain text;
- do not mix Lucide, Tabler, Phosphor, and Remix in the same screen.

## Visual principles

### Surfaces

- near-black canvas;
- slightly warm industrial panels;
- one-pixel separators;
- minimal elevation;
- no glassmorphism;
- no persistent bloom or neon halos.

### Geometry

- mostly square corners;
- 0–4 px radius;
- clipped or stepped corners reserved for primary panels and selected states;
- decoration must communicate grouping, selection, direction, or state.

### Color

- amber/orange for active navigation and primary operational emphasis;
- desaturated blue for pickup and navigation;
- desaturated green for delivery and ready state;
- muted red for destructive actions and blocking faults;
- neutral gray for unknown or inactive data.

Color never carries meaning alone.

### Motion

- 120–180 ms state transitions;
- no looping decorative animation;
- route progress may animate once when advancing;
- reduced-motion mode removes nonessential movement;
- loading states use restrained progress or stepped indicators.

## Component inventory

### Primitives

- Button and icon button
- Text input and numeric input
- Select and combobox
- Checkbox and segmented control
- Tabs
- Tooltip and popover
- Dialog and drawer
- Toast and inline notice
- Table and data row
- Status badge
- Progress bar

### Domain components

- Mission card
- Mission objective row
- Cargo/commodity chip
- Commodity row
- Warehouse item row
- Freight transfer panel
- Ship selector
- Session card
- Route leg
- Route timeline
- Gateway marker
- Cargo grid
- Location intelligence strip
- Capacity meter

## Screen architecture

### Mission Review

- route settings form a compact run context strip above the missions;
- every mission is a self-contained card;
- header shows sequence, title, contractor, payout, validity, edit, and remove;
- objectives are rows with action, canonical location, and cargo chips;
- raw fields appear only in explicit edit mode;
- unresolved rows explain the exact problem beside the row.

### Operations

- top strip: current session, current location, next destination, travel estimate, gateway sequence;
- primary left panel: active leg visualization and live route map;
- primary right panel: actions required at the current stop;
- bottom timeline: completed, current, and upcoming stops;
- compact location-intelligence icons with details on demand;
- add, edit, remove, and reorder missions without leaving Operations;
- Cargo remains a contextual tool until its full workflow is designed.

## Acceptance rules

A component or page is not complete until:

- desktop at 1366×768 has no horizontal overflow;
- mobile at 390×844 remains usable;
- text meets the minimum readable size;
- keyboard focus is visible;
- icon-only controls have accessible names;
- destructive and blocking states are explicit;
- reduced motion is supported;
- no copyrighted game asset is required for the result;
- the next player action is visually dominant.
