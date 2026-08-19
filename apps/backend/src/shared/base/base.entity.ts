export abstract class BaseEntity {
  id!: string;
  createdAt!: Date;
  updatedAt!: Date;
}

export abstract class SoftDeletableEntity extends BaseEntity {
  deletedAt!: Date | null;

  get isDeleted(): boolean {
    return this.deletedAt !== null;
  }
}
