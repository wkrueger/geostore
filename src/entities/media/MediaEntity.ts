import { BaseEntity, PrimaryGeneratedColumn, Column, Entity } from 'typeorm';
import { getContext } from 'src/contexts/getContext';
import mime from 'mime';

@Entity()
export class Media extends BaseEntity {
  @PrimaryGeneratedColumn('uuid')
  uuid!: string;

  @Column({ nullable: false })
  contentType!: string;

  getAbsFilePath() {
    const ctx = getContext();
    const ext = mime.getExtension(this.contentType);
    return ctx.pathFromRoot('media', this.uuid + '.' + ext);
  }
}
