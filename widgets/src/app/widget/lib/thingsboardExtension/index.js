/*
 * Copyright © 2020 ThingsBoard
 */
import thingsboardExtensionTypes from './thingsboard-extension-types.constant';
import thingsboardExtensionConfig from './thingsboard-extension-config';
import schedulerEvents from './scheduler/scheduler-events.directive'

export default angular.module('thingsboardExtension', [
        thingsboardExtensionTypes,
        schedulerEvents
    ])
    .config(thingsboardExtensionConfig)
    .name;
