import { IsNotEmpty } from 'class-validator';

export class CreateStoreDTO {
  @IsNotEmpty()
  code!: string;
}

export class StoreQueryDto {
  @IsNotEmpty()
  dataset!: number;

  intersect?: any;
}
