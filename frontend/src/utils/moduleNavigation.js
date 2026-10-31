// Module history always has the module launcher as its parent. Switching
// modules replaces the current module, rather than stacking unrelated modules.
export function syncModuleHistory(targetHash) {
  const current = window.location.hash.slice(1).split('?')[0];
  if (current === targetHash) return;
  const url = `/dashboard#${targetHash}`;
  const detailState = targetHash === 'management-analysis' && window.history.state?.managementOrderAnalysis
    ? { managementOrderAnalysis: window.history.state.managementOrderAnalysis } : {};
  if (targetHash === 'dashboard') {
    window.history.replaceState({ rmsLauncher: true }, '', url);
  } else if (current === 'dashboard' || !current) {
    window.history.pushState({ ...detailState, rmsModule: true }, '', url);
  } else {
    window.history.replaceState({ ...detailState, rmsModule: Boolean(window.history.state?.rmsModule) }, '', url);
  }
}
export function returnToModuleLauncher(setActive) {
  if (window.history.state?.rmsModule) {
    window.history.back();
  } else {
    window.history.replaceState({ rmsLauncher: true }, '', '/dashboard#dashboard');
    setActive('dashboard');
  }
}
