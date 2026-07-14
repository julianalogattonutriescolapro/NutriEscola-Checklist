import { DIAS_SEMANA } from './constants.js';

export function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}
export function todayISO() {
  return new Date().toISOString().slice(0, 10);
}
export function fmtDate(iso) {
  if (!iso) return '—';
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}
export function esc(s) {
  return (s || '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
export function debounce(fn, ms) {
  let t;
  return (...a) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...a), ms);
  };
}
export function emptyDays() {
  const d = {};
  DIAS_SEMANA.forEach((dn) => (d[dn] = { breakfast: '', morningSnack: '', lunch: '', afternoonSnack: '', dinner: '' }));
  return d;
}

/** Comprime uma imagem (arquivo local) e retorna um data URL JPEG. */
export function fileToCompressedDataURL(file, maxW = 900, quality = 0.65) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const scale = Math.min(1, maxW / img.width);
        const canvas = document.createElement('canvas');
        canvas.width = img.width * scale;
        canvas.height = img.height * scale;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.onerror = reject;
      img.src = e.target.result;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
