import { CommandPalette } from '@/components/CommandPalette'
import { CopyButton } from '@/components/CopyButton'
import { HeroTerminal } from '@/components/HeroTerminal'
import { InstallTabs } from '@/components/InstallTabs'
import { RoadmapBar } from '@/components/RoadmapBar'
import { SessionCards } from '@/components/SessionCards'
import { Nav } from '@/components/Nav'
import { SessionStack } from '@/components/SessionStack'
import { ROADMAP, STAGES, TOPIC_COUNT } from '@/lib/content'
import { DESCRIPTION, LINKS, SITE_URL } from '@/lib/site'

// Structured data, so search engines can describe the page as a piece of software with a download.
const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'SoftwareApplication',
  name: 'DSA Tutor',
  description: DESCRIPTION,
  url: `${SITE_URL}/`,
  applicationCategory: 'EducationalApplication',
  operatingSystem: 'Claude, Claude Code, and MCP clients',
  downloadUrl: LINKS.download,
  softwareHelp: LINKS.repo,
  codeRepository: LINKS.repo,
}

export default function Home() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <a className="skip" href="#top">Skip to content</a>

      <Nav />

      <CommandPalette />

      <main id="top">
        <section className="hero wrap" aria-labelledby="hero-heading">
          <div className="shell">
            <div className="hero-copy">
              <span className="label"><span className="tick" aria-hidden="true" />A Claude skill + MCP server <span className="beta">Beta</span></span>
              <h1 id="hero-heading">Practise DSA without being handed the answer.</h1>
              <p className="lede">The tutor takes each problem through twelve stages and asks one question at a time. You write the pseudo code, find your own bugs and write every line of the code.</p>
              <div className="row">
                <a className="btn primary" href={LINKS.download}>Download the skill (.zip)</a>
                <a className="btn" href="#install">Install steps</a>
                <a className="tlink" href="#session">Walk through a session ↓</a>
              </div>
              <div className="mcp">
                <span className="label">MCP server</span>
                <code id="mcp-hero">{LINKS.mcp}</code>
                <CopyButton target="mcp-hero" />
              </div>
            </div>
            <HeroTerminal />
          </div>
        </section>

        <section className="stack wrap" id="session" aria-labelledby="session-heading">
          <SessionStack stages={STAGES}>
            <SessionCards />
          </SessionStack>
        </section>

        <section className="between wrap" id="memory" aria-labelledby="memory-heading">
          <div className="shell">
            <div className="bcopy">
              <span className="label">Between sessions</span>
              <h2 id="memory-heading">It remembers where you left off.</h2>
              <p>With the optional MCP server, the tutor keeps your preferences, the problems you’ve solved and the ones due for a revisit. Sign in with Google once; your progress follows your account between Claude and other agents.</p>
              <p className="note">Without the server the skill still works, and starts fresh each conversation.</p>
            </div>
            <div className="figs">
              <figure className="fig">
                <figcaption className="label">Revisits</figcaption>
                <div className="days" aria-hidden="true">
                  <span className="d first">1<small>recorded</small></span>
                  {[2, 3, 4, 5, 6, 7].map(d => <span key={d} className="d">{d}</span>)}
                  <span className="d due">8<small>due</small></span>
                </div>
                <p className="note">A problem comes back 7 days after it’s recorded if you needed an answer revealed, or didn’t fully solve it.</p>
              </figure>
              <figure className="fig">
                <figcaption className="label">Roadmap</figcaption>
                <RoadmapBar />
                <p className="note">You move on after three accepted problems in a topic, at least one medium or hard. Or pick one topic and stay there.</p>
              </figure>
            </div>
          </div>
        </section>

        <section className="band wrap" id="rules" aria-labelledby="rules-heading">
          <div className="shell">
            <div className="col">
              <span className="label">Rules of engagement</span>
              <h2 id="rules-heading">What happens after you answer.</h2>
              <p className="on-dark-2">The tutor doesn’t move to the next question until the current one is right.</p>
            </div>
            <table className="rules">
              <tbody>
                <tr><th scope="row">Correct</th><td>It confirms and moves on.</td></tr>
                <tr><th scope="row">Partially correct</th><td>It doesn’t point out the mistake. It asks follow-up questions until you find it. <span>After 5 attempts it treats the answer as incorrect.</span></td></tr>
                <tr><th scope="row">Incorrect</th><td>It asks a narrower question and builds back up. <span>After two narrowing attempts it gives that answer, explains it, and marks the problem to come back in 7 days.</span></td></tr>
              </tbody>
            </table>
          </div>
        </section>

        <section className="install wrap" id="install" aria-labelledby="install-heading">
          <div className="shell">
            <div className="col">
              <span className="label">Install</span>
              <h2 id="install-heading">Pick your client.</h2>
              <p>Then ask: “Coach me through a sliding window problem.”</p>
              <div><a className="btn primary" href={LINKS.download}>Download the skill (.zip)</a></div>
              <p className="note">SKILL.md and its two reference files. The MCP server is optional and remembers your progress.</p>
            </div>
            <InstallTabs />
          </div>
        </section>
      </main>

      <footer className="foot wrap">
        <div className="shell">
          <p>
            <b>dsa tutor</b> · skill: dsa-learning-skill/SKILL.md · references: roadmap.md ({TOPIC_COUNT} topics, {ROADMAP.length} sections), documentation-example.md · server: dsa-progress-mcp (Streamable HTTP, Google sign-in, Postgres) at dsa-progress-mcp.onrender.com/mcp · tools: get_learner_profile, save_learner_preferences, list_solved_problems, list_problems_to_revisit, record_solved_problem · source: <a className="tlink" href={LINKS.repo}>github.com/tushar-nebhnani/dsa-learning-skill</a>
          </p>
        </div>
      </footer>
    </>
  )
}
