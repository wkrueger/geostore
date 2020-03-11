import sqlite from 'better-sqlite3';
import fs from 'fs';
import util from 'util';

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
    // sourceName,
    iterator,
    absFilePath,
  }: {
    sourceName?: string;
    iterator: (i: any[], count: number) => Promise<void>;
    absFilePath: string;
  }) {
    const conn = new sqlite(absFilePath);
    const selectedSource = conn.prepare('SELECT * FROM gpkg_contents;').get();

    const stat = await util.promisify(fs.stat)(absFilePath);
    let count = null as any;
    if (stat.size < 10 ** 9 /* 1 gb */) {
      const sizeQuery = conn.prepare('SELECT COUNT(*) AS nlines FROM ?');
      const resp = sizeQuery.get(selectedSource.table_name);
      count = resp.nlines;
    }

    // fixme: binding did not work on table name
    // const queue = new Queue(10);

    const cursor = conn.prepare(`SELECT * FROM ${selectedSource.table_name}`);
    let batch = [] as any[];
    for (const chunk of cursor.iterate()) {
      const geomUint = chunk.geom;
      const geomBuffer = Buffer.from(geomUint);
      const stripped = this.stripHeader(geomBuffer);
      chunk.geom = stripped; //wkx.Geometry.parse(stripped);
      batch.push(chunk);
      if (batch.length >= 500) {
        await iterator(batch, count);
        batch = [];
      }
    }
    if (batch.length) {
      await iterator(batch, count);
    }
    // await queue.finished();

    conn.close();
  }
}

class Queue {
  constructor(public concurrent: number) {}
  listener?: (err?) => void;
  finishListener?: (err?) => void;
  running = 0;

  register(fn: () => Promise<void>) {
    this.running++;
    fn()
      .then(() => {
        this.running--;
        if (this.running < this.concurrent) {
          this.listener && this.listener();
          if (this.running === 0) {
            this.finishListener && this.finishListener();
          }
        }
      })
      .catch(err => {
        this.listener && this.listener(err);
        this.finishListener && this.finishListener(err);
      });
  }

  async add(fn: () => Promise<any>) {
    if (this.running >= this.concurrent) {
      await new Promise((resolve, reject) => {
        if (this.listener) {
          console.error('unexpected');
          throw Error('unexpected');
        }
        this.listener = err => {
          if (err) return reject(err);
          this.listener = undefined;
          resolve();
        };
      });
      this.register(fn);
    } else {
      this.register(fn);
    }
  }

  async finished() {
    if (this.running === 0) return;
    if (this.finishListener) {
      console.error('unexpected (finish)');
      throw Error('unexpected (finish)');
    }
    await new Promise((resolve, reject) => {
      this.finishListener = err => {
        if (err) return reject(err);
        resolve();
      };
    });
  }
}
