'use client'

import { useRef, useState } from 'react'
import { COMMANDS, LINKS } from '@/lib/site'
import { CopyButton } from './CopyButton'

const TABS = [
  { id: 'code', label: 'Claude Code' },
  { id: 'web', label: 'Claude web & desktop' },
  { id: 'other', label: 'Other agents' },
] as const

type TabId = (typeof TABS)[number]['id']

function Cmd({ id, label, text }: { id: string; label: string; text: string }) {
  return (
    <div className="cmd">
      <div className="row"><span className="label">{label}</span><CopyButton target={id} /></div>
      <div className="code"><pre id={id}>{text}</pre></div>
    </div>
  )
}

/** Install steps per client. All three panels are in the HTML for search engines and no-JS readers; only one shows at a time. */
export function InstallTabs() {
  const [tab, setTab] = useState<TabId>('code')
  const refs = useRef<(HTMLButtonElement | null)[]>([])

  const onKeyDown = (e: React.KeyboardEvent, i: number) => {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return
    const next = (i + (e.key === 'ArrowRight' ? 1 : TABS.length - 1)) % TABS.length
    setTab(TABS[next].id)
    refs.current[next]?.focus()
  }

  return (
    <div>
      <div className="tabs" role="tablist" aria-label="Client">
        {TABS.map((t, i) => (
          <button
            key={t.id}
            ref={el => { refs.current[i] = el }}
            className="tab"
            role="tab"
            id={`tab-${t.id}`}
            type="button"
            aria-selected={tab === t.id}
            aria-controls={`panel-${t.id}`}
            tabIndex={tab === t.id ? 0 : -1}
            onClick={() => setTab(t.id)}
            onKeyDown={e => onKeyDown(e, i)}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="panel" id="panel-code" role="tabpanel" aria-labelledby="tab-code" hidden={tab !== 'code'}>
        <Cmd id="cmd-add-server" label="Add the server" text={COMMANDS.addServer} />
        <Cmd id="cmd-unzip" label="Install the downloaded skill" text={COMMANDS.unzip} />
        <Cmd id="cmd-clone" label="Or clone it, to update with git pull" text={COMMANDS.clone} />
        <p className="note">Then run <code>/mcp</code>, choose dsa-progress → Authenticate.</p>
      </div>

      <div className="panel" id="panel-web" role="tabpanel" aria-labelledby="tab-web" hidden={tab !== 'web'}>
        <ol>
          <li>Settings → Connectors → Add custom connector. Paste the server URL and sign in with Google.</li>
          <li>Settings → Capabilities: turn on Code execution and file creation.</li>
          <li><a className="tlink" href={LINKS.download}>Download the skill zip</a> (or build it from the repo root) and upload it under Skills.</li>
        </ol>
        <Cmd id="cmd-server-url" label="Server URL" text={LINKS.mcp} />
        <Cmd id="cmd-zip" label="Zip the skill" text={COMMANDS.zip} />
        <p className="note">Custom connectors and skills depend on your Claude plan.</p>
      </div>

      <div className="panel" id="panel-other" role="tabpanel" aria-labelledby="tab-other" hidden={tab !== 'other'}>
        <p>The server works with clients that support remote MCP over Streamable HTTP with OAuth and dynamic client registration, such as Cursor, VS Code (Copilot agent mode), Windsurf, Codex CLI, Gemini CLI and ChatGPT developer-mode connectors.</p>
        <p>For the skill, load the whole <code>dsa-learning-skill/</code> folder, or paste <code>SKILL.md</code> followed by the two files in <code>references/</code> into the agent’s instructions.</p>
        <p className="note">Written and tested with Claude. On other models, check that the rules hold.</p>
      </div>
    </div>
  )
}
