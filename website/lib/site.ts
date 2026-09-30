// Every URL and command on the page. Keep these in step with the root README.

export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000').replace(/\/$/, '')

export const REPO = 'https://github.com/tushar-nebhnani/dsa-learning-skill'

export const LINKS = {
  repo: REPO,
  skillMd: `${REPO}/blob/main/dsa-learning-skill/SKILL.md`,
  // Served by the latest GitHub release that has a dsa-learning-skill.zip asset.
  download: `${REPO}/releases/latest/download/dsa-learning-skill.zip`,
  mcp: 'https://dsa-progress-mcp.onrender.com/mcp',
}

export const COMMANDS = {
  addServer: `claude mcp add --transport http -s user dsa-progress ${LINKS.mcp}`,
  unzip: 'unzip dsa-learning-skill.zip -d ~/.claude/skills/',
  clone: `git clone ${REPO}.git\nln -s "$(pwd)/dsa-learning-skill/dsa-learning-skill" ~/.claude/skills/dsa-learning-skill`,
  zip: 'zip -r dsa-learning-skill.zip dsa-learning-skill',
}

export const DESCRIPTION =
  'DSA Tutor is a Claude skill that coaches you through data structures and algorithms problems in twelve stages, one question at a time, and never gives you the answer.'
