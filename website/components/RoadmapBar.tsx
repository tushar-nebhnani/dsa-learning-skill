'use client'

import { useState } from 'react'
import { ROADMAP, TOPIC_COUNT } from '@/lib/content'

/** One segment per roadmap section, sized by its real topic count. Hover, tap or focus a segment to name it. */
export function RoadmapBar() {
  const [active, setActive] = useState<number | null>(null)
  const picked = active === null ? null : ROADMAP[active]

  return (
    <>
      <div className="segs" role="group" aria-label="Roadmap sections" onMouseLeave={() => setActive(null)}>
        {ROADMAP.map(([name, topics], i) => (
          <button
            key={name}
            type="button"
            className={`seg${active === i ? ' on' : ''}`}
            style={{ flex: topics }}
            aria-label={`${name}: ${topics} topics`}
            onMouseEnter={() => setActive(i)}
            onFocus={() => setActive(i)}
            onBlur={() => setActive(null)}
            onClick={() => setActive(i)}
          />
        ))}
      </div>
      <p className="segcap" aria-live="polite">
        {picked
          ? <><b>{picked[0]}</b> · {picked[1]} topic{picked[1] > 1 ? 's' : ''}</>
          : <><b>{TOPIC_COUNT} topics</b> in {ROADMAP.length} sections, from Array Basics to Segment Trees. Hover a section.</>}
      </p>
    </>
  )
}
