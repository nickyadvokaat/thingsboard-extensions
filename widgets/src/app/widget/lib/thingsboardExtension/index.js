/*
 * Copyright © 2020 ThingsBoard
 */
import thingsboardExtensionTypes from './thingsboard-extension-types.constant';
import thingsboardExtensionConfig from './thingsboard-extension-config';
import primatechEntityTableNetworks from './custom-entity-table/entities-table-widget-networks';
import primatechEntityTableEntityViews from './custom-entity-table/entities-table-widget-entity-views';
import primatechEntityTableNetworksForCompUser from './custom-entity-table/entities-table-widget-networks-for-comp-user';
import primatechEntityTableNetworksCustomSubscription from './custom-entity-table/entities-table-widget-networks-custom-subscription';

export default angular.module('thingsboardExtension', [
        thingsboardExtensionTypes,
        primatechEntityTableNetworks,
        primatechEntityTableEntityViews,
        primatechEntityTableNetworksForCompUser,
        primatechEntityTableNetworksCustomSubscription
    ])
    .config(thingsboardExtensionConfig)
    .name;
