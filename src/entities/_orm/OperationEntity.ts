import { Entity, PrimaryKey, Property, Enum } from 'mikro-orm';

export enum OperationState {
  PENDING,
  ERRORED,
  COMPLETED,
}

@Entity()
export class Operation {
  @PrimaryKey()
  id!: number;

  @Enum()
  state: OperationState = OperationState.PENDING;

  @Property({ default: 0, type: 'float' })
  progress: number = 0;

  @Property({ length: 255 })
  message?: string;

  @Property({ onCreate: () => new Date() })
  createdAt!: Date;

  @Property({ onUpdate: () => new Date() })
  updatedAt!: Date;

  @Property({ type: 'jsonb' })
  info?: Record<string, any>;
}
