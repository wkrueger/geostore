import { Cascade, Entity, OneToMany, PrimaryKey, Property } from 'mikro-orm';
import { Dataset } from './DatasetEntity';

@Entity()
export class Store {
  constructor(partial: Partial<Store> = {}) {
    Object.assign(this, partial);
  }

  @PrimaryKey()
  id!: number;

  @Property({ unique: true })
  code!: string;

  @OneToMany(
    () => Dataset,
    dataset => dataset.store,
    { cascade: [Cascade.ALL] },
  )
  datasets!: Dataset[];
}
