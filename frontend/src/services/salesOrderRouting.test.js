import axios from 'axios';
jest.mock('axios', () => ({ get: jest.fn(), post: jest.fn() }));
const originalMode = process.env.NODE_ENV;
const originalOverride = process.env.REACT_APP_SALES_ORDER_READ_BACKEND_URL;
const originalBackend = process.env.REACT_APP_BACKEND_URL;
const production = 'https://bharatspecialsteels.bharatspecialsteels.com';
function service(mode) {
  process.env.NODE_ENV = mode;
  delete process.env.REACT_APP_SALES_ORDER_READ_BACKEND_URL;
  delete process.env.REACT_APP_BACKEND_URL;
  let loaded;
  jest.isolateModules(() => { loaded = require('./salesOrderService'); });
  return loaded;
}
beforeEach(() => {
  axios.get.mockResolvedValue({ data: { data: [] } });
  axios.post.mockResolvedValue({ data: {} });
});
afterEach(() => {
  process.env.NODE_ENV = originalMode;
  if (originalOverride === undefined) delete process.env.REACT_APP_SALES_ORDER_READ_BACKEND_URL;
  else process.env.REACT_APP_SALES_ORDER_READ_BACKEND_URL = originalOverride;
  if (originalBackend === undefined) delete process.env.REACT_APP_BACKEND_URL;
  else process.env.REACT_APP_BACKEND_URL = originalBackend;
  jest.clearAllMocks();
});
test('development also defaults to production URLs for deployment', async () => {
  const api = service('development');
  await api.getAllSalesOrders({ approvalTab: 'approved', fromDate: '2026-10-23', toDate: '2026-10-23' });
  expect(axios.get).toHaveBeenLastCalledWith(`${production}/api/sales-order`, expect.objectContaining({ params: expect.objectContaining({ approvalTab: 'approved' }) }));
  await api.getSalesPersons();
  expect(axios.get).toHaveBeenLastCalledWith(`${production}/api/user/sales-persons`, expect.anything());
  await api.createSalesOrder({});
  expect(axios.post).toHaveBeenCalledWith(`${production}/api/sales-order/create`, {}, expect.anything());
});
test('production builds continue reading the production API', async () => {
  const api = service('production');
  await api.getAllSalesOrders();
  expect(axios.get).toHaveBeenCalledWith(`${production}/api/sales-order`, expect.anything());
});
