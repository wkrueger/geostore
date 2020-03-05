import { IsNotEmpty, Allow } from 'class-validator';

export class CreateStoreDTO {
  @IsNotEmpty()
  code!: string;
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
