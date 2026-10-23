import React, { useState } from 'react';
import { fireEvent, render, screen, within } from '@testing-library/react';
import WfhApprovalDetails from './WfhApprovalDetails';
import AttendanceSummaryCards from './AttendanceSummaryCards';
import AttendanceFilters from './AttendanceFilters';
const request = { _id: 'reference-1', employeeName: 'Example Employee', fromDate: '2026-10-25', toDate: '2026-10-27', reason: 'Home work', status: 'approved', createdAt: '2026-10-23T08:00:00Z', decidedAt: '2026-10-23T09:00:00Z', decidedByName: 'MD Sir' };
function View() {
  const [open, setOpen] = useState(false);
  return <><AttendanceSummaryCards approvedWfhCount={1} onWfhDetails={() => setOpen(true)} /><WfhApprovalDetails open={open} onClose={() => setOpen(false)} requests={[request]} /></>;
}
test('existing WFH card opens saved approved dates and audit history, including legacy approvals', () => {
  render(<View />);
  fireEvent.click(screen.getByRole('button', { name: 'View 1 approved WFH requests' }));
  const dialog = screen.getByRole('dialog', { name: 'Approved work from home' });
  expect(within(dialog).getByText('25/10/2026 – 27/10/2026')).toBeInTheDocument();
  expect(within(dialog).getByText('Home work')).toBeInTheDocument();
  expect(within(dialog).getByText('applied')).toBeInTheDocument();
  expect(within(dialog).getByText('approved')).toBeInTheDocument();
  expect(within(dialog).getByText('Request reference: reference-1')).toBeInTheDocument();
  fireEvent.click(within(dialog).getByRole('button', { name: 'Close WFH approval history' }));
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
});
test('attendance dropdown keeps both user and admin options when one is selected', () => {
  const employees = [{ _id: 'u', name: 'User Employee', role: 'user' }, { _id: 'a', name: 'Admin Employee', role: 'admin' }];
  render(<AttendanceFilters employees={employees} filters={{ month: 9, year: 2026, employeeId: 'u' }} canManageUsers setFilters={jest.fn()} />);
  const select = screen.getByRole('combobox', { name: 'Employee' });
  expect(within(select).getByRole('option', { name: 'User Employee' })).toBeInTheDocument();
  expect(within(select).getByRole('option', { name: 'Admin Employee' })).toBeInTheDocument();
  expect(select).toHaveValue('u');
});
