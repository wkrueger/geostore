import { Injectable } from '@nestjs/common';
import { Store } from '../_orm/StoreEntity';
import { Mapfile } from '../_orm/MapfileEntity';
import { InjectRepository } from 'nestjs-mikro-orm';
import { EntityRepository } from 'mikro-orm';

@Injectable()
export class MapfileService {
  constructor(
    @InjectRepository(Mapfile) private mapfileRepo: EntityRepository<Mapfile>,
  ) {}

  generateMapfile(store: Store) {}
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
