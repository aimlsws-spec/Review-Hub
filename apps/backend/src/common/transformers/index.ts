import { Transform, TransformFnParams } from 'class-transformer';

export const TrimString = Transform(({ value }: TransformFnParams) =>
  typeof value === 'string' ? value.trim() : value,
);

export const LowerCase = Transform(({ value }: TransformFnParams) =>
  typeof value === 'string' ? value.toLowerCase() : value,
);

export const UpperCase = Transform(({ value }: TransformFnParams) =>
  typeof value === 'string' ? value.toUpperCase() : value,
);

export const BooleanTransformer = Transform(({ value }: TransformFnParams) => {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') return value.toLowerCase() === 'true' || value === '1';
  if (typeof value === 'number') return value === 1;
  return false;
});

export const NumberTransformer = Transform(({ value }: TransformFnParams) => {
  if (typeof value === 'number') return value;
  if (typeof value === 'string') {
    const parsed = Number(value);
    return Number.isNaN(parsed) ? value : parsed;
  }
  return value;
});
