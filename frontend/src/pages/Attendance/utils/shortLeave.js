export const shortLeaveDetails = (record, dateKey) => {
  const checkIn = record?.checkIn?.time;
  const checkOut = record?.checkOut?.time;
  const end = new Date(`${dateKey}T18:30:00+05:30`);
  const workedMinutes = (new Date(checkOut) - new Date(checkIn)) / 60000;
  const minutes = Math.max(0, Math.round((end - new Date(checkOut)) / 60000));
  const eligible = Boolean(checkIn && checkOut && workedMinutes > 0 && workedMinutes < 540 && minutes > 0);
  return { checkIn, checkOut, minutes, eligible,
    duration: Number.isFinite(minutes) ? `${Math.floor(minutes / 60)}h ${minutes % 60}m` : '—',
    time: value => value ? new Date(value).toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit', hour12: true }).toUpperCase() : '—',
  };
};

export const shortLeaveClock = value => {
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(value || '')) return '—';
  const hour = Number(value.slice(0, 2));
  return `${String(hour % 12 || 12).padStart(2, '0')}:${value.slice(3)} ${hour >= 12 ? 'PM' : 'AM'}`;
};
export const plannedShortLeaveDetails = (date, start, end, now = new Date()) => {
  const minutesOf = value => /^([01]\d|2[0-3]):[0-5]\d$/.test(value || '') ? Number(value.slice(0, 2)) * 60 + Number(value.slice(3)) : NaN;
  const first = minutesOf(start), last = minutesOf(end), minutes = last - first;
  const today = now.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
  let error = '';
  if (!date || date < today) error = 'Choose today or a future date. For a past date, use recorded attendance.';
  else if (new Date(`${date}T00:00:00Z`).getUTCDay() === 0) error = 'Short leave is not available on Sunday.';
  else if (!Number.isFinite(minutes) || first < 570 || last > 1110 || minutes <= 0) error = 'Choose a time range within 9:30 AM–6:30 PM IST, ending after it starts.';
  else if (minutes >= 540) error = 'For the whole office day, apply for paid leave or Loss of Pay.';
  return { valid: !error, error, minutes, duration: Number.isFinite(minutes) && minutes > 0 ? `${Math.floor(minutes / 60)}h ${minutes % 60}m` : '—', label: `${shortLeaveClock(start)} – ${shortLeaveClock(end)}` };
};
