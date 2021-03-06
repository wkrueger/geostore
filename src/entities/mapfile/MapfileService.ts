import { Injectable } from '@nestjs/common';
import handlebars from 'handlebars';
import { EntityManager, EntityRepository, wrap } from 'mikro-orm';
import { InjectRepository } from 'nestjs-mikro-orm';
import { getContext } from '../../contexts/getContext';
import { error } from '../../_other/error';
import { Dataset } from '../_orm/DatasetEntity';
import { MapfileLayer } from '../_orm/LayerEntity';
import { Mapfile } from '../_orm/MapfileEntity';
import { Store } from '../_orm/StoreEntity';
import { CreateMapfileDto } from './MapfileDto';
import { ApiTags } from '@nestjs/swagger';
import fs from 'fs';
import { promisify } from 'util';
import { StoreService } from '../store/StoreService';

@ApiTags('mapfiles')
@Injectable()
export class MapfileService {
  constructor(
    @InjectRepository(Mapfile) private mapfileRepo: EntityRepository<Mapfile>,
    private em: EntityManager,
    private storeSvc: StoreService,
  ) {}

  compiledTemplate = handlebars.compile(defaultTemplate);

  async getLayerDataset(layer: MapfileLayer) {
    const ds = await layer.dataset?.load();
    if (ds) return ds;
    if (!layer.store) throw error('INVALID_LAYER', 'Layer requires either a store or dataset.');
    const ds2 = this.storeSvc.getLatestDataset(await layer.store.load());
    return ds2;
  }

  async create(inp: CreateMapfileDto, toCreate = this.mapfileRepo.create({})) {
    const layers: MapfileLayer[] = await Promise.all(
      inp.layers.map(async dto => {
        if (!dto.code || !dto.label) {
          const dataset = await this.em.getRepository(Dataset).findOne({ id: dto.dataset })!;
          const store = await dataset?.store.load();
          if (!dto.code) {
            dto.code = store?.code;
          }
          if (!dto.label) {
            dto.label = store?.label;
          }
        }
        return wrap(new MapfileLayer()).assign({ ...dto, mapfile: toCreate.id }, { em: this.em });
      }),
    );
    wrap(toCreate).assign({ ...inp, layers }, { em: this.em });
    if (toCreate.id) {
      await toCreate.layers.init();
    }
    toCreate.layers.set(layers);
    await this.mapfileRepo.persistAndFlush(toCreate);
    return toCreate;
  }

  async list(filters: { id?: number }) {
    return this.mapfileRepo.find(filters, { populate: ['layers'] });
  }

  async render(mapfile: Mapfile) {
    await mapfile.layers.init(['dataset', 'dataset.store']);
    if (!mapfile.layers.length) throw error('NO_LAYERS', 'No layers on mapfile.');
    let pairs = await Promise.all(
      mapfile.layers.getItems().map(async layer => {
        const dataset: Dataset = (await this.getLayerDataset(layer)) as any;
        return { layer, dataset };
      }),
    );
    pairs = pairs.filter(x => Boolean(x.dataset));
    if (!pairs) throw error('NO_VALID_DATASET', 'No valid dataset.');
    const extents = pairs.map(pair => pair.dataset.extent).filter(Boolean);
    const extent = this._mergeExtents(
      extents.map(x =>
        String(x)
          .split(' ')
          .map(Number),
      ),
    ).join(' ');
    const projectionCode =
      pairs[0].dataset.store.getProperty('projectionCode') || Store.DEFAULT_PROJECTION_CODE;

    const mapped: MapfileTemplate = {
      label: mapfile.label,
      extent: this._formatExtent(extent),
      projectionCode,
      layers: await Promise.all(
        pairs.map(async pair => {
          const layer = pair.layer;
          return {
            code: layer.code,
            extent: this._formatExtent(pair.dataset.extent),
            connection: this._getConnection(),
            query: await this._getQuery(pair.dataset),
            label: layer.label,
            projection: pair.dataset.store.getProperty('projectionCode'),
            classes: layer.classes,
          };
        }),
      ),
    };

    const merged = this._getTemplate(mapfile)(mapped);
    await this.persist(mapfile, merged);
    return merged;
  }

  async persist(mapfile: Mapfile, content: string) {
    const code = String(mapfile.id);
    const path = getContext().pathFromRoot('mapfiles', code + '.map');
    await promisify(fs.writeFile)(path, content);
  }

  _formatExtent(extent: string = '') {
    return extent
      .split(' ')
      .map(Number)
      .map(x => x.toFixed(2))
      .join(' ');
  }

  _getTemplate(mapfile: Mapfile) {
    if (mapfile.customTemplate) {
      return handlebars.compile(mapfile.customTemplate);
    }
    return this.compiledTemplate;
  }

  _mergeExtents(extents: number[][]) {
    let out = [] as number[];
    out[0] = Math.min(...extents.map(x => x[0]));
    out[1] = Math.min(...extents.map(x => x[1]));
    out[2] = Math.max(...extents.map(x => x[2]));
    out[3] = Math.max(...extents.map(x => x[3]));
    return out;
  }

  async _getQuery(dataset: Dataset) {
    const store = await dataset.store.load();
    return `geometry from instance_${store.code} USING srid=4326 USING unique id`;
  }

  _getConnection() {
    const ctx = getContext();
    return `host=geostore-postgres port=${ctx.db.port} dbname=${ctx.db.database} user=${ctx.db.user} password=${ctx.db.password}`;
  }
}

interface MapfileTemplate {
  label;
  extent;
  projectionCode;
  layers: {
    code;
    extent;
    connection;
    query;
    label;
    projection;
    classes;
  }[];

  //helpers
}

const defaultTemplate = `MAP

  NAME "{{ label }}"
  EXTENT {{ extent }}

  PROJECTION
    "init={{ projectionCode }}"
  END

  OUTPUTFORMAT
    NAME 'geojson'
    DRIVER 'OGR/GEOJSON'
    MIMETYPE 'application/json; subtype=geojson'
    FORMATOPTION 'STORAGE=stream'
    FORMATOPTION 'FORM=SIMPLE'
  END

  WEB
    QUERYFORMAT "geojson"
    METADATA
      "wms_title" "{{ label }}"
      "wms_srs" "EPSG:3857 EPSG:4326"
      "wms_enable_request" "*"
      "wms_getmap_formatlist" "image/png"
      "wms_feature_info_mime_type" "application/json; subtype=geojson;"
    END
  END

  {{#each layers}}

  LAYER
    NAME '{{ code }}'
    TYPE POLYGON
    TEMPLATE 'OpenLayers3'
    EXTENT {{ extent }}
    CONNECTIONTYPE POSTGIS
    CONNECTION "{{{ connection }}}"
    DATA '{{{ query }}}'
    METADATA
      'wms_title' '{{ label }}'
      'wms_enable_request' '*'
      'wms_include_items' 'all'
      'gml_include_items' 'all'
      'gml_types' 'auto'
    END
    PROJECTION
      'init={{ projection }}'
    END

{{{ classes }}}

  END

  {{/each}}

END
`;
