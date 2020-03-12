import { Dataset } from '../_orm/DatasetEntity';
import { Logger } from '@nestjs/common';
import { DatasetService } from './DatasetService';
import { InjectRepository } from 'nestjs-mikro-orm';
import { EntityRepository } from 'mikro-orm';
import { error } from '../../_other/error';
import { GpkgReader } from '../../_other/GpkgReader';
import { StoreService } from '../store/StoreService';
import { OperationState } from '../_orm/OperationEntity';
import { ThreadsEventWorker } from '../../_other/workers/threads/ThreadsEventWorker';

export class DatasetCreateWorker {
  constructor(
    @InjectRepository(Dataset) private datasetRepo: EntityRepository<Dataset>,
    private storeSvc: StoreService,
    private datasetSvc: DatasetService,
  ) {
    this.eventWorker.setHandler('getSize', this.getSize.bind(this));
    this.eventWorker.setHandler('loadChunk', this.loadChunk.bind(this));
    this.eventWorker.setHandler('postLoad', this.postLoad.bind(this));
    this.eventWorker.setErrorHandler(this.onFail.bind(this));
    this.eventWorker.start();
  }
  eventWorker = new ThreadsEventWorker();

  private logger = new Logger('maploader');

  async onFail({ data, error, key }) {
    this.logger.error(`job failed: ${key} for dataset ${data?.datasetId} with ${String(error)}`);
    if (!data?.datasetId) return;
    const found = await this.datasetRepo.findOne({ id: data.datasetId });
    if (!found) throw error('NOT_FOUND', 'Dataset not found.');

    const operation = await found.operation.load();
    operation.state = OperationState.ERRORED;
    operation.message = '(' + key + ') ' + String(error).substr(0, 220);
    await this.datasetRepo.persistAndFlush(found);
  }

  async getSize(data: { datasetId: number }) {
    const found = await this.datasetRepo.findOne({ id: data.datasetId });
    if (!found) throw error('NOT_FOUND', 'Dataset not found.');

    const media = await found.media.load();
    const reader = new GpkgReader(media.getAbsFilePath());
    const datasetSize = reader.getSize();
    reader.finished();

    const dataset = await this.datasetRepo.findOne({ id: data.datasetId });
    if (!dataset) return;
    const operation = await dataset.operation.load();
    let bounds: [number, number][];
    if (datasetSize < 10 ** 5) {
      bounds = [[0, datasetSize + 100]];
    } else {
      const chunkSize = Math.ceil(datasetSize / 4);
      bounds = [0, 1, 2, 3].map(idx => {
        return [idx * chunkSize, (idx + 1) * chunkSize];
      });
    }

    const jobs = await Promise.all(
      bounds.map(args => {
        return this.eventWorker.invokeHandler('loadChunk', {
          datasetId: dataset.id,
          start: args[0],
          end: args[1],
        });
      }),
    );
    operation.info = {
      processed: 0,
      total: datasetSize,
      allJobs: jobs,
      finishedJobs: [],
    };
    await this.datasetRepo.persistAndFlush(operation);
  }

  async loadChunk(data: { datasetId: number; start: number; end: number }, _key, jobId) {
    let that = this;
    const found = await this.datasetRepo.findOne({ id: data.datasetId });
    if (!found) throw error('NOT_FOUND', 'Dataset not found.');

    let done = 0;
    const media = await found.media.load();
    const reader = new GpkgReader(media.getAbsFilePath());
    await this.storeSvc.dataTransaction(found, async helper => {
      await reader.read({
        start: data.start,
        end: data.end,
        async iterator(lines) {
          lines = lines.map(line => {
            let geom: any;
            let properties = {};
            Object.entries(line).forEach(([k, v]) => {
              if (k === 'geom') geom = v;
              else properties[k] = v;
            });
            return { geom, properties };
          });
          await helper.insertData({ lines });
          done += lines.length;
          that.setChunkProgress(data.datasetId, done);
        },
      });
    });
    reader.finished();
    await this.onChunkComplete(jobId, data.datasetId);
  }

  async setChunkProgress(datasetId: number, count: number) {
    const dataset = await this.datasetRepo.findOne({ id: datasetId });
    if (!dataset) return;
    const operation = await dataset.operation.load();
    operation.info!.processed += count;
    operation.progress = operation.info!.total / operation.info!.processed;
    await this.datasetRepo.persistAndFlush(operation);
  }

  async onChunkComplete(jobId, datasetId) {
    const dataset = await this.datasetRepo.findOne({ id: datasetId });
    if (!dataset) return;
    const operation = await dataset.operation.load();
    operation.info!.finishedJobs = [...operation.info!.finishedJobs, jobId];
    await this.datasetRepo.persistAndFlush(operation);
    if (operation.info!.allJobs.length === operation.info!.finishedJobs.length) {
      await this.eventWorker.invokeHandler('postLoad', { datasetId: dataset.id });
    }
  }

  async postLoad(data: { datasetId: number }) {
    const found = await this.datasetRepo.findOne({ id: data.datasetId });
    if (!found) throw error('NOT_FOUND', 'Dataset not found.');

    const extent = await this.datasetSvc.calculateExtent(found);
    found.extent = extent.join(' ');
    const operation = await found.operation.load();
    operation.progress = 1;
    operation.state = OperationState.COMPLETED;
    await this.datasetRepo.persistAndFlush(found);
  }
}
