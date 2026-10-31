import { syncModuleHistory, returnToModuleLauncher } from './moduleNavigation';
beforeEach(() => window.history.replaceState(null, '', '/dashboard#dashboard'));
test('launcher opens module in a new entry, switching modules replaces that entry', () => {
  const push = jest.spyOn(window.history, 'pushState');
  const replace = jest.spyOn(window.history, 'replaceState');
  syncModuleHistory('sales-order');
  expect(push).toHaveBeenCalledTimes(1);
  syncModuleHistory('dispatch');
  expect(push).toHaveBeenCalledTimes(1);
  expect(replace).toHaveBeenLastCalledWith({ rmsModule: true }, '', '/dashboard#dispatch');
  push.mockRestore(); replace.mockRestore();
});
test('back from an app-owned module returns to launcher rather than another module', () => {
  syncModuleHistory('dispatch');
  const back = jest.spyOn(window.history, 'back').mockImplementation(() => {});
  const setActive = jest.fn();
  returnToModuleLauncher(setActive);
  expect(back).toHaveBeenCalledTimes(1);
  expect(setActive).not.toHaveBeenCalled();
  back.mockRestore();
});
test('direct links return safely without leaving the app, and matching hash preserves detail queries', () => {
  window.history.replaceState({}, '', '/dashboard?tracking=example#order-tracking');
  syncModuleHistory('order-tracking');
  expect(window.location.search).toBe('?tracking=example');
  const setActive = jest.fn();
  returnToModuleLauncher(setActive);
  expect(window.location.href).toContain('/dashboard#dashboard');
  expect(setActive).toHaveBeenCalledWith('dashboard');
});
test('analysis overview state survives module navigation without adding a duplicate overview', () => {
  window.history.replaceState({ managementOrderAnalysis: { view: 'overview', mill: '' } }, '', '/dashboard#dashboard');
  syncModuleHistory('management-analysis');
  expect(window.history.state.managementOrderAnalysis.view).toBe('overview');
  expect(window.history.state.rmsModule).toBe(true);
  syncModuleHistory('dispatch');
  expect(window.history.state.managementOrderAnalysis).toBeUndefined();
});
