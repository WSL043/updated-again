# Security policy

## Supported versions

Only the newest Developer Preview is currently maintained. No build is declared stable until real-device install, update, rollback, and uninstall acceptance has completed.

## Report a vulnerability

Do not open a public issue for a suspected vulnerability. Use GitHub private vulnerability reporting on this repository. Include affected version, platform, reproduction steps, and impact. Do not include real credentials or signing keys.

## Trust boundary

- Daily capsules are declarative data, not executable code.
- Clients verify Ed25519 signatures and SHA-256 content hashes before installation.
- Tauri core updates use a separate signing key.
- Signing keys live only in protected GitHub Actions secrets.
- Agent proposals are treated as untrusted input.
- GitHub build attestations establish provenance, not safety; consumers must still evaluate the source and release policy.

If a signing key is suspected to be exposed, stop automated publishing immediately, revoke or rotate the affected channel, and document which versions can no longer be trusted.
