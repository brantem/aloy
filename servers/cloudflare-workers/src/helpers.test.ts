import { convertToBytes } from './helpers';

test('convertToBytes', () => {
  expect(convertToBytes('')).toEqual(0);
  expect(convertToBytes('42')).toEqual(42);
  expect(convertToBytes('42b')).toEqual(42);
  expect(convertToBytes('42B')).toEqual(42);
  expect(convertToBytes('42 b')).toEqual(42);
  expect(convertToBytes('42 B')).toEqual(42);

  expect(convertToBytes('42k')).toEqual(42 * 1000);
  expect(convertToBytes('42K')).toEqual(42 * 1000);
  expect(convertToBytes('42kb')).toEqual(42 * 1000);
  expect(convertToBytes('42KB')).toEqual(42 * 1000);
  expect(convertToBytes('42 kb')).toEqual(42 * 1000);
  expect(convertToBytes('42 KB')).toEqual(42 * 1000);

  expect(convertToBytes('42M')).toEqual(42 * 1000 * 1000);
  expect(convertToBytes('42.5MB')).toEqual(42.5 * 1000 * 1000);
  expect(convertToBytes('42G')).toEqual(42 * 1000 * 1000 * 1000);

  expect(convertToBytes('string')).toEqual(0);
  expect(convertToBytes('MB')).toEqual(0);
});
