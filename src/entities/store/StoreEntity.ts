import {
  PrimaryGeneratedColumn,
  Entity,
  Column,
  BaseEntity,
  OneToMany,
} from 'typeorm';
import { Dataset } from '../dataset/DatasetEntity';

@Entity()
export class Store extends BaseEntity {
  constructor(partial: Partial<Store> = {}) {
    super();
    Object.assign(this, partial);
  }

  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ unique: true, nullable: false })
  code!: string;

  @OneToMany(
    _type => Dataset,
    dataset => dataset.store,
    { cascade: true },
  )
  datasets!: Dataset[];
}
