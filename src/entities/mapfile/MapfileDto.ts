import { Allow, IsNotEmpty, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateMapfileDto {
  @IsNotEmpty()
  label!: string;

  @ValidateNested({ each: true })
  @Type(_ => CreateLayerDto)
  layers!: CreateLayerDto[];

  @Allow()
  customTemplate?: string;
}

export class CreateLayerDto {
  @Allow()
  label?: string;

  @Allow()
  code?: string;

  @Allow()
  store?: number;

  @Allow()
  dataset?: number;

  @IsNotEmpty()
  classes!: string;
}
