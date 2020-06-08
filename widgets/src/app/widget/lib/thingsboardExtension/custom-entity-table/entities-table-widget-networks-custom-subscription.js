/*
 * Copyright © 2020 ThingsBoard
 */
import './display-columns-panel.scss';
import './entities-table-widget.scss';

/* eslint-disable import/no-unresolved, import/default */

import entitiesTableWidgetTemplate from './entities-table-widget.tpl.html';
//import entityDetailsDialogTemplate from './entitiy-details-dialog.tpl.html';
import displayColumnsPanelTemplate from './display-columns-panel.tpl.html';

/* eslint-enable import/no-unresolved, import/default */

import tinycolor from 'tinycolor2';
import cssjs from '../../../../../vendor/css';

export default angular.module('thingsboardExtension.primatechEntityTableNetworksCustomSubscription', [])
    .directive('primatechEntityTableNetworksCustomSubscription', EntitiesTableWidgetNetworks)
    .name;

/*@ngInject*/
function EntitiesTableWidgetNetworks() {
    return {
        restrict: "E",
        scope: true,
        bindToController: {
            tableId: '=',
            ctx: '='
        },
        controller: EntitiesTableWidgetController,
        controllerAs: 'vm',
        template: entitiesTableWidgetTemplate
    };
}

/*@ngInject*/
function EntitiesTableWidgetController($element, $scope, $filter, $mdMedia, $mdPanel, $document, $translate, $timeout, utils, types, entityGroupService, userService) {
    var vm = this;

    vm.stylesInfo = {};
    vm.contentsInfo = {};
    vm.columnWidth = {};

    vm.showData = true;
    vm.hasData = false;

    vm.entities = [];
    vm.entitiesCount = 0;

    vm.datasources = null;
    vm.allEntities = null;

    vm.currentEntity = null;

    vm.displayEntityName = true;
    vm.entityNameColumnTitle = '';
    vm.displayEntityLabel = false;
    vm.entityLabelColumnTitle = '';
    vm.displayEntityType = true;
    vm.actionCellDescriptors = [];
    vm.displayPagination = true;
    vm.defaultPageSize = 10;
    vm.defaultSortOrder = "'entityName'";

    vm.query = {
        order: vm.defaultSortOrder,
        limit: vm.defaultPageSize,
        page: 1,
        search: null
    };

    vm.searchAction = {
        name: 'action.search',
        show: true,
        onAction: function() {
            vm.enterFilterMode();
        },
        icon: 'search'
    };

    let columnDisplayAction = {
        name: 'entity.columns-to-display',
        show: true,
        onAction: function($event) {
            vm.editColumnsToDisplay($event);
        },
        icon: 'view_column'
    };

    vm.enterFilterMode = enterFilterMode;
    vm.exitFilterMode = exitFilterMode;
    vm.onReorder = onReorder;
    vm.onPaginate = onPaginate;
    vm.onRowClick = onRowClick;
    vm.onActionButtonClick = onActionButtonClick;
    vm.isCurrent = isCurrent;

    vm.cellStyle = cellStyle;
    vm.cellContent = cellContent;

    vm.editColumnsToDisplay = editColumnsToDisplay;

    vm.subscriptionOptions = {
        callbacks: {
            onDataUpdated: onDataUpdated,
            onDataUpdateError: () => {vm.dataLoading = false},
            dataLoading: () => { }
        }
    };

    $scope.$watch('vm.ctx', function() {
        vm.dataLoading = true;
        if (vm.ctx) {
            vm.widgetConfig = vm.ctx.widgetConfig;
            vm.settings = vm.ctx.settings;
            // console.log('subscription2');//eslint-disable-line
            if(userService.getAuthority() === 'CUSTOMER_USER') {
                // console.log('subscription3');//eslint-disable-line
                userService.getUser(userService.getCurrentUser().userId).then((user) => {
                    // console.log('subscription4');//eslint-disable-line
                    entityGroupService.getEntityGroups('ASSET', true).then((assetGroups) => {
                        // console.log(entityViewGroups, 'subscription45');//eslint-disable-line
                        for (let assetGroup of assetGroups) {
                            if (assetGroup.name.startsWith(user.id.id)) {
                                entityGroupService.getEntityGroupEntities(assetGroup.id.id, {limit: 1000}).then((entities) => {
                                    // console.log(entities, 'subscription6');//eslint-disable-line
                                    let subscriptionsInfo = [];
                                    entities.data.forEach(entity => subscriptionsInfo.push(subscribeForValue(entity)));
                                    vm.ctx.subscriptionApi.createSubscriptionFromInfo (
                                        'latest', subscriptionsInfo, vm.subscriptionOptions, false, true).then(
                                        function(subscription) {
                                            vm.dataLoading = false;
                                            vm.subscription = subscription;
                                            // console.log(subscription , 'subscription');//eslint-disable-line
                                            vm.datasources = vm.subscription.datasources;
                                            initializeConfig();
                                            updateDatasources();
                                            updateEntitiesData(vm.subscription.data);
                                            updateEntities();
                                        }
                                    );
                                })
                            }
                        }
                    })
                })
            }
        }
    });

    function subscribeForValue(entity) {
        let subscriptionInfo = {
            type: 'entity',
            entityType: 'ASSET',
            entityId: entity.id.id
        };


        subscriptionInfo.attributes = [
            {
                name: 'gatewayAddress',
                label: 'Gateway Address'
            }
        ];

        subscriptionInfo.timeseries = [
            {
                name: 'deviceCount',
                label: 'Devices'
            },
            {
                name: 'activeDeviceCount',
                label: 'Active Devices'
            },
            {
                name: 'inactiveDeviceCount',
                label: 'Inactive Devices'
            }
        ];

        return subscriptionInfo;
    }

    function onDataUpdated(/*subscription, apply*/) {
        // console.log(subscription, 'subscription', apply, 'apply');//eslint-disable-line
        vm.dataLoading = false;
        updateEntitiesData(vm.subscription.data);
        updateEntities();
        $scope.$digest();
    }


    $scope.$watch("vm.query.search", function(newVal, prevVal) {
        if (!angular.equals(newVal, prevVal) && vm.query.search != null) {
            updateEntities();
        }
    });

    // $scope.$on('entities-table-data-updated', function(/*event, tableId*/) {
    //     console.log(1);//eslint-disable-line
    //     // if (vm.tableId == tableId) {
    //         console.log(2);//eslint-disable-line
    //         updateEntitiesData(vm.subscription.data);
    //         updateEntities();
    //         updateDatasources();
    //         $scope.$digest();
    //         // if (vm.subscription) {
    //         //     console.log(3);//eslint-disable-line
    //         //     if(vm.datasources && vm.datasources.length) {
    //         //         console.log(4);//eslint-disable-line
    //         //         updateEntitiesData(vm.subscription.data);
    //         //         updateEntities();
    //         //         updateDatasources();
    //         //         $scope.$digest();
    //         //     } else {
    //         //         console.log(5);//eslint-disable-line
    //         //         vm.allEntities = [];
    //         //         vm.datasources = [];
    //         //         updateEntitiesData([]);
    //         //         updateEntities();
    //         //         updateDatasources();
    //         //         $scope.$digest();
    //         //     }
    //         // }
    //     // }
    // });

    $scope.$watch(function() { return $mdMedia('gt-xs'); }, function(isGtXs) {
        vm.isGtXs = isGtXs;
    });

    $scope.$watch(function() { return $mdMedia('gt-md'); }, function(isGtMd) {
        vm.isGtMd = isGtMd;
        if (vm.isGtMd) {
            vm.limitOptions = [vm.defaultPageSize, vm.defaultPageSize*2, vm.defaultPageSize*3];
        } else {
            vm.limitOptions = null;
        }
    });

    function initializeConfig() {

        vm.ctx.widgetActions = [ vm.searchAction, columnDisplayAction ];

        vm.ctx.customDataExport = customDataExport;

        vm.actionCellDescriptors = vm.ctx.actionsApi.getActionDescriptors('actionCellButton');

        if (vm.settings.entitiesTitle && vm.settings.entitiesTitle.length) {
            vm.entitiesTitle = utils.customTranslation(vm.settings.entitiesTitle, vm.settings.entitiesTitle);
        } else {
            vm.entitiesTitle = $translate.instant('entity.entities');
        }

        vm.ctx.widgetTitle = vm.entitiesTitle;

        vm.searchAction.show = angular.isDefined(vm.settings.enableSearch) ? vm.settings.enableSearch : true;
        vm.displayEntityName = angular.isDefined(vm.settings.displayEntityName) ? vm.settings.displayEntityName : true;
        vm.displayEntityLabel = angular.isDefined(vm.settings.displayEntityLabel) ? vm.settings.displayEntityLabel : false;
        columnDisplayAction.show = angular.isDefined(vm.settings.enableSelectColumnDisplay) ? vm.settings.enableSelectColumnDisplay : true;

        if (vm.settings.entityNameColumnTitle && vm.settings.entityNameColumnTitle.length) {
            vm.entityNameColumnTitle = utils.customTranslation(vm.settings.entityNameColumnTitle, vm.settings.entityNameColumnTitle);
        } else {
            vm.entityNameColumnTitle = $translate.instant('entity.entity-name');
        }

        if (vm.settings.entityLabelColumnTitle && vm.settings.entityLabelColumnTitle.length) {
            vm.entityLabelColumnTitle = utils.customTranslation(vm.settings.entityLabelColumnTitle, vm.settings.entityLabelColumnTitle);
        } else {
            vm.entityLabelColumnTitle = $translate.instant('entity.entity-label');
        }

        vm.displayEntityType = angular.isDefined(vm.settings.displayEntityType) ? vm.settings.displayEntityType : true;
        vm.displayPagination = angular.isDefined(vm.settings.displayPagination) ? vm.settings.displayPagination : true;

        var pageSize = vm.settings.defaultPageSize;
        if (angular.isDefined(pageSize) && angular.isNumber(pageSize) && pageSize > 0) {
            vm.defaultPageSize = pageSize;
        }

        if (vm.settings.defaultSortOrder && vm.settings.defaultSortOrder.length) {
            vm.defaultSortOrder = vm.settings.defaultSortOrder;
            if (vm.settings.defaultSortOrder.charAt(0) === "-") {
                vm.defaultSortOrder = '-"' + utils.customTranslation(vm.settings.defaultSortOrder.substring(1), vm.settings.defaultSortOrder.substring(1)) + '"';
            } else {
                vm.defaultSortOrder = '"' + utils.customTranslation(vm.settings.defaultSortOrder, vm.settings.defaultSortOrder) + '"';
            }
        }

        vm.query.order = vm.defaultSortOrder;
        vm.query.limit = vm.defaultPageSize;
        if (vm.isGtMd) {
            vm.limitOptions = [vm.defaultPageSize, vm.defaultPageSize*2, vm.defaultPageSize*3];
        } else {
            vm.limitOptions = null;
        }

        var origColor = vm.widgetConfig.color || 'rgba(0, 0, 0, 0.87)';
        var defaultColor = tinycolor(origColor);
        var mdDark = defaultColor.setAlpha(0.87).toRgbString();
        var mdDarkSecondary = defaultColor.setAlpha(0.54).toRgbString();
        var mdDarkDisabled = defaultColor.setAlpha(0.26).toRgbString();
        //var mdDarkIcon = mdDarkSecondary;
        var mdDarkDivider = defaultColor.setAlpha(0.12).toRgbString();

        //md-icon.md-default-theme, md-icon {

        var cssString = 'table.md-table th.md-column {\n'+
            'color: ' + mdDarkSecondary + ';\n'+
            '}\n'+
            'table.md-table th.md-column.md-checkbox-column md-checkbox:not(.md-checked) .md-icon {\n'+
            'border-color: ' + mdDarkSecondary + ';\n'+
            '}\n'+
            'table.md-table th.md-column md-icon.md-sort-icon {\n'+
            'color: ' + mdDarkDisabled + ';\n'+
            '}\n'+
            'table.md-table th.md-column.md-active, table.md-table th.md-column.md-active md-icon {\n'+
            'color: ' + mdDark + ';\n'+
            '}\n'+
            'table.md-table td.md-cell {\n'+
            'color: ' + mdDark + ';\n'+
            'border-top: 1px '+mdDarkDivider+' solid;\n'+
            '}\n'+
            'table.md-table td.md-cell.md-checkbox-cell md-checkbox:not(.md-checked) .md-icon {\n'+
            'border-color: ' + mdDarkSecondary + ';\n'+
            '}\n'+
            'table.md-table td.md-cell.tb-action-cell button.md-icon-button md-icon {\n'+
            'color: ' + mdDarkSecondary + ';\n'+
            '}\n'+
            'table.md-table td.md-cell.md-placeholder {\n'+
            'color: ' + mdDarkDisabled + ';\n'+
            '}\n'+
            'table.md-table td.md-cell md-select > .md-select-value > span.md-select-icon {\n'+
            'color: ' + mdDarkSecondary + ';\n'+
            '}\n'+
            '.md-table-pagination {\n'+
            'color: ' + mdDarkSecondary + ';\n'+
            'border-top: 1px '+mdDarkDivider+' solid;\n'+
            '}\n'+
            '.md-table-pagination .buttons md-icon {\n'+
            'color: ' + mdDarkSecondary + ';\n'+
            '}\n'+
            '.md-table-pagination md-select:not([disabled]):focus .md-select-value {\n'+
            'color: ' + mdDarkSecondary + ';\n'+
            '}';

        var cssParser = new cssjs();
        cssParser.testMode = false;
        var namespace = 'entities-table-' + hashCode(cssString);
        cssParser.cssPreviewNamespace = namespace;
        cssParser.createStyleElement(namespace, cssString);
        $element.addClass(namespace);

        function hashCode(str) {
            var hash = 0;
            var i, char;
            if (str.length === 0) return hash;
            for (i = 0; i < str.length; i++) {
                char = str.charCodeAt(i);
                hash = ((hash << 5) - hash) + char;
                hash = hash & hash;
            }
            return hash;
        }
    }

    function enterFilterMode () {
        vm.query.search = '';
        vm.ctx.hideTitlePanel = true;
        $timeout(()=>{
            angular.element(vm.ctx.$container).find('.searchInput').focus();
        })
    }

    function exitFilterMode () {
        vm.query.search = null;
        updateEntities();
        vm.ctx.hideTitlePanel = false;
    }

    function onReorder () {
        updateEntities();
    }

    function onPaginate () {
        updateEntities();
    }

    function onRowClick($event, entity, isDouble) {
        if ($event) {
            $event.stopPropagation();
        }
        if (vm.currentEntity != entity) {
            vm.currentEntity = entity;
        }
        var actionSourceId = isDouble ? 'rowDoubleClick' : 'rowClick';
        var descriptors = vm.ctx.actionsApi.getActionDescriptors(actionSourceId);
        if (descriptors.length) {
            var entityId, entityName, entityLabel;
            if (vm.currentEntity) {
                entityId = vm.currentEntity.id;
                entityName = vm.currentEntity.entityName;
                entityLabel = vm.currentEntity.entityLabel;
            }
            vm.ctx.actionsApi.handleWidgetAction($event, descriptors[0], entityId, entityName, null, entityLabel);
        }
    }

    function onActionButtonClick($event, entity, actionDescriptor) {
        if ($event) {
            $event.stopPropagation();
        }
        var entityId, entityName, entityLabel;
        if (entity) {
            entityId = entity.id;
            entityName = entity.entityName;
            entityLabel = entity.entityLabel;
        }
        vm.ctx.actionsApi.handleWidgetAction($event, actionDescriptor, entityId, entityName, null, entityLabel);
    }

    function isCurrent(entity) {
        return (vm.currentEntity && entity && vm.currentEntity.id && entity.id) &&
            (vm.currentEntity.id.id === entity.id.id);
    }

    function updateEntities() {
        if(vm.allEntities) {
            var result = $filter('orderBy')(vm.allEntities, vm.query.order);
            if (vm.query.search != null) {
                result = $filter('filter')(result, {$: vm.query.search});
            }
            vm.entitiesCount = result.length;

            if (vm.displayPagination) {
                var startIndex = vm.query.limit * (vm.query.page - 1);
                vm.entities = result.slice(startIndex, startIndex + vm.query.limit);
            } else {
                vm.entities = result;
            }
        }
    }

    function cellStyle(entity, key) {
        var style = {};
        if (entity && key) {
            var styleInfo = vm.stylesInfo[key.label];
            var value = getEntityValue(entity, key);
            if (styleInfo.useCellStyleFunction && styleInfo.cellStyleFunction) {
                try {
                    style = styleInfo.cellStyleFunction(value);
                } catch (e) {
                    style = {};
                }
            } else {
                style = defaultStyle(key, value);
            }
        }
        if (!style.width) {
            var columnWidth = vm.columnWidth[key.label];
            if(columnWidth !== "0px") {
                style.width = columnWidth;
            } else {
                style.width = "auto";
            }
        }
        return style;
    }

    function cellContent(entity, key) {
        var strContent = '';
        // console.log(entity, key, '1');//eslint-disable-line
        if (entity && key) {
            var contentInfo = vm.contentsInfo[key.label];
            var value = getEntityValue(entity, key);
            // console.log(value, contentInfo,'value contentInfo');//eslint-disable-line
            if (contentInfo.useCellContentFunction && contentInfo.cellContentFunction) {
                if (angular.isDefined(value)) {
                    strContent = '' + value;
                }
                var content = strContent;
                try {
                    content = contentInfo.cellContentFunction(value, entity, $filter);
                } catch (e) {
                    content = strContent;
                }
            } else {
                var decimals = (contentInfo.decimals || contentInfo.decimals === 0) ? contentInfo.decimals : vm.widgetConfig.decimals;
                var units = contentInfo.units || vm.widgetConfig.units;
                content = vm.ctx.utils.formatValue(value, decimals, units, true);
                content = content === null ? 0 : content;
                // console.log(decimals, units, content, 'decimals, units, content');//eslint-disable-line
            }
            return content;
        } else {
            return strContent;
        }
    }

    function defaultStyle(/*key, value*/) {
        return {};
    }

    const getDescendantProp = (obj, path) => (
        path.split('.').reduce((acc, part) => acc && acc[part], obj)
    );

    function getEntityValue(entity, key) {
        return getDescendantProp(entity, key.label);
    }

    function customDataExport() {
        var exportedData = [];
        var entitiesToExport = $filter('orderBy')(vm.allEntities, vm.query.order);
        if (vm.query.search != null) {
            entitiesToExport = $filter('filter')(entitiesToExport, {$: vm.query.search});
        }
        if (!entitiesToExport || !entitiesToExport.length) {
            entitiesToExport = [{}];
        }
        for (var row=0; row < entitiesToExport.length; row ++) {
            var dataObj = {};
            var entity = entitiesToExport[row];
            for (var col=0; col < vm.columns.length; col ++) {
                var column = vm.columns[col];
                if (column.display) {
                    dataObj[column.title] = cellContent(entity, column);
                }
            }
            exportedData.push(dataObj);
        }
        return exportedData;
    }

    function updateEntitiesData(data) {
        if (vm.allEntities) {
            for (var i=0;i<vm.allEntities.length;i++) {
                var entity = vm.allEntities[i];
                for (var a=0;a<vm.dataKeys.length;a++) {
                    var dataKey = vm.dataKeys[a];
                    var index = i * vm.dataKeys.length + a;
                    var keyData = data[index].data;
                    if (keyData && keyData.length && keyData[0].length > 1) {
                        var value = keyData[0][1];
                        entity[dataKey.label] = value;
                    } else {
                        entity[dataKey.label] = '';
                    }
                }
            }
        }
    }

    function editColumnsToDisplay($event) {
        var element = angular.element($event.target);
        var position = $mdPanel.newPanelPosition()
            .relativeTo(element)
            .addPanelPosition($mdPanel.xPosition.ALIGN_END, $mdPanel.yPosition.BELOW);
        var config = {
            attachTo: angular.element($document[0].body),
            controller: DisplayColumnsPanelController,
            controllerAs: 'vm',
            template: displayColumnsPanelTemplate,
            panelClass: 'tb-display-columns-panel',
            position: position,
            fullscreen: false,
            locals: {
                'columns': vm.columns
            },
            openFrom: $event,
            clickOutsideToClose: true,
            escapeToClose: true,
            focusOnOpen: false
        };
        $mdPanel.open(config);
    }

    function updateDatasources() {

        vm.stylesInfo = {};
        vm.contentsInfo = {};
        vm.columnWidth = {};
        vm.dataKeys = [];
        vm.columns = [];
        vm.allEntities = [];

        var datasource;
        var dataKey;

        datasource = vm.datasources[0];

        vm.ctx.widgetTitle = utils.createLabelFromDatasource(datasource, vm.entitiesTitle);

        if (vm.displayEntityName) {
            vm.columns.push(
                {
                    name: 'entityName',
                    label: 'entityName',
                    title: vm.entityNameColumnTitle,
                    display: true
                }
            );
            vm.contentsInfo['entityName'] = {
                useCellContentFunction: false
            };
            vm.stylesInfo['entityName'] = {
                useCellStyleFunction: false
            };
            vm.columnWidth['entityName'] = '0px';
        }

        if (vm.displayEntityLabel) {
            vm.columns.push(
                {
                    name: 'entityLabel',
                    label: 'entityLabel',
                    title: vm.entityLabelColumnTitle,
                    display: true
                }
            );
            vm.contentsInfo['entityLabel'] = {
                useCellContentFunction: false
            };
            vm.stylesInfo['entityLabel'] = {
                useCellStyleFunction: false
            };
            vm.columnWidth['entityLabel'] = '0px';
        }

        if (vm.displayEntityType) {
            vm.columns.push(
                {
                    name: 'entityType',
                    label: 'entityType',
                    title: $translate.instant('entity.entity-type'),
                    display: true
                }
            );
            vm.contentsInfo['entityType'] = {
                useCellContentFunction: false
            };
            vm.stylesInfo['entityType'] = {
                useCellStyleFunction: false
            };
            vm.columnWidth['entityType'] = '0px';
        }

        for (var d = 0; d < datasource.dataKeys.length; d++ ) {
            dataKey = angular.copy(datasource.dataKeys[d]);
            if (dataKey.type == types.dataKeyType.function) {
                dataKey.name = dataKey.label;
            }
            vm.dataKeys.push(dataKey);

            dataKey.title = utils.customTranslation(dataKey.label, dataKey.label);

            var keySettings = dataKey.settings;

            var cellStyleFunction = null;
            var useCellStyleFunction = false;

            if (keySettings.useCellStyleFunction === true) {
                if (angular.isDefined(keySettings.cellStyleFunction) && keySettings.cellStyleFunction.length > 0) {
                    try {
                        cellStyleFunction = new Function('value', keySettings.cellStyleFunction);
                        useCellStyleFunction = true;
                    } catch (e) {
                        cellStyleFunction = null;
                        useCellStyleFunction = false;
                    }
                }
            }

            vm.stylesInfo[dataKey.label] = {
                useCellStyleFunction: useCellStyleFunction,
                cellStyleFunction: cellStyleFunction
            };

            var cellContentFunction = null;
            var useCellContentFunction = false;

            if (keySettings.useCellContentFunction === true) {
                if (angular.isDefined(keySettings.cellContentFunction) && keySettings.cellContentFunction.length > 0) {
                    try {
                        cellContentFunction = new Function('value, entity, filter', keySettings.cellContentFunction);
                        useCellContentFunction = true;
                    } catch (e) {
                        cellContentFunction = null;
                        useCellContentFunction = false;
                    }
                }
            }

            vm.contentsInfo[dataKey.label] = {
                useCellContentFunction: useCellContentFunction,
                cellContentFunction: cellContentFunction,
                units: dataKey.units,
                decimals: dataKey.decimals
            };

            var columnWidth = angular.isDefined(keySettings.columnWidth) ? keySettings.columnWidth : '0px';
            vm.columnWidth[dataKey.label] = columnWidth;

            dataKey.display = true;
            vm.columns.push(dataKey);
        }

        for (var i=0;i<vm.datasources.length;i++) {
            datasource = vm.datasources[i];
            if (datasource.type == types.datasourceType.entity && !datasource.entityId) {
                continue;
            }
            var entity = {
                id: {}
            };
            entity.entityName = datasource.entityName;
            if (datasource.entityLabel) {
                entity.entityLabel = datasource.entityLabel;
            } else {
                entity.entityLabel = datasource.entityName;
            }
            if (datasource.entityId) {
                entity.id.id = datasource.entityId;
            }
            if (datasource.entityType) {
                entity.id.entityType = datasource.entityType;
                entity.entityType = $translate.instant(types.entityTypeTranslations[datasource.entityType].type) + '';
            } else {
                entity.entityType = '';
            }
            for (d = 0; d < vm.dataKeys.length; d++) {
                dataKey = vm.dataKeys[d];
                entity[dataKey.label] = '';
            }
            vm.allEntities.push(entity);
        }

    }

}

/*@ngInject*/
function DisplayColumnsPanelController(columns) {  //eslint-disable-line

    var vm = this;
    vm.columns = columns;
}
