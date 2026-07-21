# Product direction

## Core idea

A Star Citizen mission and route companion that combines mission intake, precise locations, route planning, guided execution, and optional trading opportunities.

## Location naming rule

Locations must distinguish at least three concepts:

- **Operational place:** where the player actually lands or performs the action, for example `Teasa Spaceport`.
- **Parent place:** the city, body, station complex, or system that contains it, for example `Lorville`.
- **In-game navigation target:** the destination text the player must search or select in the game, for example `Lorville`.

The primary route instruction should therefore be displayed as:

`Teasa Spaceport · Lorville`

and must separately state:

`Set destination in game: Lorville`

## Development rule

Work in small, testable increments. Avoid large files and large implementation batches unless the feature cannot be split safely.
