import clsx, { type ClassValue } from 'clsx';

export const cn = (...inputs: ClassValue[]) => {
  return clsx(inputs);
};

export const isElementHidden = (el: Element) => {
  const styles = window.getComputedStyle(el);
  return styles.display === 'none' || styles.visibility === 'hidden';
};

export const parseTextData = (s: string) => {
  try {
    return JSON.parse(s);
  } catch {
    return [
      {
        type: 'paragraph',
        children: [{ text: s.trim() }],
      },
    ];
  }
};

export const textDataToText = (arr: { children: { text: string }[] }[]) => {
  return arr.reduce((s, item) => s + ' ' + item.children.reduce((s, child) => s + ' ' + child.text, ''), '');
};

export const formatBytes = (bytes: number, decimals = 2) => {
  if (bytes === 0) return '0 Bytes';

  const k = 1000;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];

  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
};

export const search = (a: string, b: string) => {
  const c = a.trim().toLowerCase().split(/\s+/g);
  const d = b.trim().toLowerCase().split(/\s+/g);
  for (const m of c) {
    for (const n of d) {
      if (m.includes(n)) return true;
    }
  }
  return false;
};
