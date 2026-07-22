# UI design research and implementation rules

This document records the evidence and constraints behind the SC Companion interface system. It is not a mood board. Every future UI pull request must either follow these rules or update this document with a reviewed reason.

## 1. Drake design direction

Primary sources:

- Roberts Space Industries, *Raid Commander: The Drake Caterpillar*  
  https://robertsspaceindustries.com/en/comm-link/transmission/14331-Raid-Commander-The-Drake-Caterpillar
- Roberts Space Industries, *The Drake Buccaneer Sets Sail*  
  https://robertsspaceindustries.com/comm-link/transmission/15350-The-Drake-Buccaneer-Sets-Sail
- Roberts Space Industries, *Q&A: Drake Buccaneer — Part II*  
  https://robertsspaceindustries.com/comm-link/engineering/15359-Q-A-Drake-Buccaneer-Part-II
- Roberts Space Industries, *Portfolio: Drake Interplanetary*  
  https://robertsspaceindustries.com/en/comm-link/spectrum-dispatch/13441-Portfolio-Drake-Interplanetary

Derived rules:

- Drake surfaces should feel like tools and construction equipment, not luxury consumer electronics.
- Function is visible: bezels, separators, status rails and controls may remain explicit.
- Shapes are robust, geometric and repairable rather than sleek or decorative.
- The interface must remain practical and reliable. Distress alone is not a substitute for hierarchy.
- The project palette is an approximation informed by official imagery and the supplied cockpit reference. It is not presented as an official CIG palette.

## 2. Hauling workflow references

Sources:

- Schaulers feature overview  
  https://schaulers.space/features
- Schaulers application and Manifest  
  https://schaulers.space/app.html
- SC Hauler Helper  
  https://sc-haulerhelper.com/
- SC Hauling Tools community description  
  https://robertsspaceindustries.com/community-hub/post/sc-hauling-tools-co-op-cargo-routes-in-sc-ug12xzEwMSwPg

Adopted workflow patterns:

- A step-by-step itinerary must dominate during a live run.
- Cargo capacity and box placement must be visible before and during execution.
- The interface should support different display distances and densities.
- Advanced functions should be progressively disclosed instead of shown with equal weight.
- Route, cargo and progress information must persist without forcing the player to reconstruct context.

Patterns deliberately not copied:

- Very small type as the default.
- Dense dashboards where every statistic competes with the next action.
- Full-page layouts embedded inside a narrow auxiliary panel.
- Decorative military styling without operational meaning.

## 3. Design-system architecture

Sources:

- W3C Design Tokens Community Group  
  https://www.w3.org/community/design-tokens/
- Design Tokens Format Module 2025.10  
  https://www.w3.org/community/reports/design-tokens/CG-FINAL-format-20251028/
- Carbon Design System button usage  
  https://carbondesignsystem.com/components/button/usage/
- Carbon icon usage  
  https://carbondesignsystem.com/elements/icons/usage/

Required layers:

1. **Primitive tokens** — raw colours, spacing, type sizes, radii and control sizes.
2. **Semantic tokens** — surface, content, border, action, cargo and system-state roles.
3. **Component tokens** — buttons, icons, fields, panels, tabs and status indicators.
4. **Manufacturer theme** — maps a manufacturer identity onto the semantic and component layers.

Page-specific CSS must not introduce a new raw colour, button style or icon meaning. It must consume an existing semantic role or extend the design system first.

## 4. Cockpit and human-factors constraints

Sources:

- NASA Human Integration Design Handbook  
  https://www.nasa.gov/organizations/ochmo/human-integration-design-handbook/
- NASA Cockpit Display Design / Intelligent Spacecraft Interface Systems  
  https://www.nasa.gov/human-systems-integration-division/cockpit-display-design-intelligent-spacecraft-interface-systems/
- NASA systems engineering guidance on iterative human-in-the-loop testing  
  https://www.nasa.gov/reference/3-0-systems-engineering-processes-vol-2/

Rules for this project:

- Consistency across displays is a functional requirement, not only a visual preference.
- The current decision and abnormal state must remain easy to locate.
- Colour never carries meaning alone; labels and symbols accompany it.
- Keyboard focus and close behaviour are tested as part of the component, not after page assembly.
- Responsive and panel states require human review screenshots before merge.

## 5. Current Drake token decisions

### Typography

Only seven sizes are approved: 11, 12, 14, 16, 20, 28 and 36 px-equivalent. A page may not create a larger heading without a design-system review.

### Spacing

Only 2, 4, 6, 8, 12, 16, 24 and 32 px increments are approved.

### Buttons

Approved variants:

- primary
- secondary
- ghost
- danger
- function
- icon

There is one primary action per decision surface.

### Icons

- 24 px canonical grid
- 1.7 px canonical stroke
- 16, 20 and 24 px rendered sizes
- one stable symbol for each action
- icon-only controls require an accessible name and tooltip

### Cargo semantics

- pickup / load
- drop-off / unload
- mixed stop
- off-grid cargo

These meanings remain stable across future manufacturer themes even when their colours and treatment change.

## 6. Pull-request sequence

1. Design-system foundation and visible UI Kit.
2. Operations rebuilt with panel-native components.
3. Fleet rebuilt with ship visual and cargo-zone schematic.
4. Starmap rebuilt around the active route and predictable navigation.
5. Missions and Planner migrated to the component system.
6. Cross-page visual, keyboard, responsive and screenshot review.

No feature milestone should be merged in the middle of this sequence unless it fixes data loss or a blocking operational defect.
