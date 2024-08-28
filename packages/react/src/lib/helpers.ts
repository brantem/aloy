import { twMerge } from 'tailwind-merge';
import clsx, { type ClassValue } from 'clsx';

export const cn = (...inputs: ClassValue[]) => {
  return twMerge(clsx(inputs));
};

export const isElementHidden = (el: Element) => {
  const styles = window.getComputedStyle(el);
  return styles.display === 'none' || styles.visibility === 'hidden';
};
