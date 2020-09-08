import sqlite from 'better-sqlite3'

export class GpkgReader {
  constructor(public absFilePath: string) {}
  private conn = new sqlite(this.absFilePath)

  getTables() {
    const sources = this.conn.prepare('SELECT table_name FROM gpkg_contents;').all()
    const allTables: string[] = sources.map(x => x.table_name)
    return allTables
  }

  getSize(tableName: string) {
    if (!tableName) throw Error('tableName is required.')
    const sizeQuery = this.conn.prepare(`SELECT COUNT(*) AS nlines FROM ${tableName}`)
    const resp = sizeQuery.get()
    return resp.nlines
  }

  async read({
    iterator,
    tableName,
    start,
    end,
  }: {
    iterator: (i: any[], count: number, tableName: string) => Promise<void>
    tableName: string
    start: number
    end: number
  }) {
    // fixme: binding did not work on table name
    // const queue = new Queue(10);

    const count = end - start
    const cursor = this.conn.prepare(
      `SELECT * FROM ${tableName} LIMIT ${end - start} OFFSET ${start}`,
    )
    const all = cursor.all()
    for (const chunk of all) {
      const geomUint = chunk.geom
      const geomBuffer = Buffer.from(geomUint)
      const stripped = this.stripHeader(geomBuffer)
      chunk.geom = stripped //wkx.Geometry.parse(stripped);
    }
    let sliceStart = 0
    let slice = all.slice(sliceStart, sliceStart + 200)
    while (slice.length) {
      await iterator(slice, count, tableName)
      sliceStart += 200
      slice = all.slice(sliceStart, sliceStart + 200)
    }
  }

  finished() {
    this.conn.close()
  }

  private getBit(nr: number, byte: number) {
    let bt = (nr >> byte) & 1
    return bt
  }

  private getInt(src: number[]) {
    let out = 0
    for (let x = 0; x < src.length; x++) {
      const bit = src[x]
      if (bit) out += 2 ** x
    }
    return out
  }

  private stripHeader(src: Buffer) {
    // magic: 0 - 1
    // version: 2
    // flags: 3
    // srsid: 4 - 35
    // envelope: variable
    const flags = src[3]
    let bits = [...Array(8).keys()].map(x => this.getBit(flags, x)).reverse()
    let slice = bits.slice(4, 7).reverse()
    let contents = this.getInt(slice)
    const sizemap = {
      0: 0,
      1: 32,
      2: 48,
      3: 48,
      4: 64,
    }
    const envsize = sizemap[contents]
    return src.slice(8 + envsize)
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
