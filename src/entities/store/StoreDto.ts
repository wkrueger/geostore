import { IsNotEmpty } from 'class-validator';

export class CreateStoreDTO {
  @IsNotEmpty()
  code!: string;
}
