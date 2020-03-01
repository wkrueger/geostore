import {
  Entity,
  BaseEntity,
  PrimaryGeneratedColumn,
  ManyToOne,
  Column,
  OneToOne,
  JoinColumn,
  CreateDateColumn,
} from 'typeorm';
import { Store } from '../store/StoreEntity';
import { Operation } from '../operation/OperationEntity';
import { Media } from '../media/MediaEntity';

@Entity()
export class Dataset extends BaseEntity {
  @PrimaryGeneratedColumn()
  id!: number;

  @ManyToOne(
    _type => Store,
    store => store.datasets,
  )
  store!: Store;

  @ManyToOne(_type => Operation)
  operation!: Operation;

  @OneToOne(_type => Media)
  @JoinColumn()
  media!: Media;

  @CreateDateColumn()
  createdAt!: Date;
}
