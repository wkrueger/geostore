import { IsNotEmpty } from 'class-validator';

export class LinkMediaDto {
  @IsNotEmpty()
  absPath!: string;
}
