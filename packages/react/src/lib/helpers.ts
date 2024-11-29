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
