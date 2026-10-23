import React, { useEffect, useState } from 'react';
import { getDateKey } from '../utils/attendanceHelpers';
import { shortLeaveDetails } from '../utils/shortLeave';
import useAttendanceDialog from '../hooks/useAttendanceDialog';
import { getAttendanceLeaveSummary, getAttendanceList } from '../../../services/attendanceService';
export const requestedLeaveUnits = (from, to, duration) => {
  if (!from || !to || to < from) return 0;
  let count = 0;
  const end = new Date(`${to}T00:00:00Z`);
  for (let day = new Date(`${from}T00:00:00Z`); day <= end; day.setUTCDate(day.getUTCDate() + 1)) {
    if (day.getUTCDay() !== 0) count += duration === 'full_day' ? 1 : .5;
    if (count > 366) break;
  }
  return count;
};
export default function LeaveModal({ state, setState, summary, onSubmit, employeeId }) {
  const dialog = useAttendanceDialog(state?.open, state?.submitting, () => setState(previous => ({ ...previous, open: false })));
  const [liveBalance, setLiveBalance] = useState(null);
  const [balanceError, setBalanceError] = useState('');
  const [loadingBalance, setLoadingBalance] = useState(false);
  const [retry, setRetry] = useState(0);
  const [attendance, setAttendance] = useState({ date: '', record: null, loading: false, error: '' });
  useEffect(() => {
    if (!state?.open || !state.fromDate) return;
    let active = true;
    const date = state.fromDate;
    setAttendance({ date, record: null, loading: true, error: '' });
    getAttendanceList({ fromDate: date, toDate: date, employeeId }).then(response => {
      if (!active) return;
      const record = response.data?.[0] || null;
      setAttendance({ date, record, loading: false, error: '' });
      if (shortLeaveDetails(record, date).eligible) {
        setState(previous => previous.fromDate === date ? { ...previous, leaveType: 'short_leave', duration: 'full_day', toDate: date } : previous);
      }
    }).catch(error => { if (active) setAttendance({ date, record: null, loading: false, error: error?.response?.data?.message || 'Unable to load attendance for this date.' }); });
    return () => { active = false; };
  }, [state?.open, state?.fromDate, employeeId, setState]);
  const year = state?.fromDate?.slice(0, 4);
  useEffect(() => {
    if (!state?.open || !year) return;
    let active = true;
    setLoadingBalance(true); setBalanceError(''); setLiveBalance(null);
    getAttendanceLeaveSummary({ year, month: 1 }).then(response => {
      if (active) setLiveBalance(response.data?.balance || response.balance || {});
    }).catch(error => { if (active) setBalanceError(error?.response?.data?.message || 'Unable to load earned leave. Retry, or apply for Loss of Pay.'); })
      .finally(() => { if (active) setLoadingBalance(false); });
    return () => { active = false; };
  }, [state?.open, year, retry]);
  if (!state?.open) return null;
  const balance = liveBalance || (String(summary?.balance?.year) === year ? summary.balance : {});
  const remaining = balance.availablePaidLeave;
  const units = requestedLeaveUnits(state.fromDate, state.toDate, state.duration);
  const paid = state.leaveType === 'paid_leave';
  const short = state.leaveType === 'short_leave';
  const details = shortLeaveDetails(attendance.record, state.fromDate);
  const shortReady = attendance.date === state.fromDate && !attendance.loading && !attendance.error && details.eligible;
  const insufficient = paid && Number.isFinite(remaining) && units > remaining;
  const invalidRange = state.toDate < state.fromDate || (state.duration !== 'full_day' && state.fromDate !== state.toDate) || state.toDate?.slice(0, 4) !== year;
  const update = (field, value) => setState(previous => ({ ...previous, [field]: value, error: '' }));
  const close = () => { if (!state.submitting) setState(previous => ({ ...previous, open: false })); };
  return <div className="timesheet-modal-overlay" onMouseDown={close}>
    <section ref={dialog} className="timesheet-modal attendance-leave-modal" role="dialog" aria-modal="true" aria-labelledby="att-leave-title" onMouseDown={event => event.stopPropagation()}>
      <header className="modal-header"><div><span className="attendance-eyebrow">LEAVE REQUEST</span><h3 id="att-leave-title">Apply leave</h3><p>Your request will be reviewed by MD Sir.</p></div><button type="button" onClick={close} disabled={state.submitting} aria-label="Close leave request">×</button></header>
      <form className="attendance-leave-form" onSubmit={onSubmit}>
        {state.error && <p className="att-request-error" role="alert">{state.error}</p>}
        {!short && balanceError && <p className="att-request-error" role="alert">{balanceError} <button type="button" onClick={() => setRetry(retry + 1)}>Retry balance</button></p>}
        {!short && <div className="attendance-leave-balance-banner" aria-busy={loadingBalance}>
          <div><span>Available</span><strong>{loadingBalance ? '…' : remaining ?? '—'}</strong></div><div><span>Used</span><strong>{balance.approvedPaidLeave ?? '—'}</strong></div><div><span>Pending</span><strong>{balance.pendingPaidLeave ?? '—'}</strong></div>
        </div>}
        {!short && <p className="att-earned-policy">{year} allowance: {balance.earnedPaidLeave ?? '—'} earned of 12 maximum. One initial day, then one per 20 completed attendance days. Unused earned leave carries across months in this year.</p>}
        <fieldset disabled={!!state.submitting} className="att-request-fieldset"><div className="attendance-leave-grid">
          <label>Leave type<select value={state.leaveType} onChange={event => setState(previous => ({ ...previous, leaveType: event.target.value, toDate: event.target.value === 'short_leave' ? previous.fromDate : previous.toDate, duration: event.target.value === 'short_leave' ? 'full_day' : previous.duration, error: '' }))}><option value="paid_leave">Paid leave</option><option value="loss_of_pay">Loss of Pay (LOP)</option><option value="short_leave">Short leave</option></select></label>
          {!short && <label>Duration<select value={state.duration} onChange={event => setState(previous => ({ ...previous, duration: event.target.value, toDate: event.target.value === 'full_day' ? previous.toDate : previous.fromDate }))}><option value="full_day">Full day</option><option value="first_half">First half</option><option value="second_half">Second half</option></select></label>}
          <label>{short ? "Attendance date" : "From date"}<input type="date" required max={short ? getDateKey(new Date()) : undefined} value={state.fromDate} onChange={event => setState(previous => ({ ...previous, fromDate: event.target.value, toDate: previous.leaveType === 'short_leave' || previous.duration !== 'full_day' || previous.toDate < event.target.value ? event.target.value : previous.toDate, error: '' }))}/></label>
          {!short && <label>To date<input type="date" required min={state.fromDate} max={`${year}-12-31`} value={state.toDate} disabled={state.duration !== 'full_day'} onChange={event => update('toDate', event.target.value)}/></label>}
        </div>
        {!short && <p className="att-earned-policy">{units} {units === 1 ? 'day' : 'days'} requested. Sundays are excluded. {state.leaveType === 'loss_of_pay' ? 'This is unpaid leave.' : ''}</p>}
        {short && <section className="att-short-preview" aria-label="Short leave attendance">
          <h4>Short leave · {state.fromDate}</h4>
          {attendance.loading || attendance.date !== state.fromDate ? <p role="status">Loading attendance…</p> : attendance.error ? <p role="alert">{attendance.error}</p> : <>
            <dl><div><dt>Check in</dt><dd>{details.time(details.checkIn)}</dd></div><div><dt>Check out</dt><dd>{details.time(details.checkOut)}</dd></div><div><dt>Workday ends</dt><dd>6:30 PM</dd></div><div><dt>Short leave time</dt><dd>{details.duration}</dd></div></dl>
            {details.eligible ? <p>From {details.time(details.checkOut)} to 6:30 PM.</p> : <p role="alert">{!details.checkIn || !details.checkOut ? 'Check-in and checkout are required for this date.' : 'Short leave requires fewer than 9 worked hours and checkout before 6:30 PM.'}</p>}
          </>}
        </section>}
        {invalidRange && <p className="att-request-error" role="alert">Choose dates within one calendar year. Half-day leave must be for one date.</p>}
        {insufficient && <p className="att-request-error" role="alert">You have {remaining} earned paid days available. Reduce the dates or <button className="att-lop-switch" type="button" onClick={() => update('leaveType', 'loss_of_pay')}>apply for Loss of Pay</button>.</p>}
        <label className="attendance-leave-reason">Reason<textarea required rows={4} maxLength={2000} value={state.reason} onChange={event => update('reason', event.target.value)} placeholder="Tell MD Sir why you need leave"/></label>
        </fieldset>
        <div className="regularize-actions"><button className="regularize-cancel-btn" type="button" onClick={close} disabled={state.submitting}>Cancel</button><button className="attendance-leave-submit-btn" type="submit" disabled={state.submitting || attendance.loading || (short ? !shortReady : invalidRange || !units) || !state.reason.trim() || insufficient || (paid && (loadingBalance || !liveBalance || !!balanceError))}>{state.submitting ? 'Submitting…' : 'Send for approval'}</button></div>
      </form>
    </section>
  </div>;
}
