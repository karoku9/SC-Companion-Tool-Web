# SC Companion Tool — Clean Rebuild

Fresh development foundation for a Star Citizen mission and route companion.

The previous implementation is preserved unchanged on the branch:

`backup/pre-zero-rebuild-2026-07-21`

## Product direction

The application will be rebuilt in small, verifiable increments around:

- precise operational destinations, such as `Teasa Spaceport · Lorville`;
- the in-game search destination required by the mobiGlas, such as `Lorville`;
- cargo and non-cargo mission intake;
- multi-stop route planning;
- guided in-game execution;
- optional commodity opportunities along an already planned route;
- manufacturer-themed MFD interfaces.

No previous application code is carried into this branch by default.
