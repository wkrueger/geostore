import { IsNotEmpty, Allow } from 'class-validator';

export class CreateStoreDto {
  @IsNotEmpty()
  code!: string;

  @IsNotEmpty()
  label!: string;
}

export class StoreQueryDto {
  @Allow()
  datasetId?: number;

  @Allow()
  storeId?: number;

  @Allow()
  storeCode?: string;

  @Allow()
  intersectsGeometry?: any;

  @Allow()
  limit?: number;

  @Allow()
  offset?: number;

  // @Allow()
  // withArea?: number
}
