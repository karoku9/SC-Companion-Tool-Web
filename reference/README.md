# Reference Library

This directory stores manifests and analysis notes for UI/UX research. It intentionally does not commit a bulk mirror of Star Citizen screenshots or third-party project assets.

## Local structure

Researchers may keep non-versioned captures in these folders:

```text
reference/
  commodity_shop/
  freight_manager/
  freight_elevator/
  warehouse/
  inventory/
  vehicle_loadout/
  new_mfd/
  asop/
  cargo_terminal/
  building_blocks/
  starmap/
```

Each local image should have a matching record in `catalog.json` or a category notes file.

## Required metadata

- stable ID;
- category;
- source URL;
- source type: official, community, video, or personal capture;
- game version/build when known;
- capture or review date;
- locally stored filename when applicable;
- visible components;
- layout and state observations;
- usability strengths and problems;
- original design lesson for SC Companion;
- rights note.

## Rules

1. Do not copy logos, proprietary fonts, textures, illustrations, screen compositions, or extracted game assets.
2. References inform principles and interaction patterns only.
3. Prefer official material and direct in-game captures over reposts.
4. Avoid duplicate captures that add no new state or behavior.
5. Prioritize readable 1080p or higher material.
6. Record hover, selected, disabled, loading, partial-success, empty, warning, and failure states when available.
7. Keep raw reference images outside Git unless the contributor owns the image and explicitly chooses to license it for the repository.

## Initial collection target

Collect 100–150 high-value references total before expanding individual categories. Suggested allocation:

- Commodity Shop: 24
- Freight Manager: 22
- Freight Elevator: 22
- New MFD: 20
- Warehouse / Inventory: 18
- ASOP / Vehicle Loadout: 16
- Cargo terminals and decks: 12
- Building Blocks / Starmap: 16

The allocation is flexible; state diversity matters more than raw count.
