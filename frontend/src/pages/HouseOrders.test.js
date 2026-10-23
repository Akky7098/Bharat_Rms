import { fireEvent, render, screen } from '@testing-library/react';
import { HouseDrillDown } from './ManagementOrderAnalysis';
import { getHouseOrderAnalysis } from '../services/managementOrderAnalysisService';
import axios from 'axios';
jest.mock('axios', () => ({ get: jest.fn() }));
const orders = [
  { _id: 'one', companyName: 'Example Works', poNumber: 'PO-123', quantityKG: 100, orderValue: 12000, companyAddress: 'Example address', pdf: { fileUrl: '/uploads/example.pdf' }, grades: [] },
  { _id: 'two', companyName: 'Other Works', poNumber: 'PO-456', quantityKG: 200, grades: [] },
];
test('H.O. data request uses the full register endpoint', async () => {
  axios.get.mockResolvedValue({ data: { success: true, data: { orders } } });
  await getHouseOrderAnalysis({ month: '2026-10', months: 1 });
  expect(axios.get).toHaveBeenCalledWith(expect.stringMatching(/\/api\/management-order-analysis\/house$/), expect.anything());
});
test('H.O. cards search by PO and open the existing sales order detail with PDF', () => {
  render(<HouseDrillDown response={{ orders, summary: { orderCount: 2, orderKG: 300 }, grades: [] }} month="2026-10" months={1} loading={false} />);
  expect(screen.getByText('Other Works')).toBeInTheDocument();
  const search = screen.getByPlaceholderText('Search company, PO, grade, salesperson...');
  fireEvent.change(search, { target: { value: 'PO-123' } });
  expect(screen.queryByText('Other Works')).not.toBeInTheDocument();
  const card = screen.getByRole('button', { name: /Example Works/ });
  fireEvent.click(card);
  expect(screen.getByRole('dialog', { name: /Example Works/ })).toBeInTheDocument();
  expect(screen.getByText('Example address')).toBeInTheDocument();
  expect(screen.getByRole('link', { name: 'Open PDF' })).toHaveAttribute('href', 'https://bharatspecialsteels.bharatspecialsteels.com/uploads/example.pdf');
  fireEvent.keyDown(document, { key: 'Escape' });
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
});
