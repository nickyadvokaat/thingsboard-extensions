/*
 * Copyright © 2020 ThingsBoard
 */
import thingsboardExtensionTypes from './thingsboard-extension-types.constant';
import thingsboardExtensionConfig from './thingsboard-extension-config';
import primatechEntityTableNetworks from './custom-entity-table/entities-table-widget-networks';
import primatechEntityTableEntityViews from './custom-entity-table/entities-table-widget-entity-views';

export default angular.module('thingsboardExtension', [
        thingsboardExtensionTypes,
        primatechEntityTableNetworks,
        primatechEntityTableEntityViews
    ])
    .config(thingsboardExtensionConfig)
    .name;
