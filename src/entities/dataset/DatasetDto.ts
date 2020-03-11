import { IsNotEmpty, Allow } from 'class-validator';

export class CreateFromMediaDto {
  @IsNotEmpty()
  mediaUuid!: string;

  @IsNotEmpty()
  storeCode!: string;

  @Allow()
  notes?: string;
}
