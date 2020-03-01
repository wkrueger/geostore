import knex from 'knex';
import through from 'through2';
import wkx from 'wkx';

/*
b5 fd
1011 0101 1111 1101

*/

export class GpkgReader {
  getBit(nr: number, byte: number) {
    let bt = (nr >> byte) & 1;
    return bt;
  }

  getInt(src: number[]) {
    let out = 0;
    for (let x = 0; x < src.length; x++) {
      const bit = src[x];
      if (bit) out += 2 ** x;
    }
    return out;
  }

  stripHeader(src: Buffer) {
    // magic: 0 - 1
    // version: 2
    // flags: 3
    // srsid: 4 - 35
    // envelope: variable
    const flags = src[3];
    let bits = [...Array(8).keys()].map(x => this.getBit(flags, x)).reverse();
    let slice = bits.slice(4, 7).reverse();
    let contents = this.getInt(slice);
    const sizemap = {
      0: 0,
      1: 32,
      2: 48,
      3: 48,
      4: 64,
    };
    const envsize = sizemap[contents];
    return src.slice(8 + envsize);
  }

  async read({
    sourceName,
    iterator,
    absFilePath,
  }: {
    sourceName?: string;
    iterator: (i: any) => Promise<void>;
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
      const processor = through(
        { objectMode: true },
        async (chunk, enc, cb) => {
          try {
            // http://www.geopackage.org./spec/#gpb_format
            const geomUint = chunk.geom;
            const geomBuffer = Buffer.from(geomUint);
            // let test = [...Array(110).keys()];
            // test.forEach(begin => {
            //   try {
            //     let slice = geomBuffer.slice(begin);
            //     let parsed = wkx.Geometry.parse(slice);
            //     console.log('SUCCESS', begin);
            //   } catch (err) {
            //     console.log('failed with', begin);
            //   }
            // });
            const stripped = this.stripHeader(geomBuffer);
            chunk.geom = stripped; //wkx.Geometry.parse(stripped);
            await iterator(chunk);
            cb(null);
          } catch (err) {
            cb(err);
          }
        },
        function Flush() {
          resolve();
          query.end();
        },
      );
      query.on('error', err => {
        reject(err);
      });
      processor.on('error', err => {
        reject(err);
      });
      query.pipe(processor);
    });
    await conn.destroy();
  }
}
