import React from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import MobilePageSearch from './MobilePageSearch';
beforeEach(() => { localStorage.clear(); window.history.replaceState({}, '', '/dashboard#dispatch'); });
function Page({ moduleKey = 'dispatch', onChange = jest.fn() }) {
  const [value, setValue] = React.useState('');
  return <><header><div className="ios-dispatch-header-row"><h2>Dispatch</h2><MobilePageSearch moduleKey={moduleKey} label="Search dispatch" value={value} onChange={text => { setValue(text); onChange(text); }} suggestions={['Example Engineering', 'BSS/1042']} /></div><div>Insights</div></header><button>Filters</button></>;
}
test('opens inline directly below the header row without opening filters or an overlay', () => {
  render(<Page />);
  fireEvent.click(screen.getByRole('button', { name: 'Search dispatch' }));
  const search = screen.getByRole('searchbox', { name: 'Search dispatch' });
  expect(search).toHaveFocus();
  expect(document.querySelector('.ios-dispatch-header-row').nextElementSibling).toHaveClass('mobile-search-host');
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Filters' })).toBeInTheDocument();
});
test('debounces module query, supports suggestions and immediately clears only search', async () => {
  jest.useFakeTimers();
  const change = jest.fn();
  render(<Page onChange={change} />);
  fireEvent.click(screen.getByRole('button', { name: 'Search dispatch' }));
  fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'Exam' } });
  expect(change).not.toHaveBeenCalled();
  act(() => jest.advanceTimersByTime(250));
  expect(change).toHaveBeenLastCalledWith('Exam');
  fireEvent.click(screen.getByRole('button', { name: 'Example Engineering' }));
  expect(change).toHaveBeenLastCalledWith('Example Engineering');
  fireEvent.click(screen.getByLabelText('Clear search'));
  expect(change).toHaveBeenLastCalledWith('');
  jest.useRealTimers();
});
test('recent searches are isolated by module and user', () => {
  localStorage.setItem('user', JSON.stringify({ _id: 'one' }));
  const first = render(<Page />);
  fireEvent.click(screen.getByRole('button', { name: 'Search dispatch' }));
  fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'Private invoice' } });
  fireEvent.submit(screen.getByRole('searchbox').closest('form'));
  first.unmount();
  const second = render(<Page moduleKey="enquiry" />);
  fireEvent.click(screen.getByRole('button', { name: 'Search dispatch' }));
  expect(screen.queryByRole('button', { name: 'Private invoice' })).not.toBeInTheDocument();
  second.unmount();
  localStorage.setItem('user', JSON.stringify({ _id: 'two' }));
  render(<Page />);
  fireEvent.click(screen.getByRole('button', { name: 'Search dispatch' }));
  expect(screen.queryByRole('button', { name: 'Private invoice' })).not.toBeInTheDocument();
});
test('employee suggestions apply the actual employee selector without moving filters', async () => {
  const changed = jest.fn();
  render(<><header><div className="att-pwa-header-row"><MobilePageSearch target="#employee" label="Search attendance" /></div></header><select id="employee" onChange={changed}><option value="">All employees</option><option value="shalu">Shalu</option><option value="renu">Renu</option></select></>);
  fireEvent.click(screen.getByRole('button', { name: 'Search attendance' }));
  fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'shal' } });
  expect(screen.queryByRole('button', { name: 'Renu' })).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Shalu' }));
  expect(changed).toHaveBeenCalledTimes(1);
  expect(document.getElementById('employee').value).toBe('shalu');
  await waitFor(() => expect(screen.getByRole('searchbox')).toHaveValue('Shalu'));
});
test('existing text query receives inline typing and keeps its own location', async () => {
  const changed = jest.fn();
  render(<><header><div className="ot-page-head"><MobilePageSearch target="#existing" label="Search orders" /></div></header><div className="filters"><input id="existing" aria-label="Original search" onChange={changed} /></div></>);
  fireEvent.click(screen.getByRole('button', { name: 'Search orders' }));
  fireEvent.change(screen.getByRole('searchbox', { name: 'Search orders' }), { target: { value: 'Acme' } });
  fireEvent.submit(screen.getByRole('searchbox').closest('form'));
  expect(changed).toHaveBeenCalledTimes(1);
  expect(document.getElementById('existing').value).toBe('Acme');
  expect(document.getElementById('existing').closest('.filters')).not.toBeNull();
});
