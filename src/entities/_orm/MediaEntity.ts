import { getContext } from '../../contexts/getContext';
import { Entity, PrimaryKey, Property, UuidEntity } from 'mikro-orm';
import { v4 } from 'uuid';

@Entity()
export class Media implements UuidEntity<any> {
  @PrimaryKey()
  uuid!: string;

  @Property()
  extension!: string;

  @Property()
  absPath?: string;

  getAbsFilePath() {
    const ctx = getContext();
    if (this.absPath) {
      return this.absPath;
    }
    return ctx.pathFromRoot('media', this.uuid + '.' + this.extension);
  }
}
