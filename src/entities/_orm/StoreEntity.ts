import { Cascade, Entity, OneToMany, PrimaryKey, Property, Collection } from 'mikro-orm'
import { Dataset } from './DatasetEntity'

@Entity()
export class Store {
  static DEFAULT_PROJECTION_CODE = 'epsg:4326'

  constructor(partial: Partial<Store> = {}) {
    Object.assign(this, partial)
  }

  @PrimaryKey()
  id!: number

  @Property({ unique: true })
  code!: string

  @Property()
  label!: string

  @Property({ default: `'${Store.DEFAULT_PROJECTION_CODE}'` })
  projectionCode?: string

  @OneToMany(
    () => Dataset,
    dataset => dataset.store,
  )
  datasets = new Collection<Dataset>(this)
}
