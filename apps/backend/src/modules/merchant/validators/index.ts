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

/** Indian bank account numbers: 9 to 18 digits, nothing else. Spaces and dashes are for people, not storage. */
export function IsBankAccountNumber(validationOptions?: ValidationOptions) {
  return (object: object, propertyName: string): void => {
    registerDecorator({
      name: 'isBankAccountNumber',
      target: object.constructor,
      propertyName,
      options: validationOptions,
      validator: {
        validate(value: unknown): boolean {
          return typeof value === 'string' && /^\d{9,18}$/.test(value);
        },
        defaultMessage(): string {
          return 'Account number must be 9 to 18 digits';
        },
      },
    });
  };
}

/** A UPI ID (virtual payment address): handle@provider, e.g. jane.doe@okhdfc. */
export function IsUpiId(validationOptions?: ValidationOptions) {
  return (object: object, propertyName: string): void => {
    registerDecorator({
      name: 'isUpiId',
      target: object.constructor,
      propertyName,
      options: validationOptions,
      validator: {
        validate(value: unknown): boolean {
          return typeof value === 'string' && value.length <= 100 && /^[A-Za-z0-9._-]{2,}@[A-Za-z][A-Za-z0-9]{1,63}$/.test(value);
        },
        defaultMessage(): string {
          return 'UPI ID must look like name@bank (e.g. jane.doe@okhdfc)';
        },
      },
    });
  };
}
