import * as v from 'valibot';

export const createUser = v.object({
  id: v.pipe(v.string(), v.trim(), v.nonEmpty()),
  name: v.pipe(v.string(), v.trim(), v.nonEmpty()),
});

export const createPin = v.object({
  _path: v.pipe(v.string(), v.trim(), v.nonEmpty()),
  path: v.pipe(v.string(), v.trim(), v.nonEmpty()),
  w: v.pipe(v.string(), v.transform(Number)),
  _x: v.pipe(v.string(), v.transform(Number)),
  x: v.pipe(v.string(), v.transform(Number)),
  _y: v.pipe(v.string(), v.transform(Number)),
  y: v.pipe(v.string(), v.transform(Number)),
  text: v.pipe(v.string(), v.trim(), v.nonEmpty()),
});

export const createComment = v.object({
  text: v.pipe(v.string(), v.trim(), v.nonEmpty()),
});

export const updateComment = v.object({
  text: v.pipe(v.string(), v.trim(), v.nonEmpty()),
});
