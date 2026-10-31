import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { shortLeaveClock } from '../utils/shortLeave';
import { formatDate } from '../utils/attendanceHelpers';

export default function AttendanceDecisionModal({ item, action, onClose, onConfirm }) {
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const dialog = useRef(null), submitting = useRef(false);
  const reject = action === 'reject';
  useEffect(() => {
    const previous = document.activeElement;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    dialog.current?.querySelector('button')?.focus();
    return () => { document.body.style.overflow = overflow; previous?.focus(); };
  }, []);
  const close = () => { if (!submitting.current) onClose(); };
  const submit = async event => {
    event.preventDefault();
    if (submitting.current) return;
    if (reject && !reason.trim()) { setError('Enter a rejection reason.'); return; }
    submitting.current = true; setBusy(true); setError('');
    try {
      const result = await onConfirm(item, reason.trim());
      if (result !== false) onClose();
    } catch (failure) { setError(failure?.message || 'Unable to process this request.'); }
    finally { submitting.current = false; setBusy(false); }
  };
  const type = item.requestKind === 'work-from-home' ? 'Work From Home' : item.requestKind === 'short-leave' ? 'Short Leave' : item.requestKind === 'leave' ? (item.leaveType === 'loss_of_pay' ? 'Loss of Pay' : 'Paid Leave') : 'Attendance Regularization';
  const from = formatDate(item.requestKind ? item.fromDate : item.attendanceDate);
  const dates = item.requestKind && item.toDate !== item.fromDate ? `${from} – ${formatDate(item.toDate)}` : from;
  return createPortal(<div className="att-decision-overlay" onMouseDown={event => { if (event.target === event.currentTarget) close(); }}>
    <section ref={dialog} className={`att-decision-modal ${reject ? 'is-reject' : ''}`} role="dialog" aria-modal="true" aria-labelledby="att-decision-title" onKeyDown={event => {
      if (event.key === 'Escape') { event.stopPropagation(); close(); }
      if (event.key === 'Tab') {
        const controls = [...dialog.current.querySelectorAll('button:not(:disabled), textarea:not(:disabled)')];
        const first = controls[0], last = controls[controls.length - 1];
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
      }
    }}>
      <header><div><span>ATTENDANCE REQUEST</span><h3 id="att-decision-title">{reject ? 'Reject' : 'Approve'} request?</h3></div><button type="button" aria-label="Close confirmation" disabled={busy} onClick={close}>×</button></header>
      <form onSubmit={submit}>
        <p>Review the details before you {reject ? 'reject' : 'approve'} this request.</p>
        <div className="att-decision-summary"><strong>{item.employeeName || item.employeeId?.name || 'Employee'}</strong><span>{type}</span><span>{dates}</span>{item.startTime && <span>{shortLeaveClock(item.startTime)} – {shortLeaveClock(item.endTime)} IST · {item.shortLeaveMinutes} minutes</span>}<p>{item.requestKind ? item.reason : item.regularization?.reason}</p></div>
        {reject && <label htmlFor="att-decision-reason">Rejection reason<textarea id="att-decision-reason" value={reason} onChange={event => setReason(event.target.value)} placeholder="Explain why this request is being rejected" maxLength={2000} required disabled={busy} /></label>}
        {error && <p role="alert" className="att-request-error">{error}</p>}
        <footer><button type="button" disabled={busy} onClick={close}>Cancel</button><button className="att-decision-confirm" type="submit" disabled={busy}>{busy ? 'Processing…' : reject ? 'Confirm rejection' : 'Confirm approval'}</button></footer>
      </form>
    </section>
  </div>, document.body);
}
