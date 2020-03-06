import { Injectable, Inject } from '@nestjs/common';
import { Mapfile } from '../_orm/MapfileEntity';
import { InjectRepository } from 'nestjs-mikro-orm';
import { EntityRepository } from 'mikro-orm';
import handlebars from 'handlebars';
import { error } from 'src/_other/error';
import { Store } from '../_orm/StoreEntity';
import { Layer } from '../_orm/LayerEntity';
import { StoreService } from '../store/StoreService';
import { getContext } from 'src/contexts/getContext';

@Injectable()
export class MapfileService {
  constructor(
    @InjectRepository(Mapfile) private mapfileRepo: EntityRepository<Mapfile>,
    @InjectRepository(Store) private storeSvc: StoreService,
  ) {}

  compiledTemplate = handlebars.compile(defaultTemplate);

  mergeExtents(extents: number[][]) {
    let out = [] as number[];
    out[0] = Math.min(...extents.map(x => x[0]));
    out[1] = Math.min(...extents.map(x => x[1]));
    out[2] = Math.max(...extents.map(x => x[2]));
    out[3] = Math.max(...extents.map(x => x[3]));
    return out;
  }

  getQuery(layer: Layer) {
    const inst = this.storeSvc.getStoreInstance(layer.dataset.store);
    return `geometry from ${inst.store} USING srid=4326 USING unique id`;
  }

  getConnection() {
    const ctx = getContext();
    return `host=${ctx.db.host} port=${ctx.db.port} dbname=${ctx.db.database} user=${ctx.db.user} password=${ctx.db.password}`;
  }

  async generateMapfile(mapfile: Mapfile) {
    if (!mapfile.layers.length) throw error('NO_LAYERS', 'No layers on mapfile.');

    await this.mapfileRepo.populate(mapfile, ['layers']);
    const extents = mapfile.layers.map(layer => layer.dataset.extent!).filter(Boolean);
    const extent = this.mergeExtents(extents.map(x => x.split(' ').map(Number))).join(' ');
    const projectionCode =
      mapfile.layers[0].dataset.store.projectionCode || Store.DEFAULT_PROJECTION_CODE;

    const mapped: MapfileTemplate = {
      label: mapfile.label,
      extent,
      projectionCode,
      layers: mapfile.layers.map(layer => {
        return {
          code: layer.code,
          extent: layer.dataset.extent,
          connection: this.getConnection(),
          query: this.getQuery(layer),
          label: layer.label,
          projection: layer.dataset.store.projectionCode!,
          classes: layer.classes,
        };
      }),
    };
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

const defaultTemplate = `
MAP

  NAME {{ label }}
  EXTENT {{ extent }}

  PROJECTION
  "init={{ projectionCode }}
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
      "wms_srs" "{{ projectionCode }}"
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
    CONNECTION "{{ connection }}"
    DATA '{{ query }}"
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