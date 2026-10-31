import React, { useEffect, useId, useRef, useState } from 'react';
import { Search, X, Clock3 } from 'lucide-react';
import { createPortal } from 'react-dom';
import './MobilePageSearch.css';

const rowSelector = '[class*="header-row"], .ios-dashboard-top-row, .ot-page-head, .pdfgen-header, .moa-unified-header, .it-support-header';
const controlsFor = target => target ? target.split(',').flatMap(selector => [...document.querySelectorAll(selector.trim())]) : [];
const userKey = () => { try { const user = JSON.parse(localStorage.getItem('user') || '{}'); return user._id || user.id || user.email || 'local'; } catch { return 'local'; } };
const loadRecent = key => { try { const data = JSON.parse(localStorage.getItem(key) || '[]'); return Array.isArray(data) ? data.filter(value => typeof value === 'string').slice(0, 8) : []; } catch { return []; } };

// Search lives immediately beneath the header row. Filters retain their own UI.
export default function MobilePageSearch({ target, value, onChange, label = 'Search this page', placeholder, moduleKey, suggestions = [] }) {
  const trigger = useRef(null), input = useRef(null), timer = useRef(null), applyRef = useRef(null);
  const [available, setAvailable] = useState(true);
  const availableRef = useRef(true);
  useEffect(() => {
    const update = () => {
      const next = Boolean(onChange || controlsFor(target).length);
      if (availableRef.current !== next) { availableRef.current = next; setAvailable(next); }
    };
    update();
    const observer = new MutationObserver(update);
    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, [target, onChange]);
  const [host, setHost] = useState(null), [open, setOpen] = useState(false), [term, setTerm] = useState(value || '');
  const [options, setOptions] = useState([]), [recent, setRecent] = useState([]);
  const id = useId();
  const key = `rms:recent-search:${userKey()}:${moduleKey || window.location.hash.slice(1).split('?')[0] || 'dashboard'}`;
  useEffect(() => {
    const row = trigger.current?.closest(rowSelector);
    if (!row) return;
    const anchor = document.createElement('div');
    anchor.className = 'mobile-search-host';
    if (row.matches('.ot-page-head, .pdfgen-header, .moa-unified-header, .it-support-header')) row.appendChild(anchor);
    else row.insertAdjacentElement('afterend', anchor);
    setHost(anchor);
    return () => { clearTimeout(timer.current); anchor.remove(); };
  }, []);
  useEffect(() => { if (value !== undefined) setTerm(value || ''); }, [value]);
  useEffect(() => { setRecent(loadRecent(key)); }, [key]);
  const remember = text => {
    const clean = String(text || '').trim().slice(0, 200);
    if (!clean) return;
    const next = [clean, ...loadRecent(key).filter(item => item.toLowerCase() !== clean.toLowerCase())].slice(0, 8);
    setRecent(next);
    try { localStorage.setItem(key, JSON.stringify(next)); } catch { /* Search still works without storage. */ }
  };
  const apply = text => {
    if (onChange) { onChange(text); return; }
    const controls = controlsFor(target);
    const control = controls[0];
    if (!control) return;
    if (control.tagName === 'SELECT') {
      const option = [...control.options].find(item => text ? item.text.toLowerCase() === text.toLowerCase() : item.value === '');
      if (option) {
        Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value').set.call(control, option.value);
        control.dispatchEvent(new Event('change', { bubbles: true }));
      }
    } else if (control.tagName === 'BUTTON') {
      controls.find(node => node.tagName === 'BUTTON' && (text ? node.textContent.trim().toLowerCase() === text.toLowerCase() : /^all\b/i.test(node.textContent.trim())))?.click();
    } else {
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(control, text);
      control.dispatchEvent(new Event('input', { bubbles: true }));
    }
  };
  applyRef.current = apply;
  const change = text => {
    setTerm(text); clearTimeout(timer.current);
    if (!text) applyRef.current('');
    else timer.current = setTimeout(() => applyRef.current(text), 250);
  };
  const choose = text => { clearTimeout(timer.current); setTerm(text); applyRef.current(text); remember(text); };
  const toggle = () => {
    if (open) { setOpen(false); return; }
    const controls = controlsFor(target), control = controls[0];
    if (value === undefined && control && control.tagName === 'INPUT') setTerm(control.value || '');
    setOptions(control?.tagName === 'SELECT' ? [...control.options].filter(option => !option.disabled).map(option => option.text)
      : control?.tagName === 'BUTTON' ? controls.filter(node => node.tagName === 'BUTTON').map(node => node.textContent.trim()) : []);
    setOpen(true);
  };
  useEffect(() => { if (open) input.current?.focus(); }, [open]);
  const matches = [...new Set([...recent, ...options, ...suggestions].filter(Boolean))]
    .filter(text => text.toLowerCase().includes(term.trim().toLowerCase()) && text.toLowerCase() !== term.trim().toLowerCase()).slice(0, 6);
  return <>
    <button ref={trigger} type="button" hidden={!available} className={`mobile-page-search ${open || term ? 'active' : ''}`} onClick={toggle} aria-label={label} title={label} aria-expanded={open} aria-controls={id}><Search size={20} /></button>
    {host && open && createPortal(<section className="mobile-inline-search" id={id} aria-label={label}>
      <form className="mobile-inline-search-field" onSubmit={event => { event.preventDefault(); choose(term); input.current?.blur(); }}>
        <Search size={14} aria-hidden="true" />
        <input ref={input} type="search" maxLength={200} value={term} aria-label={label} placeholder={placeholder || label} autoComplete="off" onChange={event => change(event.target.value)} onBlur={() => remember(term)} onKeyDown={event => { if (event.key === 'Escape') { setOpen(false); trigger.current?.focus(); } }} />
        {term && <button type="button" onClick={() => { change(''); input.current?.focus(); }} aria-label="Clear search"><X size={18} /></button>}
      </form>
      {!!matches.length && <div className="mobile-inline-suggestions"><span>{term ? 'Suggestions' : recent.length ? 'Recent & suggested' : 'Suggested searches'}</span>{matches.map(text => <button key={text} type="button" onMouseDown={event => event.preventDefault()} onClick={() => choose(text)}><Clock3 size={14} aria-hidden="true" /><span>{text}</span></button>)}</div>}
    </section>, host)}
  </>;
}
