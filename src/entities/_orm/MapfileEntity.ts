import { Entity, OneToMany, PrimaryKey, Property, Collection } from 'mikro-orm';
import { MapfileLayer } from './LayerEntity';

@Entity()
export class Mapfile {
  @PrimaryKey()
  id!: number;

  @Property()
  label!: string;

  @OneToMany(
    _ => MapfileLayer,
    layer => layer.mapfile,
    { orphanRemoval: true },
  )
  layers = new Collection<MapfileLayer>(this);

  @Property({ type: 'text' })
  customTemplate?: string;
}
