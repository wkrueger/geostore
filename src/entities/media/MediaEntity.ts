import { getContext } from 'src/contexts/getContext';
import { Entity, PrimaryKey, Property } from 'mikro-orm';

@Entity()
export class Media {
  @PrimaryKey()
  uuid!: string;

  @Property()
  extension!: string;

  getAbsFilePath() {
    const ctx = getContext();
    return ctx.pathFromRoot('media', this.uuid + '.' + this.extension);
  }
}
