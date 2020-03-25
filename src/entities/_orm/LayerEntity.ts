import {
  PrimaryKey,
  Property,
  OneToOne,
  Entity,
  IdentifiedReference,
  ManyToOne,
  Cascade,
} from 'mikro-orm';
import { Dataset } from './DatasetEntity';
import { Mapfile } from './MapfileEntity';
import { Store } from './StoreEntity';

@Entity()
export class MapfileLayer {
  @PrimaryKey()
  id!: number;

  @ManyToOne({ cascade: [Cascade.ALL] })
  mapfile!: IdentifiedReference<Mapfile>;

  @Property()
  code?: string;

  @Property()
  label!: string;

  // either store or dataset
  @OneToOne({ owner: true })
  dataset?: IdentifiedReference<Dataset>;

  // either store or dataset
  @OneToOne({ owner: true })
  store?: IdentifiedReference<Store>;

  @Property({ type: 'text', default: "''" })
  classes!: string;
}
