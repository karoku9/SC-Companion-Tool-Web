# Manual Corsair cargo grid editor — UI 0.29.5

## Geometry
- 4 columns × 6 rows
- rows A–F
- columns 1–4
- 24 cells total
- 3 SCU per cell
- ramp/access edge on row A

## Cell states
- empty
- cargo assignment
- reserved empty buffer
- blocked/occupied external cargo

## Interactions
- drag one cargo cell to another
- drag an entire destination/mission group
- click a cell to assign or clear it
- mark cells as blocked or reserved
- restore automatic layout
- preserve manual overrides in session state

## Validation
- no overlapping assignments
- assigned SCU cannot exceed group SCU
- blocked cells reduce usable capacity
- unassigned cargo is surfaced explicitly
- automatic planner must respect locked/manual cells
