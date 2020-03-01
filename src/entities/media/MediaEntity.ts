import { getContext } from 'src/contexts/getContext';
import { BaseEntity, Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity()
export class Media extends BaseEntity {
  @PrimaryGeneratedColumn('uuid')
  uuid!: string;

  @Column({ nullable: false })
  extension!: string;

  getAbsFilePath() {
    const ctx = getContext();
    return ctx.pathFromRoot('media', this.uuid + '.' + this.extension);
  }
}
