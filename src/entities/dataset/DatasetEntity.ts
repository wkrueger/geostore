import { Store } from '../store/StoreEntity';
import { Operation } from '../operation/OperationEntity';
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
