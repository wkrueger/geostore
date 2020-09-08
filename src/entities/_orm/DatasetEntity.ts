import { Store } from './StoreEntity'
import { Operation } from './OperationEntity'
import { Media } from './MediaEntity'
import {
  Entity,
  PrimaryKey,
  ManyToOne,
  OneToOne,
  Property,
  Cascade,
  IdentifiedReference,
  OneToMany,
} from 'mikro-orm'

@Entity()
export class Dataset {
  static DEFAULT_EXTENT = [-74, -34, -28, 6]

  @PrimaryKey()
  id!: number

  @ManyToOne()
  store!: IdentifiedReference<Store>

  @OneToOne({ cascade: [Cascade.ALL] })
  operation!: IdentifiedReference<Operation>

  @ManyToOne({})
  media?: IdentifiedReference<Media, 'uuid'>

  @Property({ onCreate: () => new Date() })
  createdAt!: Date

  @Property()
  sourceTable!: string

  @Property()
  extent?: string

  @Property()
  notes?: string
}
