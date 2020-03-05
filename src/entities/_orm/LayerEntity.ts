import { PrimaryKey, Property, OneToOne, Entity } from 'mikro-orm';
import { Dataset } from './DatasetEntity';

@Entity()
export class Layer {
  @PrimaryKey()
  id!: number;

  @Property()
  code!: string;

  @Property()
  label!: string;

  @OneToOne(_ => Dataset)
  dataset!: Dataset;

  @Property({ type: 'text', default: '' })
  classes!: string;
}
