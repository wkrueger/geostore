import { Allow, IsNotEmpty, ValidateNested } from 'class-validator';

export class CreateMapfileDto {
  @IsNotEmpty()
  label!: string;

  @ValidateNested()
  layers!: CreateLayerDto[];

  @Allow()
  customTemplate?: string;
}

export class CreateLayerDto {
  @Allow()
  label?: string;

  @IsNotEmpty()
  dataset!: number;

  @IsNotEmpty()
  classes!: string;
}
