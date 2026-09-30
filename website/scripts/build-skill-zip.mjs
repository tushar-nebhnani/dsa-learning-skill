// Zips the skill (../dsa-learning-skill: SKILL.md + references/) into public/dsa-learning-skill.zip,
// so the site serves its own download and it always matches the commit being deployed.
// Runs before `npm run dev` and `npm run build`. Pure JavaScript, so hosts without a `zip` command work too.
import { existsSync, readdirSync, readFileSync, statSync, mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { join, relative, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { zipSync } from 'fflate'

const here = dirname(fileURLToPath(import.meta.url))
const skillDir = join(here, '..', '..', 'dsa-learning-skill')
const out = join(here, '..', 'public', 'dsa-learning-skill.zip')
const SKIP = new Set(['.DS_Store', '__MACOSX', 'Thumbs.db'])
// A fixed date keeps the zip byte-identical between builds when the skill hasn't changed.
const MTIME = new Date('2026-01-01T00:00:00Z')

const files = {}
const walk = dir => {
  for (const name of readdirSync(dir).sort()) {
    if (SKIP.has(name) || name.startsWith('._')) continue
    const path = join(dir, name)
    if (statSync(path).isDirectory()) walk(path)
    else files[`dsa-learning-skill/${relative(skillDir, path).split('\\').join('/')}`] = [readFileSync(path), { mtime: MTIME }]
  }
}
if (!existsSync(join(skillDir, 'SKILL.md'))) {
  // Don't break the build: next.config.ts sees the zip is missing and links to the GitHub release instead.
  rmSync(out, { force: true })
  console.warn(`⚠ skill zip skipped: ${skillDir} not found (is the repo root available to the build?)`)
  process.exit(0)
}
walk(skillDir)

mkdirSync(dirname(out), { recursive: true })
const zip = zipSync(files, { level: 9 })
writeFileSync(out, zip)
console.log(`skill zip: ${Object.keys(files).length} files, ${(zip.length / 1024).toFixed(1)} KB → public/dsa-learning-skill.zip`)
