import axios from 'axios';
import { getAttendanceLeaveSummary, listAttendanceRequests, decideAttendanceRequest, applyShortLeave } from './attendanceService';
jest.mock('axios', () => ({ get: jest.fn(), post: jest.fn(), patch: jest.fn() }));
beforeEach(() => { jest.clearAllMocks(); localStorage.setItem('token', 'session'); axios.get.mockResolvedValue({ data: {} }); axios.post.mockResolvedValue({ data: {} }); axios.patch.mockResolvedValue({ data: {} }); });
test('leave summary converts selected period to a date instead of sending an object as employeeId', async () => {
  await getAttendanceLeaveSummary({ month: 10, year: 2026 });
  expect(axios.get).toHaveBeenCalledWith(expect.stringMatching(/\/attendance\/leave\/summary$/), expect.objectContaining({ params: { month: '2026-10-01', year: 2026 } }));
});
test('request APIs retain bearer session and correct paths', async () => {
  await listAttendanceRequests('leave', { status: 'pending' });
  expect(axios.get).toHaveBeenCalledWith(expect.stringMatching(/\/attendance\/leave\/requests$/), expect.objectContaining({ headers: { Authorization: 'Bearer session' } }));
  await decideAttendanceRequest('work-from-home', 'one', 'approve');
  expect(axios.patch).toHaveBeenCalledWith(expect.stringMatching(/\/attendance\/work-from-home\/one\/approve$/), { reason: '' }, expect.anything());
  await applyShortLeave({ fromDate: '2026-10-23', reason: 'Appointment' });
  expect(axios.post).toHaveBeenCalledWith(expect.stringMatching(/\/attendance\/short-leave$/), expect.anything(), expect.anything());
});
test('WFH and attendance use the production API in development and production', async () => {
  const previousMode = process.env.NODE_ENV;
  const previousBase = process.env.REACT_APP_BACKEND_URL;
  const previousOverride = process.env.REACT_APP_ATTENDANCE_REQUEST_BACKEND_URL;
  try {
    delete process.env.REACT_APP_ATTENDANCE_REQUEST_BACKEND_URL;
    process.env.REACT_APP_BACKEND_URL = 'https://api.example.test';
    for (const [mode, base] of [['development', 'https://api.example.test'], ['production', 'https://api.example.test']]) {
      process.env.NODE_ENV = mode;
      let api, mockedAxios;
      jest.isolateModules(() => { api = require('./attendanceService'); mockedAxios = require('axios'); });
      mockedAxios.post.mockResolvedValue({ data: { success: true } });
      await api.applyWorkFromHome({ fromDate: '2026-10-25', toDate: '2026-10-27', reason: 'Work from home' });
      expect(mockedAxios.post).toHaveBeenLastCalledWith(`${base}/api/attendance/work-from-home`, expect.anything(), expect.objectContaining({ headers: { Authorization: 'Bearer session' } }));
      await api.checkInAttendance({ latitude: 28.5, longitude: 77.2 });
      expect(mockedAxios.post).toHaveBeenLastCalledWith(`${base}/api/attendance/check-in`, expect.anything(), expect.anything());
      await api.checkOutAttendance({ latitude: 28.5, longitude: 77.2 });
      expect(mockedAxios.post).toHaveBeenLastCalledWith(`${base}/api/attendance/check-out`, expect.anything(), expect.anything());
    }
  } finally {
    process.env.NODE_ENV = previousMode;
    if (previousBase === undefined) delete process.env.REACT_APP_BACKEND_URL; else process.env.REACT_APP_BACKEND_URL = previousBase;
    if (previousOverride === undefined) delete process.env.REACT_APP_ATTENDANCE_REQUEST_BACKEND_URL; else process.env.REACT_APP_ATTENDANCE_REQUEST_BACKEND_URL = previousOverride;
  }
});
