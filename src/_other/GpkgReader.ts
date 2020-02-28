import knex from 'knex';
import through from 'through2';

export class GpkgReader {
  constructor() {}

  async read({
    sourceName,
    iterator,
    absFilePath,
  }: {
    sourceName?: string;
    iterator: any;
    absFilePath: string;
  }) {
    const conn = knex({
      client: 'sqlite3',
      connection: {
        filename: absFilePath,
      },
    });

    const srcQuery = conn.table('gpkg_contents');
    if (sourceName) {
      srcQuery.where({ identifier: sourceName });
    }
    const sources = await srcQuery;
    const selectedSource = sources[0];
    const query = conn.table(selectedSource.table_name).stream();
    await new Promise((resolve, reject) => {
      const processor = through(iterator, function Flush() {
        resolve();
        query.end();
      });
      query.on('error', err => reject(err));
      query.pipe(processor);
    });
    await conn.destroy();
  }
}
