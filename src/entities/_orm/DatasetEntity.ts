import { Store } from './StoreEntity';
import { Operation } from './OperationEntity';
import { Media } from './MediaEntity';
import {
  Entity,
  PrimaryKey,
  ManyToOne,
  OneToOne,
  Property,
  Cascade,
} from 'mikro-orm';

@Entity()
export class Dataset {
  static DEFAULT_EXTENT = [-74, -34, -28, 6];

  @PrimaryKey()
  id!: number;

  @ManyToOne()
  store!: Store;

  @OneToOne({ cascade: [Cascade.ALL] })
  operation!: Operation;

  @OneToOne()
  media!: Media;

  @Property({ onCreate: () => new Date() })
  createdAt!: Date;

  @Property()
  extent?: string;
}
