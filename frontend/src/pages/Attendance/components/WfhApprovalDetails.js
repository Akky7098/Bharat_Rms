import React from 'react';
import useAttendanceDialog from '../hooks/useAttendanceDialog';
import { formatDate, getDateKey } from '../utils/attendanceHelpers';
const dateTime = value => value ? new Date(value).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }) : 'Not recorded';
export default function WfhApprovalDetails({ open, onClose, requests = [] }) {
  const dialog = useAttendanceDialog(open, false, onClose);
  if (!open) return null;
  const approved = requests.filter(request => request.status === 'approved');
  const today = getDateKey(new Date());
  return <div className="timesheet-modal-overlay" onMouseDown={onClose}>
    <section ref={dialog} className="timesheet-modal attendance-wfh-modal attendance-wfh-history-modal" role="dialog" aria-modal="true" aria-labelledby="wfh-approval-title" onMouseDown={event => event.stopPropagation()}>
      <header className="modal-header"><div><span className="attendance-eyebrow">APPROVAL HISTORY</span><h3 id="wfh-approval-title">Approved work from home</h3><p>You can mark attendance from home during the approved dates.</p></div><button type="button" onClick={onClose} aria-label="Close WFH approval history">×</button></header>
      <div className="wfh-approval-history">
        {!approved.length && <p>No approved WFH requests in the selected period.</p>}
        {approved.map(request => {
          const events = request.history?.length ? request.history : [
            { action: 'applied', performedByName: request.employeeName, at: request.createdAt },
            { action: 'approved', performedByName: request.decidedByName || 'MD Sir', at: request.decidedAt },
          ];
          const from = getDateKey(request.fromDate), to = getDateKey(request.toDate);
          return <article className="regularization-request-card wfh-approval-card" data-wfh-state={today < from ? "upcoming" : today > to ? "completed" : "active"} key={request._id}>
            <div className="regularization-request-top"><div><h4>{request.employeeName}</h4><p>{formatDate(request.fromDate)}{from !== to ? ` – ${formatDate(request.toDate)}` : ''}</p></div><span>{today < from ? 'Upcoming WFH' : today > to ? 'Completed WFH' : 'WFH active today'}</span></div>
            <p><b>Reason:</b> {request.reason}</p>
            <p><b>Approved by:</b> {request.decidedByName || 'MD Sir'} · {dateTime(request.decidedAt)}</p>
            <ol>{events.map((event, index) => <li key={index}><strong>{event.action}</strong> · {event.performedByName || 'Recorded user'} · {dateTime(event.at)}{event.comment ? <p>{event.comment}</p> : null}</li>)}</ol>
            <small>Request reference: {request._id}</small>
          </article>;
        })}
      </div>
    </section>
  </div>;
}
