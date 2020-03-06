import { PrimaryKey, Property, OneToOne, Entity, IdentifiedReference, ManyToOne } from 'mikro-orm';
import { Dataset } from './DatasetEntity';
import { Mapfile } from './MapfileEntity';

@Entity()
export class MapfileLayer {
  @PrimaryKey()
  id!: number;

  @ManyToOne()
  mapfile!: IdentifiedReference<Mapfile>;

  @Property()
  code!: string;

  @Property()
  label!: string;

  @OneToOne(_ => Dataset)
  dataset!: IdentifiedReference<Dataset>;

  @Property({ type: 'text', default: "''" })
  classes!: string;
}
