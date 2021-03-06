import { Logger } from '@nestjs/common'
import { EntityRepository, EntityManager } from 'mikro-orm'
import { InjectRepository } from 'nestjs-mikro-orm'
import { error } from '../../_other/error'
import { GpkgReader } from '../../_other/GpkgReader'
import { EventWorker } from '../../_other/workers/EventWorker'
import { StoreService } from '../store/StoreService'
import { Dataset } from '../_orm/DatasetEntity'
import { OperationState, Operation } from '../_orm/OperationEntity'
import { DatasetService } from './DatasetService'
import { Store } from '../_orm/StoreEntity'
import { Media } from '../_orm/MediaEntity'
import { MediaService } from '../media/MediaService'

export class DatasetCreateWorker {
  constructor(
    @InjectRepository(Dataset) private datasetRepo: EntityRepository<Dataset>,
    @InjectRepository(Operation) private operationRepo: EntityRepository<Operation>,
    private storeSvc: StoreService,
    private datasetSvc: DatasetService,
    private mediaSvc: MediaService,
    private eventWorker: EventWorker<any>,
    private em: EntityManager,
  ) {
    this.eventWorker.setHandler('start', this.start.bind(this))
    this.eventWorker.setHandler('loadChunk', this.loadChunk.bind(this))
    this.eventWorker.setHandler('postLoad', this.postLoad.bind(this))
    this.eventWorker.setHandler('remove', this.remove.bind(this))
    this.eventWorker.setErrorHandler(this.onFail.bind(this))
    this.eventWorker.start()
  }

  private logger = new Logger('maploader')

  async onFail({ data, error, key }) {
    this.logger.error(`job failed: ${key} for dataset ${data?.datasetId} with ${String(error)}`)
    if (!data?.datasetId) return
    const found = await this.datasetRepo.findOne({ id: data.datasetId })
    if (!found) throw error('NOT_FOUND', 'Dataset not found.')

    const operation = await found.operation.load()
    operation.state = OperationState.ERRORED
    operation.message = '(' + key + ') ' + String(error).substr(0, 220)
    await this.datasetRepo.persistAndFlush(found)
  }

  async start(i: { dataset: number }) {
    const dataset = await this.datasetRepo.findOneOrFail({ id: i.dataset })
    const media = await dataset.media!.load()
    const operation = await dataset.operation!.load()
    const reader = new GpkgReader(media.getAbsFilePath())
    const tableSize = reader.getSize(dataset.sourceTable)
    reader.finished()

    const chunkSize = 100000
    const nchunks = Math.ceil(tableSize / chunkSize)
    let bounds: [number, number][] = new Array(nchunks).fill(1).map((_, idx) => {
      return [idx * chunkSize, (idx + 1) * chunkSize]
    })
    console.log('read order', dataset.sourceTable, bounds)

    const orders: { datasetId: number; tableName: string; start: number; end: number }[] = []
    for (let bound of bounds) {
      orders.push({
        datasetId: dataset.id,
        tableName: dataset.sourceTable,
        start: bound[0],
        end: bound[1],
      })
    }
    const jobs = await Promise.all(
      orders.map(order => {
        return this.eventWorker.invokeHandler('loadChunk', order)
      }),
    )

    this.eventWorker.schedule({ key: 'postLoad', data: { datasetId: dataset.id } }, jobs)
    operation.info = {
      processed: 0,
      total: tableSize,
      allJobs: jobs,
    }
    await this.datasetRepo.persistAndFlush(operation)
  }

  async loadChunk(
    payload: { datasetId: number; tableName: string; start: number; end: number },
    _key,
    jobId,
  ) {
    let that = this
    const found = await this.datasetRepo.findOne({ id: payload.datasetId })
    if (!found) throw error('NOT_FOUND', 'Dataset not found.')

    let done = 0
    const media = await found.media!.load()
    const reader = new GpkgReader(media.getAbsFilePath())
    await this.storeSvc.dataTransaction(found, async helper => {
      await reader.read({
        tableName: payload.tableName,
        start: payload.start,
        end: payload.end,
        async iterator(lines, _, tableName) {
          lines = lines.map(line => {
            let geom: any
            let properties = {}
            Object.entries(line).forEach(([k, v]) => {
              if (k === 'geom') geom = v
              else properties[k] = v
            })
            return { geom, properties }
          })
          await helper.insertData({ lines, tableName })
          done += lines.length
          that.setChunkProgress(payload.datasetId, done)
        },
      })
    })
    reader.finished()
    await this.onChunkComplete(jobId, payload.datasetId)
  }

  async setChunkProgress(datasetId: number, count: number) {
    const dataset = await this.datasetRepo.findOne({ id: datasetId })
    if (!dataset) return
    const operation = await dataset.operation.load()
    operation.info!.processed += count
    operation.progress = operation.info!.total / operation.info!.processed
    await this.datasetRepo.persistAndFlush(operation)
  }

  async onChunkComplete(jobId, datasetId) {
    const dataset = await this.datasetRepo.findOne({ id: datasetId })
    if (!dataset) return
    const operation = (await this.operationRepo.findOne(
      { id: dataset.operation.id },
      { refresh: true },
    ))!
    // atualiza data
    await this.datasetRepo.persistAndFlush(operation)
  }

  async postLoad(data: { datasetId: number }) {
    const found = await this.datasetRepo.findOne({ id: data.datasetId })
    if (!found) throw error('NOT_FOUND', 'Dataset not found.')

    const extent = await this.datasetSvc.calculateExtent(found)
    found.extent = extent.join(' ')
    const operation = await found.operation.load()
    operation.progress = 1
    operation.state = OperationState.COMPLETED
    await this.datasetRepo.persistAndFlush(found)
  }

  async remove(data: { datasetId: number }) {
    const found = await this.datasetRepo.findOne({ id: data.datasetId })
    if (!found) throw error('NOT_FOUND', 'Dataset not found.')
    const store = await found.store.load()
    const inst = this.storeSvc.getStoreInstance(store)
    await inst
      .getQueryBuilder(this.em)
      .where({ datasetId: data.datasetId })
      .delete()
    await this.datasetRepo.removeAndFlush(found)
  }
}
