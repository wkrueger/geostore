import { Entity, OneToMany, PrimaryKey, Property } from 'mikro-orm';
import { Layer } from './LayerEntity';

@Entity()
export class Mapfile {
  @PrimaryKey()
  id!: number;

  @Property()
  label!: string;

  @OneToMany(_ => Layer)
  layers: Layer[] = [];
}
