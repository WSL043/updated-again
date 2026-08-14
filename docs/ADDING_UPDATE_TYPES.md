# Adding update types

## Add a recipe when existing capabilities are enough

Edit `content/recipes.json`. A recipe declares:

- stable ID;
- existing `kind`;
- selection weight and cooldown;
- reason, mood, and absurdity;
- real change and expected visible effect;
- payload accepted by that capability.

Run:

```bash
pnpm update:simulate
pnpm check
```

Recipes are data. They cannot import code, access the network, read files, or invoke commands.

## Add a capability when the client must learn something new

1. Add the kind to `UPDATE_KINDS` in `src/core/types.ts`.
2. Define its payload contract and visible state in `WorldState`.
3. Implement validation and application in `src/capabilities/index.ts`.
4. Preserve the pre-update snapshot so rollback remains exact.
5. Add a real recipe consumer.
6. Add positive, invalid-payload, duplicate, and rollback tests.
7. Document permissions or external effects.
8. Release it through a tagged Core Release.

Capabilities must remain deterministic and bounded. A capability that accepts arbitrary JavaScript, shell commands, executable downloads, or unrestricted URLs will not be accepted.

## Agent proposals

An Agent may propose a recipe JSON object. The proposal goes through the same schema, capability, cooldown, hash, signature, and effect checks as a human-authored recipe. Agent identity never grants additional permissions.
