// Every URL and command on the page. Keep these in step with the root README.

// The live site. Override with NEXT_PUBLIC_SITE_URL for a preview or another domain.
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || 'https://dsa-tutor.tushardev.in').replace(/\/$/, '')

export const REPO = 'https://github.com/tushar-nebhnani/dsa-learning-skill'

export const LINKS = {
  repo: REPO,
  skillMd: `${REPO}/blob/main/dsa-learning-skill/SKILL.md`,
  // Normally the zip the site serves itself, built from dsa-learning-skill/ before every build (scripts/build-skill-zip.mjs).
  // next.config.ts falls back to the GitHub release when the zip could not be built.
  download: process.env.NEXT_PUBLIC_SKILL_ZIP || `${REPO}/releases/latest/download/dsa-learning-skill.zip`,
  // The same zip, attached to each GitHub release by .github/workflows/release-skill.yml.
  releaseDownload: `${REPO}/releases/latest/download/dsa-learning-skill.zip`,
  mcp: 'https://dsa-progress-mcp.onrender.com/mcp',
}

export const COMMANDS = {
  addServer: `claude mcp add --transport http -s user dsa-progress ${LINKS.mcp}`,
  unzip: 'unzip dsa-learning-skill.zip -d ~/.claude/skills/',
  clone: `git clone ${REPO}.git\nln -s "$(pwd)/dsa-learning-skill/dsa-learning-skill" ~/.claude/skills/dsa-learning-skill`,
  zip: 'zip -r dsa-learning-skill.zip dsa-learning-skill',
}

export const DOWNLOAD_NAME = 'dsa-learning-skill.zip'

export const DESCRIPTION =
  'DSA Tutor is a Claude skill that coaches you through data structures and algorithms problems in twelve stages, one question at a time, and never gives you the answer.'
