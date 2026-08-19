import { registerDecorator, ValidationOptions } from 'class-validator';

export function IsGST(validationOptions?: ValidationOptions) {
  return (object: object, propertyName: string): void => {
    registerDecorator({
      name: 'isGST',
      target: object.constructor,
      propertyName,
      options: validationOptions,
      validator: {
        validate(value: unknown): boolean {
          return typeof value === 'string' && /^\d{2}[A-Z]{5}\d{4}[A-Z]{1}[A-Z\d]{1}[Z]{1}[A-Z\d]{1}$/.test(value);
        },
        defaultMessage(): string {
          return 'GST must be a valid 15-character GSTIN (e.g. 22AAAAA0000A1Z5)';
        },
      },
    });
  };
}

export function IsPAN(validationOptions?: ValidationOptions) {
  return (object: object, propertyName: string): void => {
    registerDecorator({
      name: 'isPAN',
      target: object.constructor,
      propertyName,
      options: validationOptions,
      validator: {
        validate(value: unknown): boolean {
          return typeof value === 'string' && /^[A-Z]{5}\d{4}[A-Z]{1}$/.test(value);
        },
        defaultMessage(): string {
          return 'PAN must be a valid 10-character PAN (e.g. AAAAA0000A)';
        },
      },
    });
  };
}

export function IsIFSC(validationOptions?: ValidationOptions) {
  return (object: object, propertyName: string): void => {
    registerDecorator({
      name: 'isIFSC',
      target: object.constructor,
      propertyName,
      options: validationOptions,
      validator: {
        validate(value: unknown): boolean {
          return typeof value === 'string' && /^[A-Z]{4}0[A-Z0-9]{6}$/.test(value);
        },
        defaultMessage(): string {
          return 'IFSC must be a valid 11-character code (e.g. HDFC0001234)';
        },
      },
    });
  };
}

export function IsBusinessUrl(validationOptions?: ValidationOptions) {
  return (object: object, propertyName: string): void => {
    registerDecorator({
      name: 'isBusinessUrl',
      target: object.constructor,
      propertyName,
      options: validationOptions,
      validator: {
        validate(value: unknown): boolean {
          if (typeof value !== 'string') return false;
          try {
            const url = new URL(value.startsWith('http') ? value : `https://${value}`);
            return url.hostname.includes('.');
          } catch {
            return false;
          }
        },
        defaultMessage(): string {
          return 'Must be a valid URL';
        },
      },
    });
  };
}
