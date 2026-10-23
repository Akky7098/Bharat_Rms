import { useEffect, useRef } from 'react';
export default function useAttendanceDialog(open, submitting, close) {
  const dialog = useRef(null), current = useRef({ submitting, close });
  current.current = { submitting, close };
  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement;
    const root = dialog.current;
    const controls = () => Array.from(root?.querySelectorAll('button:not(:disabled),input:not(:disabled),select:not(:disabled),textarea:not(:disabled),[tabindex="0"]') || []);
    controls()[0]?.focus();
    const onKey = event => {
      if (event.key === 'Escape' && !current.current.submitting) { event.preventDefault(); current.current.close(); }
      if (event.key !== 'Tab') return;
      const items = controls();
      if (!items.length) return;
      if (event.shiftKey && document.activeElement === items[0]) { event.preventDefault(); items[items.length - 1].focus(); }
      else if (!event.shiftKey && document.activeElement === items[items.length - 1]) { event.preventDefault(); items[0].focus(); }
    };
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('keydown', onKey); previous?.focus?.(); };
  }, [open]);
  return dialog;
}
