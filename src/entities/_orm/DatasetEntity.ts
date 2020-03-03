import { Store } from './StoreEntity';
import { Operation } from './OperationEntity';
import { Media } from '../media/MediaEntity';
import { Entity, PrimaryKey, ManyToOne, OneToOne, Property } from 'mikro-orm';

@Entity()
export class Dataset {
  @PrimaryKey()
  id!: number;

  @ManyToOne()
  store!: Store;

  @OneToOne()
  operation!: Operation;

  @OneToOne()
  media!: Media;

  @Property({ onCreate: () => new Date() })
  createdAt!: Date;
}
