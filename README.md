# p2r

**Partaker Participation Review** — A YAML-first framework for atomic, sovereign participation reporting in human-AI coordination cycles.

## Structure

```
/schema/          P2R schema definition
/reports/p2r/     Partaker-authored YAML reports (source of truth)
/scripts/         Build scripts (YAML → JSON validation & conversion)
/site/            Vite SPA visualizer source
/.github/         CI/CD workflows
```

## Local Development

```bash
npm install           # install root deps (yaml parser)
npm run build:data    # validate YAMLs and generate site/public/data.json
cd site && npm install && npm run dev
```

## Authoring a P2R

Create a new YAML file in `/reports/p2r/` following the schema in `/schema/p2r_schema_v1.yaml`.

Key constraint: `sovereignty_attestation` **must be `true`** and the `learning` block must be written in first person, describing only your own perspective. Collective or third-person language in the `learning` field will cause the build to fail.

## Deploy

Push to `main` — GitHub Actions validates all YAML reports, builds the SPA, and deploys to GitHub Pages automatically.
