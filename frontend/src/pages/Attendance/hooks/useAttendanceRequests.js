import { useCallback, useEffect, useRef, useState } from 'react';
import { listAttendanceRequests, decideAttendanceRequest } from '../../../services/attendanceService';
const kinds = ['leave', 'work-from-home', 'short-leave'];
const messageOf = error => error?.response?.data?.message || error?.message || 'Unable to load pending requests.';
export default function useAttendanceRequests(user, refreshAttendance, revision) {
  const [items, setItems] = useState([]);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState('');
  const enabled = user?.role === 'super_admin';
  const sequence = useRef(0), mutation = useRef(false), refresh = useRef(refreshAttendance);
  refresh.current = refreshAttendance;
  const load = useCallback(async () => {
    if (!enabled) return;
    const request = ++sequence.current;
    const results = await Promise.allSettled(kinds.map(async kind => {
      const rows = [];
      let page = 1, response;
      do {
        response = await listAttendanceRequests(kind, { status: 'pending', page, limit: 100 });
        rows.push(...(response.data || []).map(item => ({ ...item, requestKind: kind })));
        page++;
      } while (page <= (response.pagination?.totalPages || 1));
      return rows;
    }));
    if (sequence.current !== request) return;
    setItems(results.flatMap(result => result.status === 'fulfilled' ? result.value : []));
    const failed = results.find(result => result.status === 'rejected');
    setError(failed ? messageOf(failed.reason) : '');
  }, [enabled]);
  const cancelLoad = useCallback(() => { sequence.current++; }, []);
  useEffect(() => { load(); return cancelLoad; }, [load, revision, cancelLoad]);
  const decide = async (item, action) => {
    if (!enabled || mutation.current) return;
    let reason = '';
    if (action === 'reject') {
      reason = window.prompt('Rejection reason:');
      if (reason === null) return;
      if (!reason.trim()) { setError('Enter a rejection reason.'); return; }
    }
    mutation.current = true; setBusy(`${item.requestKind}:${item._id}`); setError(''); setNotice('');
    try {
      const response = await decideAttendanceRequest(item.requestKind, item._id, action, reason.trim());
      setNotice(response.data?.whatsapp?.sent === false ? response.data.whatsapp.message : `Request ${action === 'approve' ? 'approved' : 'rejected'}.`);
      setItems(previous => previous.filter(row => row._id !== item._id || row.requestKind !== item.requestKind));
      await load(); await refresh.current();
    } catch (failure) { setError(messageOf(failure)); }
    finally { mutation.current = false; setBusy(''); }
  };
  return { items, error, notice, busy, decide, counts: Object.fromEntries(kinds.map(kind => [kind, items.filter(item => item.requestKind === kind).length])) };
}
