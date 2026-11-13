import { useState } from 'react';
import Icon from './Icon';
import { useToast } from '../context/AppContext';

// "Word" download next to "Print / Save as PDF" on every report page.
// docx is loaded only when the button is clicked.
export default function WordButton({ filename, target = '.report', disabled = false }) {
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  async function go() {
    setBusy(true);
    try {
      const { exportToWord } = await import('../utils/wordExport');
      await exportToWord(document.querySelector(target), filename);
    } catch (e) {
      toast(`Could not create the Word file: ${e.message}`, 'error');
    } finally {
      setBusy(false);
    }
  }
  return (
    <button type="button" className="btn btn-ghost btn-word" onClick={go} disabled={busy || disabled} title="Download as a Word (.docx) file">
      <Icon name="file" /> {busy ? 'Preparing…' : 'Word'}
    </button>
  );
}
