import sqlite from 'better-sqlite3';

export class GpkgReader {
  constructor(public absFilePath: string) {}
  private conn = new sqlite(this.absFilePath);

  selectSource() {
    const selectedSource: { table_name } = this.conn.prepare('SELECT * FROM gpkg_contents;').get();
    return selectedSource;
  }

  getSize() {
    const selectedSource = this.selectSource();
    const sizeQuery = this.conn.prepare(
      `SELECT COUNT(*) AS nlines FROM ${selectedSource.table_name}`,
    );
    const resp = sizeQuery.get();
    const count = resp.nlines;
    return count;
  }

  async read({
    iterator,
    start,
    end,
  }: {
    iterator: (i: any[], count: number) => Promise<void>;
    start: number;
    end: number;
  }) {
    // fixme: binding did not work on table name
    // const queue = new Queue(10);

    const selectedSource = this.selectSource();
    const count = end - start;
    const cursor = this.conn.prepare(
      `SELECT * FROM ${selectedSource.table_name} LIMIT ${end - start} OFFSET ${start}`,
    );
    const all = cursor.all();
    for (const chunk of all) {
      const geomUint = chunk.geom;
      const geomBuffer = Buffer.from(geomUint);
      const stripped = this.stripHeader(geomBuffer);
      chunk.geom = stripped; //wkx.Geometry.parse(stripped);
    }
    let slice = null as any;
    let sliceStart = 0;
    while (slice && slice.length) {
      slice = all.slice(sliceStart, sliceStart + 200);
      await iterator(slice, count);
      sliceStart += 200;
    }
  }

  finished() {
    this.conn.close();
  }

  private getBit(nr: number, byte: number) {
    let bt = (nr >> byte) & 1;
    return bt;
  }

  private getInt(src: number[]) {
    let out = 0;
    for (let x = 0; x < src.length; x++) {
      const bit = src[x];
      if (bit) out += 2 ** x;
    }
    return out;
  }

  private stripHeader(src: Buffer) {
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
}

// class Queue {
//   constructor(public concurrent: number) {}
//   listener?: (err?) => void;
//   finishListener?: (err?) => void;
//   running = 0;

//   register(fn: () => Promise<void>) {
//     this.running++;
//     fn()
//       .then(() => {
//         this.running--;
//         if (this.running < this.concurrent) {
//           this.listener && this.listener();
//           if (this.running === 0) {
//             this.finishListener && this.finishListener();
//           }
//         }
//       })
//       .catch(err => {
//         this.listener && this.listener(err);
//         this.finishListener && this.finishListener(err);
//       });
//   }

//   async add(fn: () => Promise<any>) {
//     if (this.running >= this.concurrent) {
//       await new Promise((resolve, reject) => {
//         if (this.listener) {
//           console.error('unexpected');
//           throw Error('unexpected');
//         }
//         this.listener = err => {
//           if (err) return reject(err);
//           this.listener = undefined;
//           resolve();
//         };
//       });
//       this.register(fn);
//     } else {
//       this.register(fn);
//     }
//   }

//   async finished() {
//     if (this.running === 0) return;
//     if (this.finishListener) {
//       console.error('unexpected (finish)');
//       throw Error('unexpected (finish)');
//     }
//     await new Promise((resolve, reject) => {
//       this.finishListener = err => {
//         if (err) return reject(err);
//         resolve();
//       };
//     });
//   }
// }
