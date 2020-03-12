/*
 * Copyright © 2020 ThingsBoard
 */
import thingsboardExtensionTypes from './thingsboard-extension-types.constant';
import thingsboardExtensionConfig from './thingsboard-extension-config';
import primatechEntityTable from './custom-entity-table/entities-table-widget';

export default angular.module('thingsboardExtension', [
        thingsboardExtensionTypes,
        primatechEntityTable
    ])
    .config(thingsboardExtensionConfig)
    .name;
