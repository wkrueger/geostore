import { Entity, OneToMany, PrimaryKey, Property } from 'mikro-orm';
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
  )
  layers: MapfileLayer[] = [];

  @Property({ type: 'text' })
  customTemplate?: string;
}
