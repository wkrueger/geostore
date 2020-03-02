import {
  BaseEntity,
  Entity,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Column,
} from 'typeorm';

export enum OperationState {
  PENDING,
  ERRORED,
  COMPLETED,
}

@Entity()
export class Operation extends BaseEntity {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({
    type: 'enum',
    enum: OperationState,
    default: OperationState.PENDING,
  })
  state!: OperationState;

  @Column({ default: 0, type: 'float' })
  progress: number = 0;

  @Column({ length: 255, nullable: true })
  message!: string;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
