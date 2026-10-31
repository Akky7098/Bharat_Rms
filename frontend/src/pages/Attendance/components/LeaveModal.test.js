import React, { useState } from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import LeaveModal from './LeaveModal';
import AttendanceHeader from './AttendanceHeader';
import { getAttendanceList, getAttendanceLeaveSummary } from '../../../services/attendanceService';
import { shortLeaveDetails } from '../utils/shortLeave';
jest.mock('../../../services/attendanceService', () => ({ getAttendanceList: jest.fn(), getAttendanceLeaveSummary: jest.fn() }));
const record = { checkIn: { time: '2026-10-20T04:00:00Z' }, checkOut: { time: '2026-10-20T11:30:00Z' } };
const submit = jest.fn();
function Form() {
  const [state, setState] = useState({ open: true, leaveType: 'paid_leave', duration: 'full_day', fromDate: '2026-10-20', toDate: '2026-10-20', reason: 'Appointment' });
  return <LeaveModal state={state} setState={setState} employeeId="self" onSubmit={event => { event.preventDefault(); submit(state); }} />;
}
beforeEach(() => {
  jest.clearAllMocks();
  getAttendanceList.mockResolvedValue({ data: [record] });
  getAttendanceLeaveSummary.mockResolvedValue({ data: { balance: { availablePaidLeave: 1 } } });
});
test('existing green header retains WFH and Apply Leave without a separate short-leave button', () => {
  const onLeave = jest.fn(), onWfh = jest.fn();
  render(<AttendanceHeader user={{ name: 'Example' }} canMarkAttendance onLeave={onLeave} onWfh={onWfh} />);
  fireEvent.click(screen.getByRole('button', { name: 'Apply Leave' }));
  fireEvent.click(screen.getByRole('button', { name: 'Work From Home' }));
  expect(onLeave).toHaveBeenCalledTimes(1); expect(onWfh).toHaveBeenCalledTimes(1);
  expect(screen.queryByRole('button', { name: /short leave/i })).not.toBeInTheDocument();
});
test('recorded checkout is used only when explicitly selected', async () => {
  render(<Form />);
  await waitFor(() => expect(getAttendanceList).toHaveBeenCalled());
  expect(screen.getByLabelText('Leave type')).toHaveValue('paid_leave');
  fireEvent.change(screen.getByLabelText('Leave type'), { target: { value: 'short_leave' } });
  fireEvent.change(screen.getByLabelText('Short leave basis'), { target: { value: 'attendance' } });
  expect(getAttendanceList).toHaveBeenCalledWith({ fromDate: '2026-10-20', toDate: '2026-10-20', employeeId: 'self' });
  expect(screen.getByText('09:30 AM')).toBeInTheDocument();
  expect(screen.getByText('05:00 PM')).toBeInTheDocument();
  expect(screen.getByText('1h 30m')).toBeInTheDocument();
  expect(screen.getByText('From 05:00 PM to 6:30 PM.')).toBeInTheDocument();
  expect(screen.queryByLabelText('To date')).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Send for approval' }));
  expect(submit).toHaveBeenCalledWith(expect.objectContaining({ leaveType: 'short_leave', fromDate: '2026-10-20', toDate: '2026-10-20' }));
});
test('switching dates clears old checkout details and blocks incomplete attendance', async () => {
  render(<Form />);
  await waitFor(() => expect(getAttendanceList).toHaveBeenCalled());
  fireEvent.change(screen.getByLabelText('Leave type'), { target: { value: 'short_leave' } });
  fireEvent.change(screen.getByLabelText('Short leave basis'), { target: { value: 'attendance' } });
  await screen.findByText('1h 30m');
  getAttendanceList.mockResolvedValue({ data: [{ checkIn: record.checkIn }] });
  fireEvent.change(screen.getByLabelText('Attendance date'), { target: { value: '2026-10-21' } });
  await screen.findByText('Check-in and checkout are required for this date.');
  expect(screen.queryByText('05:00 PM')).not.toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Send for approval' })).toBeDisabled();
});
test('Short leave remains available in the dropdown and cannot bypass nine-hour eligibility', async () => {
  getAttendanceList.mockResolvedValue({ data: [{ ...record, checkOut: { time: '2026-10-20T13:00:00Z' } }] });
  render(<Form />);
  await waitFor(() => expect(screen.getByRole('button', { name: 'Send for approval' })).toBeEnabled());
  expect(screen.getByRole('combobox', { name: 'Leave type' })).toHaveValue('paid_leave');
  fireEvent.change(screen.getByRole('combobox', { name: 'Leave type' }), { target: { value: 'short_leave' } });
  expect(screen.getByRole('button', { name: 'Send for approval' })).toBeDisabled();
  expect(shortLeaveDetails(record, '2026-10-20').minutes).toBe(90);
});

function PlannedForm() {
  const [state, setState] = useState({ open: true, leaveType: 'short_leave', shortLeaveMode: 'planned', duration: 'full_day', fromDate: '2027-01-05', toDate: '2027-01-05', startTime: '09:30', endTime: '11:30', reason: 'Appointment' });
  return <LeaveModal state={state} setState={setState} employeeId="self" onSubmit={event => { event.preventDefault(); submit(state); }} />;
}
test('future short leave accepts late arrival and midday requests without check-in or checkout', async () => {
  getAttendanceList.mockResolvedValue({ data: [] });
  render(<PlannedForm />);
  expect(screen.getByLabelText('Short leave date')).not.toHaveAttribute('max');
  expect(screen.getByText('2h 0m', { exact: false })).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Midday break' }));
  expect(screen.getByLabelText('Short leave starts')).toHaveValue('12:00');
  expect(screen.getByLabelText('Short leave ends')).toHaveValue('15:00');
  expect(screen.getByText('3h 0m', { exact: false })).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Send for approval' }));
  expect(submit).toHaveBeenCalledWith(expect.objectContaining({ shortLeaveMode: 'planned', fromDate: '2027-01-05', startTime: '12:00', endTime: '15:00' }));
  await waitFor(() => expect(getAttendanceList).toHaveBeenCalled());
});
test('planned short leave blocks invalid or full-day time windows', async () => {
  getAttendanceList.mockResolvedValue({ data: [] });
  render(<PlannedForm />);
  fireEvent.change(screen.getByLabelText('Short leave ends'), { target: { value: '18:30' } });
  expect(screen.getByRole('button', { name: 'Send for approval' })).toBeDisabled();
  expect(screen.getByRole('alert')).toHaveTextContent('whole office day');
  fireEvent.change(screen.getByLabelText('Short leave starts'), { target: { value: '19:00' } });
  expect(screen.getByRole('button', { name: 'Send for approval' })).toBeDisabled();
  await waitFor(() => expect(getAttendanceList).toHaveBeenCalled());
});

test('early departure remains planned after completed attendance loads', async () => {
  render(<PlannedForm />);
  await waitFor(() => expect(getAttendanceList).toHaveBeenCalled());
  fireEvent.click(screen.getByRole('button', { name: 'Early departure' }));
  expect(screen.getByLabelText('Short leave basis')).toHaveValue('planned');
  expect(screen.getByLabelText('Short leave starts')).toHaveValue('16:00');
  expect(screen.getByLabelText('Short leave ends')).toHaveValue('18:30');
  expect(screen.getByRole('button', { name: 'Send for approval' })).toBeEnabled();
});
