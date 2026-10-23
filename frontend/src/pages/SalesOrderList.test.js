import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import SalesOrderList from './SalesOrderList';
import { getAllSalesOrders, getSalesPersons } from '../services/salesOrderService';
import { getSalesOrderPeriods } from '../utils/salesOrderPeriods';
jest.mock('../services/salesOrderService', () => ({ getAllSalesOrders: jest.fn(), getSalesPersons: jest.fn() }));
jest.mock('./SalesOrderForm', () => () => null);
beforeEach(() => {
  localStorage.setItem('user', JSON.stringify({ role: 'super_admin' }));
  window.scrollTo = jest.fn();
  getSalesPersons.mockResolvedValue([{ _id: 'sonia-id', name: 'Sonia' }]);
  getAllSalesOrders.mockResolvedValue({ data: [], pagination: { totalRecords: 0, currentPage: 1, totalPages: 1, limit: 30 }, summary: {
    todayApproved: { totalApprovedOrders: 4, totalApprovedValue: 400 },
    monthApproved: { totalApprovedOrders: 103, totalApprovedValue: 10300 },
    filteredApproved: { totalApprovedOrders: 4, totalApprovedValue: 400 },
  } });
});
test('Today and Month cards send IST approval filters and show selected backgrounds', async () => {
  render(<SalesOrderList />);
  await waitFor(() => expect(getAllSalesOrders).toHaveBeenCalled());
  const todayCard = screen.getAllByRole('button', { name: /Today Orders/ })[0];
  fireEvent.click(todayCard);
  await waitFor(() => expect(getAllSalesOrders).toHaveBeenLastCalledWith(expect.objectContaining({ ...getSalesOrderPeriods().today, approvalTab: 'approved', page: 1 })));
  expect(todayCard).toHaveAttribute('aria-pressed', 'true');
  expect(todayCard).toHaveClass('insight-selected');
  const monthCard = screen.getAllByRole('button', { name: /Monthly Orders/ })[0];
  expect(monthCard).toHaveTextContent('103');
  fireEvent.click(monthCard);
  await waitFor(() => expect(getAllSalesOrders).toHaveBeenLastCalledWith(expect.objectContaining({ ...getSalesOrderPeriods().month, approvalTab: 'approved' })));
  expect(monthCard).toHaveClass('insight-selected');
  expect(todayCard).not.toHaveClass('insight-selected');
  expect(screen.getAllByRole('option', { name: 'Sonia' }).length).toBeGreaterThan(0);
});
test('IST month dates never shift to the previous month during UTC conversion', () => {
  expect(getSalesOrderPeriods(new Date('2026-09-30T19:00:00Z'))).toEqual({ today: { fromDate: '2026-10-01', toDate: '2026-10-01' }, month: { fromDate: '2026-10-01', toDate: '2026-10-31' } });
});
