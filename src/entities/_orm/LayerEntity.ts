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

  @OneToOne({ owner: true })
  dataset!: IdentifiedReference<Dataset>;

  @Property({ type: 'text', default: "''" })
  classes!: string;
}
