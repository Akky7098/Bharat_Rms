import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { getManagementBackendUrl } from '../services/managementOrderAnalysisService';
import { SalesOrderDetailModal } from '../pages/SalesOrderList';

const dateParts = value => {
  if (!value) return { date: '-', time: '-' };
  const date = new Date(value);
  return {
    date: date.toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata' }),
    time: date.toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit' }),
  };
};
const currency = value => Number(value || 0).toLocaleString('en-IN');
const label = value => String(value || '-').replace(/_/g, ' ').toUpperCase();

export default function HouseSalesOrderDetail({ order, onClose }) {
  const close = useRef(onClose);
  close.current = onClose;
  useEffect(() => {
    const focused = document.activeElement;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const escape = event => { if (event.key === 'Escape') close.current(); };
    document.addEventListener('keydown', escape);
    return () => {
      document.body.style.overflow = previous;
      document.removeEventListener('keydown', escape);
      focused?.focus?.();
    };
  }, []);
  const getPdfUrl = record => {
    const file = record.pdf?.fileUrl || record.finalSalesOrderPackage?.fileUrl || record.preShipmentInspectionPdf?.fileUrl;
    if (!file) return '';
    const base = getManagementBackendUrl();
    try {
      const url = new URL(file, `${base.replace(/\/$/, '')}/`);
      return ['https:', 'http:'].includes(url.protocol) ? url.href : '';
    } catch { return ''; }
  };
  return createPortal(
    <div role="dialog" aria-modal="true" aria-label={`Sales order detail: ${order.companyName || ''}`}>
      <SalesOrderDetailModal order={order} onClose={onClose} formatCurrency={currency}
        formatPaymentTerms={label} formatStatus={label} formatDateTimeParts={dateParts} getPdfUrl={getPdfUrl} />
    </div>, document.body,
  );
}
