import { useEffect, useRef, useState, type FormEvent } from 'react';
import { useFacility, useFacilityEditor } from '../../facility';
import { navigate } from '../../navigation/pages';
import { GuideCharacter } from './GuideCharacter';
import { GuideSettings } from './GuideSettings';
import { GuideActions } from './GuideActions';
import { guideTopics, answerGuide, type GuideTopic } from './guideKnowledge';
import { useFacilityGuide } from './useFacilityGuide';
import type { GuideActionId, GuideAnimation, GuideMessage } from './guideTypes';

export function FacilityGuide() {
  const guide = useFacilityGuide(); const pkg = useFacility(); const editor = useFacilityEditor();
  const c = guide.context; const p = guide.preferences;
  const [topic, setTopic] = useState<GuideTopic>('next');
  const [animation, setAnimation] = useState<GuideAnimation>('enter');
  const [capture, setCapture] = useState(false); const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false); const [error, setError] = useState('');
  const [saved, setSaved] = useState<GuideMessage | null>(null);
  const [observations, setObservations] = useState<{id: string; text: string; verificationStatus: string}[]>([]);
  const [observationError, setObservationError] = useState('');
  const noteRef = useRef<HTMLTextAreaElement>(null);
  const launcher = useRef<HTMLButtonElement>(null);
  const returnFocus = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const wasActive = useRef(false);
  const active = guide.open && p.enabled;
  const message = saved ?? answerGuide(topic, c, p.personality, editor.publication.phase !== 'DISABLED');
  const draftKey = 'iag-genie-draft:' + JSON.stringify([pkg.facility.id, editor.currentUser?.id, c.assetId]);
  const currentDraftKey = useRef(draftKey);
  currentDraftKey.current = draftKey;
  useEffect(() => {
    setSaved(null); setCapture(false); setError(''); setTopic('next'); setBusy(false);
    try { setNote(sessionStorage.getItem(draftKey) ?? ''); } catch { setNote(''); }
    let live = true; setObservations([]); setObservationError('');
    if (c.assetId) void editor.observations(c.assetId).then(rows => { if (live) setObservations(rows); }).catch(() => { if (live) setObservationError('Local observations could not be read. Try reopening this task.'); });
    return () => { live = false; };
  }, [draftKey]);
  useEffect(() => {
    const entering = active && !wasActive.current;
    wasActive.current = active;
    clearTimeout(timer.current);
    if (!active) { setAnimation('sleep'); return; }
    setAnimation(entering ? 'enter' : message.animation ?? 'talk');
    if (entering) timer.current = setTimeout(() => {
      setAnimation(message.animation === 'enter' ? 'talk' : message.animation ?? 'talk');
      timer.current = setTimeout(() => setAnimation('idle'), 2200);
    }, 1100);
    else timer.current = setTimeout(() => setAnimation('idle'), 2600);
    return () => clearTimeout(timer.current);
  }, [active, topic, saved, c.assetId, p.personality]);
  useEffect(() => { if (capture) noteRef.current?.focus(); }, [capture]);
  useEffect(() => {
    if (!active && returnFocus.current) { launcher.current?.focus({ preventScroll: true }); returnFocus.current = false; }
  }, [active]);
  useEffect(() => () => clearTimeout(timer.current), []);
  function close(hide = false) {
    returnFocus.current = true;
    clearTimeout(timer.current); setAnimation('exit');
    timer.current = setTimeout(() => { guide.dismiss(); if (hide) guide.setPreferences({ ...p, enabled: false, snoozedUntil: Date.now() + 8 * 60 * 60_000 }); launcher.current?.focus(); }, p.animationMode === 'full' && !matchMedia('(prefers-reduced-motion: reduce)').matches ? 280 : 0);
  }
  function runAction(action: GuideActionId) {
    if (action === 'capture-note') { setCapture(true); setSaved(null); return; }
    guide.dispatch(action);
  }
  async function saveNote(event: FormEvent) {
    event.preventDefault();
    if (!c.assetId || !editor.currentUser || !note.trim() || busy) return;
    setBusy(true); setError(''); clearTimeout(timer.current); setAnimation('think');
    try {
      const row = await editor.addObservation({ assetId: c.assetId, text: note.trim(), verificationStatus: 'FIELD_VERIFY', createdBy: editor.currentUser.name });
      try { sessionStorage.removeItem(draftKey); } catch { /* Draft cache optional. */ }
      if (currentDraftKey.current !== draftKey) return;
      setObservations(rows => [...rows, row]); setNote('');
      setCapture(false); setAnimation('success');
      setSaved({ id: 'saved-' + row.id, title: p.personality === 'professional' ? 'Observation saved.' : p.personality === 'full' ? 'That’s one less campfire story.' : 'Good catch. The next shift thanks you.', body: 'Saved for ' + c.assetId + ' as FIELD_VERIFY. Your observation is retained separately; canonical asset facts have not changed.', animation: 'success', actions: [{ id: 'review', label: 'Open review', primary: true }, { id: 'attach-evidence', label: 'Add supporting evidence' }] });
      guide.setPreferences({ ...p, dismissed: [...new Set([...p.dismissed, c.assetId + ':unfinished'])] });
    } catch (err) { if (currentDraftKey.current === draftKey) { setError(err instanceof Error ? err.message : 'Could not save. Your note is still here.'); setAnimation('warning'); } }
    finally { if (currentDraftKey.current === draftKey) setBusy(false); }
  }
  return <section className="facility-guide genie-workbench" aria-label="Genie workbench" onKeyDown={event => { if (event.key === 'Escape') { if (guide.settingsOpen) guide.setSettingsOpen(false); else close(); } }}>
    <header className="genie-topline"><div><span className="genie-wordmark">GENIE<span aria-hidden="true"> / </span></span><span className="genie-kicker">YOUR NEXT-SHIFT ADVANTAGE</span></div><button type="button" onClick={() => guide.setSettingsOpen(!guide.settingsOpen)} aria-expanded={guide.settingsOpen}>Preferences</button></header>
    {guide.settingsOpen && <GuideSettings/>}
    {!active ? <div className="genie-welcome">
      <GuideCharacter animation="sleep" mode={p.animationMode}/>
      <div><span className="genie-kicker">ON YOUR SIDE. OUT OF YOUR WAY.</span><h2>{p.enabled ? 'A little character.\nA lot less guesswork.' : 'Off duty. Call when you need me.'}</h2><p>Find the missing detail. Keep the evidence. Leave a better record for the next person.</p><button ref={launcher} className="genie-primary" onClick={() => guide.setOpen(true)}>{p.tourComplete ? 'Call Genie back' : 'Meet Genie'} <span aria-hidden="true">↗</span></button><small>Local record guide · no live AI or microphone</small></div>
    </div> : <>
      <div className="genie-context"><label>Working on<select aria-label="Genie equipment" value={c.assetId ?? ''} onChange={event => navigate('help', { asset: event.target.value, from: c.page, area: c.areaId ?? '' })}><option value="">Choose equipment{c.areaName ? ' in ' + c.areaName : ''}</option>{pkg.assets.filter(a => !c.areaId || a.areaId === c.areaId || a.id === c.assetId).map(a => <option key={a.id} value={a.id}>{a.name} · {a.id}</option>)}</select></label>{c.areaName && <button onClick={() => navigate('help', { from: c.page })}>All areas</button>}<span>{c.assetId ? c.verification : pkg.facility.name}</span></div>
      <div className="genie-stage">
        <div className="genie-character-stage"><div className="genie-orbit" aria-hidden="true"/><GuideCharacter animation={animation} mode={p.animationMode}/><span className="genie-state-label">{busy ? 'Saving your observation…' : animation === 'success' ? 'Finding saved' : 'Ready when you are'}</span></div>
        <section className="genie-answer" aria-label="Genie answer"><span className="genie-kicker">{saved ? 'SAVED FINDING' : c.assetId ? 'FROM YOUR FACILITY RECORD' : 'LET’S GET SOMETHING DONE'}</span><div aria-live="polite" aria-atomic="true"><h2>{message.title}</h2><p>{message.body}</p></div><GuideActions actions={message.actions} onAction={runAction}/><div className="genie-quiet-controls"><button onClick={() => close()}>Not now · 8h quiet</button><button onClick={() => close()}>Minimize</button><button onClick={() => close(true)}>Hide Genie</button></div></section>
      </div>
      <div className="genie-bottom-grid">
        <section className="genie-task-panel"><h3>What are we solving?</h3><div className="genie-topics">{guideTopics.map(([id,label]) => <button key={id} aria-pressed={topic === id && !saved} onClick={() => { setSaved(null); setTopic(id); }}>{label}<span aria-hidden="true">↗</span></button>)}</div>
          {c.assetId && <><button className="genie-note-open" onClick={() => { setCapture(!capture); setSaved(null); }} aria-expanded={capture}>+ {note ? 'Continue my field note' : 'Leave a field note'}</button>{capture && <form className="genie-note" onSubmit={saveNote}><label htmlFor="genie-note">What did you observe, and where?<textarea id="genie-note" ref={noteRef} maxLength={4000} rows={4} value={note} onChange={event => { setNote(event.target.value); try { sessionStorage.setItem(draftKey,event.target.value); } catch { /* Cache optional. */ } }} placeholder="Record the label, what you saw, and its source. Leave uncertain details uncertain."/></label><small>Saved as FIELD_VERIFY. {editor.publication.phase === 'DISABLED' ? 'Stored locally; shared publication is off.' : 'Facility public sharing is enabled.'} Draft retained in this browser tab.</small><button className="genie-primary" disabled={busy || !note.trim() || !editor.currentUser}>{busy ? 'Saving…' : 'Save observation'}</button>{error && <p role="alert">{error}</p>}</form>}</>}
        </section>
        <section className="genie-record-panel"><div className="genie-section-heading"><h3>The record, at a glance</h3><span>LOCAL PACKAGE</span></div>{c.assetId ? <>
          <dl className="genie-metrics"><div><dt>Required docs</dt><dd>{c.documentationPercent === undefined ? '—' : c.documentationPercent + '%'}</dd></div><div><dt>Evidence refs</dt><dd>{c.evidenceCount}</dd></div><div><dt>Direct links</dt><dd>{c.relationshipCount}</dd></div></dl><small>{c.requiredDocuments ? c.requiredDocuments + ' required documents · weighted progress, not verification' : 'No required-document checklist defined; percentage unavailable.'}</small>
          <details open={topic === 'next' ? true : undefined}><summary>Recorded follow-up · {c.missingFields?.length ?? 0}</summary><ul>{c.missingFields?.slice(0,5).map(gap => <li key={gap}>{gap}</li>)}</ul>{(c.missingFields?.length ?? 0) > 5 && <button onClick={() => guide.dispatch('capture-electrical')}>See remaining items in field sheet →</button>}</details>
          <details open={topic === 'electrical' || topic === 'verification' ? true : undefined}><summary>Fact values & sources · {c.facts?.length ?? 0}</summary><div className="genie-source-list">{c.facts?.map((fact,i) => <article key={fact.label + i}><strong>{fact.label}: {fact.value}</strong><span>{fact.state}</span><small>{fact.source}</small></article>)}</div></details>
          <details open={topic === 'trace' ? true : undefined}><summary>Direct relationship records · {c.links?.length ?? 0}</summary><div className="genie-source-list">{c.links?.map(link => <article key={link.id}><strong>{link.label}</strong><span>{link.state} · {link.evidenceCount} evidence refs</span><button onClick={() => navigate('dependencies', { connection: link.id })}>{link.id} →</button></article>)}</div></details>
          <details><summary>Saved observations · {observations.length}</summary>{observationError && <p role="alert">{observationError}</p>}{observations.map(row => <article className="genie-observation" key={row.id}><strong>{row.verificationStatus}</strong><p>{row.text}</p><small>Observation · {row.id}</small></article>)}</details>
        </> : <p>Select equipment to inspect its real documentation gaps and sources. No asset is selected for you.</p>}</section>
      </div>
    </>}
    <footer className="genie-footer"><span>Local rules + your facility records. No generated plant facts.</span><span>Genie never establishes safe isolation.</span></footer>
  </section>;
}
