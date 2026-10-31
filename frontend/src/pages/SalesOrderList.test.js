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

test('pending order approval and hold still open the existing confirmation flows', async () => {
  getAllSalesOrders.mockResolvedValueOnce({ data: [{ _id: 'pending-order', approvalStatus: 'pending_manager_approval', companyName: 'Example Engineering', poNumber: 'PO-52', orderValue: 118000, companyAddress: 'Mumbai', contactPersonName: 'Example Contact', contactPersonNumber: '9876543210', salesPersonName: 'Sonia' }], pagination: { totalRecords: 1, currentPage: 1, totalPages: 1 } });
  render(<SalesOrderList dashboardFilters={{ approvalTab: 'pending_rejected' }} />);
  const approve = (await screen.findAllByRole('button', { name: 'Approve', exact: true }))[0];
  fireEvent.click(approve);
  expect(screen.getByText('Are you sure you want to approve this sales order?')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Cancel', exact: true }));
  fireEvent.click(screen.getAllByRole('button', { name: 'Hold', exact: true })[0]);
  expect(screen.getByPlaceholderText('Enter hold reason')).toBeInTheDocument();
});

test('compact approved cards retain PDF access, all contact details and the full detail view', async () => {
  getAllSalesOrders.mockResolvedValueOnce({ data: [{ _id: 'approved-order', approvalStatus: 'approved', companyName: 'Example Engineering', orderValue: 118000, poNumber: 'PO-52', companyAddress: 'Full customer address, Mumbai', contactPersonName: 'Example Contact', contactPersonNumber: '9876543210', paymentTerms: '30_days', salesPersonName: 'Sonia', pdf: { fileUrl: '/sample.pdf' } }], pagination: { totalRecords: 1, currentPage: 1, totalPages: 1 } });
  const { container } = render(<SalesOrderList />);
  const pdf = await screen.findByRole('link', { name: 'Open PDF' });
  expect(pdf).toHaveAttribute('href', expect.stringContaining('/sample.pdf'));
  const card = container.querySelector('.ios-sales-card');
  expect(card).toHaveTextContent('Full customer address, Mumbai');
  expect(card).toHaveTextContent('9876543210');
  expect(card).toHaveTextContent('30 DAYS');
  fireEvent.click(card);
  expect(screen.getByText('Sales Order Detail')).toBeInTheDocument();
});
