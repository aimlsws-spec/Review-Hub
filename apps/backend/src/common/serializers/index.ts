import { instanceToPlain, plainToInstance, ClassConstructor } from 'class-transformer';

export class ApiSerializer {
  static serialize<T extends object>(data: T): Record<string, unknown> {
    return instanceToPlain(data, {
      excludeExtraneousValues: true,
      exposeUnsetFields: false,
    }) as Record<string, unknown>;
  }

  static deserialize<T extends object>(
    cls: ClassConstructor<T>,
    plain: Record<string, unknown>,
  ): T {
    return plainToInstance(cls, plain, {
      excludeExtraneousValues: true,
    });
  }

  static serializeArray<T extends object>(data: T[]): Record<string, unknown>[] {
    return data.map((item) => this.serialize(item));
  }

  static deserializeArray<T extends object>(
    cls: ClassConstructor<T>,
    plainArray: Record<string, unknown>[],
  ): T[] {
    return plainArray.map((plain) => this.deserialize(cls, plain));
  }
}
