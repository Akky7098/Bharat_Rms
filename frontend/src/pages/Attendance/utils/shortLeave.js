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
