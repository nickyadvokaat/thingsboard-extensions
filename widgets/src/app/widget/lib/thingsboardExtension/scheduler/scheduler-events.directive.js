/*
 * Copyright © 2020 ThingsBoard
 */
/* eslint-disable import/no-unresolved, import/default */

import schedulerEventsTemplate from './scheduler-events.tpl.html';
import schedulerEventTemplate from './scheduler-event-dialog.tpl.html';
// import schedulerEventsTitleTemplate from './scheduler-events-title.tpl.html';

/* eslint-enable import/no-unresolved, import/default */

import SchedulerEventController from './scheduler-event-dialog.controller';

/*@ngInject*/
export default angular.module('eyeControl.schedulerEvents', [])
    .directive('customSchedulerEvents', SchedulerEvents)
    .name;

function SchedulerEvents() {
    return {
        restrict: "E",
        scope: true,
        bindToController: {
            widgetMode: '=',
            ctx: '='
        },
        controller: SchedulerEventsController,
        controllerAs: 'vm',
        template: schedulerEventsTemplate
    };
}

/*@ngInject*/
function SchedulerEventsController($scope, $element, $compile, $q, $mdDialog, $mdUtil, $mdMedia, $document, $window, $translate, $filter, $timeout,
                                   uiCalendarConfig, utils, types, securityTypes, userPermissionsService, userService, schedulerEventService) {

    let vm = this;

    vm.editEnabled = userPermissionsService.hasGenericPermission(securityTypes.resource.schedulerEvent, securityTypes.operation.write);
    vm.addEnabled = userPermissionsService.hasGenericPermission(securityTypes.resource.schedulerEvent, securityTypes.operation.create);
    vm.deleteEnabled = userPermissionsService.hasGenericPermission(securityTypes.resource.schedulerEvent, securityTypes.operation.delete);

    vm.showData = (userService.getAuthority() === 'TENANT_ADMIN' || userService.getAuthority() === 'CUSTOMER_USER') &&
        userPermissionsService.hasGenericPermission(securityTypes.resource.schedulerEvent, securityTypes.operation.read);

    vm.mode = 'list';
    vm.currentCalendarView = 'month';
    vm.calendarId = 'eventScheduleCalendar-' + utils.guid();

    vm.types = types;

    vm.schedulerEvents = [];
    vm.schedulerEventsCount = 0;
    vm.allSchedulerEvents = [];
    vm.selectedSchedulerEvents = [];

    vm.displayCreatedTime = true;
    vm.displayType = true;
    vm.displayCustomer = true;//userService.getAuthority() === 'TENANT_ADMIN' ? true : false;

    vm.displayPagination = true;
    vm.defaultPageSize = 10;
    vm.defaultSortOrder = 'createdTime';

    vm.defaultEventType = null;
    vm.devideId = null;

    vm.query = {
        order: vm.defaultSortOrder,
        limit: vm.defaultPageSize,
        page: 1,
        search: null
    };

    vm.calendarConfig = {
        height: 'parent',
        editable: vm.editEnabled,
        eventDurationEditable: false,
        allDaySlot: false,
        header: false,
        timezone: 'UTC',
        eventClick: onEventClick,
        dayClick: onDayClick,
        eventDrop: onEventDrop,
        eventRender: eventRender
    };

    vm.calendarEventSources = [ eventSourceFunction ];

    vm.changeCalendarView = changeCalendarView;
    vm.calendarViewTitle = calendarViewTitle;
    vm.gotoCalendarToday = gotoCalendarToday;
    vm.isCalendarToday = isCalendarToday;
    vm.gotoCalendarPrev = gotoCalendarPrev;
    vm.gotoCalendarNext = gotoCalendarNext;

    vm.enterFilterMode = enterFilterMode;
    vm.exitFilterMode = exitFilterMode;
    vm.onReorder = onReorder;
    vm.onPaginate = onPaginate;
    vm.addSchedulerEvent = addSchedulerEvent;
    vm.editSchedulerEvent = editSchedulerEvent;
    vm.viewSchedulerEvent = viewSchedulerEvent;
    vm.deleteSchedulerEvent = deleteSchedulerEvent;
    vm.deleteSchedulerEvents = deleteSchedulerEvents;
    vm.reloadSchedulerEvents = reloadSchedulerEvents;
    vm.updateSchedulerEvents = updateSchedulerEvents;
    vm.loadEvents = loadEvents;

    $scope.$watch("vm.query.search", function(newVal, prevVal) {
        if (!angular.equals(newVal, prevVal) && vm.query.search != null) {
            updateSchedulerEvents();
        }
    });

    $scope.$watch("vm.mode", function(newVal, prevVal) {
        if (!angular.equals(newVal, prevVal)) {
            if (vm.mode == 'calendar') {
                vm.selectedSchedulerEvents = [];
            }
            $mdUtil.nextTick(() => {
                var w = angular.element($window);
                w.triggerHandler('resize');
            });
        }
    });

    $scope.$watch(function() { return $mdMedia('gt-xs'); }, function(isGtXs) {
        vm.isGtXs = isGtXs;
    });

    $scope.$watch(function() { return $mdMedia('gt-md'); }, function(isGtMd) {
        vm.isGtMd = isGtMd;
        if (vm.isGtMd) {
            vm.limitOptions = [vm.defaultPageSize, vm.defaultPageSize * 2, vm.defaultPageSize * 3];
        } else {
            vm.limitOptions = null;
        }
    });

    vm.configTypes = {};

    if (vm.showData) {
        if (vm.widgetMode) {
            $scope.$watch('vm.ctx', function() {
                if (vm.ctx) {
                    vm.settings = vm.ctx.settings;
                    initializeWidgetConfig();
                    reloadSchedulerEvents();
                }
            });
        } else {         
            vm.configTypesList = types.schedulerEventConfigTypes;
            vm.configTypesList.forEach((configType) => {
                vm.configTypes[configType.value] = configType;
            });
            reloadSchedulerEvents();
        }
        $timeout(() => {
            var w = angular.element($window);
            w.triggerHandler('resize');
        }, 100);
    }

    function initializeWidgetConfig() {      
        // vm.ctx.widgetConfig.showTitle = true;
        vm.ctx.currentSchedulerMode = 'list';
        vm.ctx.widgetTitle = vm.ctx.settings.title;

        vm.displayCreatedTime = angular.isDefined(vm.settings.displayCreatedTime) ? vm.settings.displayCreatedTime : true;
        vm.displayType = angular.isDefined(vm.settings.displayType) ? vm.settings.displayType : true;
        vm.displayCustomer = angular.isDefined(vm.settings.displayCustomer) ? vm.settings.displayCustomer : true;

        vm.displayPagination = angular.isDefined(vm.settings.displayPagination) ? vm.settings.displayPagination : true;

        var pageSize = vm.settings.defaultPageSize;
        if (angular.isDefined(pageSize) && angular.isNumber(pageSize) && pageSize > 0) {
            vm.defaultPageSize = pageSize;
        }

        if (vm.settings.defaultSortOrder && vm.settings.defaultSortOrder.length) {
            vm.defaultSortOrder = vm.settings.defaultSortOrder;
        }

        if (vm.settings.forceDefaultEventType && vm.settings.forceDefaultEventType.length) {
            vm.defaultEventType = vm.settings.forceDefaultEventType;
        }
        var widgetConfigTypes;
        if (vm.settings.customEventTypes && vm.settings.customEventTypes.length) {
            widgetConfigTypes = vm.settings.customEventTypes;
        } else {
            widgetConfigTypes = [];
        }       
        vm.configTypesList = widgetConfigTypes ? widgetConfigTypes : types.schedulerEventConfigTypes.concat(widgetConfigTypes);
        vm.configTypesList.forEach((configType) => {
            vm.configTypes[configType.value] = configType;
        });

        vm.query.order = vm.defaultSortOrder;
        vm.query.limit = vm.defaultPageSize;
        if (vm.isGtMd) {
            vm.limitOptions = [vm.defaultPageSize, vm.defaultPageSize * 2, vm.defaultPageSize * 3];
        } else {
            vm.limitOptions = null;
        }

        if (vm.settings.enabledViews != 'both') {
            vm.ctx.currentSchedulerMode = vm.settings.enabledViews;
            vm.mode = vm.settings.enabledViews;
        }

        $scope.$watch('vm.ctx.currentSchedulerMode', function() {
            vm.mode = vm.ctx.currentSchedulerMode;
        });
        $scope.$watch('vm.selectedSchedulerEvents.length', function(newVal) {
            if (newVal) {
                vm.ctx.hideTitlePanel = true;
            } else {
                vm.ctx.hideTitlePanel = false;
            }
        });
        $scope.$on('scheduler-events-resize', function() {
            if (vm.mode === 'calendar') {
                var w = angular.element($window);
                w.triggerHandler('resize');
            }
        });
        vm.ctx.widgetActions = [
            {
                name: 'scheduler.add-scheduler-event',
                show: true,
                onAction: function(event) {
                    vm.addSchedulerEvent(event);
                },
                icon: 'add'
            },
            {
                name: 'action.search',
                show: true,
                onAction: function(event) {
                    vm.enterFilterMode(event);
                },
                icon: 'search'
            },
            {
                name: 'action.refresh',
                show: true,
                onAction: function() {
                    vm.reloadSchedulerEvents();
                },
                icon: 'refresh'
            }
        ];
    }

    function onEventClick(event, $event) {
        var result = $filter('filter')(vm.schedulerEvents, {id: {id: event.id}}, true);
        if (result && result.length) {
            var parent = angular.element('#tb-event-schedule-calendar-context-menu', $element);
            var $mdOpenMousepointMenu = parent.scope().$mdOpenMousepointMenu;
            openSchedulerEventContextMenu($event, result[0], $mdOpenMousepointMenu);
        }
    }

    function openSchedulerEventContextMenu($event, schedulerEvent, $mdOpenMousepointMenu) {
        vm.contextMenuEvent = $event;
        vm.contextMenuSchedulerEvent = schedulerEvent;
        $mdOpenMousepointMenu($event);
    }

    function onDayClick(date, $event/*, view*/) {
        if (vm.addEnabled) {
            var schedulerEvent = {
                schedule: {
                    startTime: date.utc().valueOf()
                },
                configuration: {}
            };
            openSchedulerEventDialog($event, schedulerEvent);
        }
    }

    function onEventDrop(event, delta, revertFunc/*, $event*/) {
        var result = $filter('filter')(vm.schedulerEvents, {id: {id: event.id}}, true);
        if (result && result.length) {
            var origEvent = result[0];
            moveEvent(origEvent, delta, revertFunc);
        }
    }

    function moveEvent(schedulerEvent, delta, revertFunc) {
        schedulerEventService.getSchedulerEvent(schedulerEvent.id.id).then(
            (schedulerEvent) => {
                schedulerEvent.schedule.startTime += delta.asMilliseconds();
                schedulerEventService.saveSchedulerEvent(schedulerEvent).then(
                    () => {
                        reloadSchedulerEvents();
                    },
                    () => {
                        revertFunc();
                    }
                );
            },
            () => {
                revertFunc();
            }
        );
    }

    function eventRender(event, element/*, view*/) {
        if (event.htmlTitle) {
            if(element.find('.fc-title').length > 0) {
                element.find('.fc-title')[0].innerHTML = event.htmlTitle;
            }
            if(element.find('.fc-list-item-title').length > 0) {
                element.find('.fc-list-item-title')[0].innerHTML = event.htmlTitle;
            }
        }
        element.tooltipster(
            {
                theme: 'tooltipster-shadow',
                delay: 100,
                trigger: 'hover',
                triggerOpen: {
                    click: false,
                    tap: false
                },
                triggerClose: {
                    click: true,
                    tap: true,
                    scroll: true
                },
                side: 'top',
                trackOrigin: true
            }
        );
        var tooltip = element.tooltipster('instance');
        tooltip.content(angular.element(
            '<div class="tb-scheduler-tooltip-content"><b>' + $translate.instant('scheduler.event-type') + ':</b> ' + event.type + '</div>' +
            '<div class="tb-scheduler-tooltip-content">' + event.info + '</div>'
        ));

    }

    var schedulerTimeUnitRepeatTranslation = {
        'HOURS': 'scheduler.every-hour',
        'MINUTES': 'scheduler.every-minute',
        'SECONDS': 'scheduler.every-second'
    };

    function eventSourceFunction(start, end, timezone, callback) {
        var events = [];
        if (vm.schedulerEvents && vm.schedulerEvents.length) {
            var userZone = moment.tz.zone(moment.tz.guess()); //eslint-disable-line
            var rangeStart = start.local();
            var rangeEnd = end.local();
            vm.schedulerEvents.forEach((event) => {
                var startOffset = userZone.utcOffset(event.schedule.startTime) * 60 * 1000;
                var eventStart = moment(event.schedule.startTime - startOffset); //eslint-disable-line
                var calendarEvent;
                if (rangeEnd.isSameOrAfter(eventStart)) {
                    if (event.schedule.repeat) {
                        var endOffset = userZone.utcOffset(event.schedule.repeat.endsOn) * 60 * 1000;
                        var repeatEndsOn = moment(event.schedule.repeat.endsOn - endOffset); //eslint-disable-line
                        if (event.schedule.repeat.type === types.schedulerRepeat.timer.value) {
                            calendarEvent = toCalendarEvent(event, eventStart, repeatEndsOn);
                            events.push(calendarEvent);
                        } else {
                            var currentTime;
                            var eventStartOffsetUnits = 0;
                            if (rangeStart.isSameOrBefore(eventStart)) {
                                currentTime = eventStart.clone();
                            } else {
                                switch (event.schedule.repeat.type) {
                                    case types.schedulerRepeat.yearly.value:
                                    case types.schedulerRepeat.monthly.value:
                                        eventStartOffsetUnits = moment.duration(rangeStart.diff(eventStart));//eslint-disable-line
                                        eventStartOffsetUnits = Math.ceil(eventStartOffsetUnits.as(types.schedulerRepeat[event.schedule.repeat.type.toLowerCase()].type));
                                        currentTime = eventStart.clone().add(eventStartOffsetUnits, types.schedulerRepeat[event.schedule.repeat.type.toLowerCase()].type);
                                        break;
                                    default:
                                        currentTime = rangeStart.clone();
                                        currentTime.hours(eventStart.hours());
                                        currentTime.minutes(eventStart.minutes());
                                        currentTime.seconds(eventStart.seconds());
                                }
                            }
                            var endDate;
                            if (rangeEnd.isSameOrAfter(repeatEndsOn)) {
                                endDate = repeatEndsOn.clone();
                            } else {
                                endDate = rangeEnd.clone();
                            }
                            while (currentTime.isBefore(endDate)) {
                                var day = currentTime.day();
                                if (event.schedule.repeat.type !== types.schedulerRepeat.weekly.value ||
                                    event.schedule.repeat.repeatOn.indexOf(day) !== -1) {
                                    var currentEventStart = currentTime.clone();
                                    calendarEvent = toCalendarEvent(event, currentEventStart, currentEventStart);
                                    events.push(calendarEvent);
                                }
                                switch (event.schedule.repeat.type) {
                                    case types.schedulerRepeat.yearly.value:
                                    case types.schedulerRepeat.monthly.value:
                                        eventStartOffsetUnits++;
                                        currentTime = eventStart.clone().add(eventStartOffsetUnits, types.schedulerRepeat[event.schedule.repeat.type.toLowerCase()].type);
                                        break;
                                    default:
                                        currentTime.add(1, 'days');
                                }
                            }
                        }
                    } else if (rangeStart.isSameOrBefore(eventStart)) {
                        calendarEvent = toCalendarEvent(event, eventStart, eventStart);
                        events.push(calendarEvent);
                    }
                }

            });
        }
        callback(events);
    }

    function toCalendarEvent(event, start, end) {
        var title = event.name + ' - ' + event.typeName;
        var htmlTitle = null;
        if (event.schedule.repeat && event.schedule.repeat.type === types.schedulerRepeat.timer.value) {
            var repeatInterval = $translate.instant(schedulerTimeUnitRepeatTranslation[event.schedule.repeat.timeUnit],
                {count: event.schedule.repeat.repeatInterval}, 'messageformat');
            htmlTitle = ` <b>${repeatInterval}</b> ${title}`;
        }
        var calendarEvent = {
            id: event.id.id,
            title: title,
            name: event.name,
            type: event.typeName,
            info: eventInfo(event),
            start: start,
            end: end ? end.toDate() : null,
            htmlTitle: htmlTitle
        };
        return calendarEvent;
    }

    function eventInfo(event) {
        var info = '';
        var startTime = event.schedule.startTime;
        if (!event.schedule.repeat) {
            var start;
            start = moment.utc(startTime).local().format('MMM DD, YYYY, hh:mma'); //eslint-disable-line
            info += start;
            return info;
        } else {
            info += moment.utc(startTime).local().format('hh:mma'); //eslint-disable-line
            info += '<br/>';
            info += $translate.instant('scheduler.starting-from') + ' ' + moment.utc(startTime).local().format('MMM DD, YYYY') + ', '; //eslint-disable-line
            if (event.schedule.repeat.type == types.schedulerRepeat.daily.value) {
                info += $translate.instant('scheduler.daily') + ', ';
            } else if (event.schedule.repeat.type == types.schedulerRepeat.monthly.value) {
                info += $translate.instant('scheduler.monthly') + ', ';
            } else if (event.schedule.repeat.type == types.schedulerRepeat.yearly.value) {
                info += $translate.instant('scheduler.yearly') + ', ';
            } else if (event.schedule.repeat.type == types.schedulerRepeat.timer.value) {
                var repeatInterval = $translate.instant(schedulerTimeUnitRepeatTranslation[event.schedule.repeat.timeUnit],
                    {count: event.schedule.repeat.repeatInterval}, 'messageformat');
                info += repeatInterval + ', ';
            } else {
                info += $translate.instant('scheduler.weekly') + ' ' + $translate.instant('scheduler.on') + ' ';
                for (var i = 0; i < event.schedule.repeat.repeatOn.length; i++) {
                    var day = event.schedule.repeat.repeatOn[i];
                    info += $translate.instant(types.schedulerWeekday[day]) + ', ';
                }
            }
            info += $translate.instant('scheduler.until') + ' ';
            var endsOn = moment.utc(event.schedule.repeat.endsOn).local().format('MMM DD, YYYY');  //eslint-disable-line
            info += endsOn;
            return info;
        }
    }

    function loadEvents(){
        reloadSchedulerEvents();
    }

    function changeCalendarView() {
        calendarElem().fullCalendar('changeView', vm.currentCalendarView);
    }

    function calendarViewTitle() {
        var cElem = calendarElem();
        if (cElem) {
            return cElem.fullCalendar('getView').title;
        } else {
            return '';
        }
    }

    function gotoCalendarToday() {
        calendarElem().fullCalendar('today');
    }

    function isCalendarToday() {
        var cElem = calendarElem();
        if (cElem) {
            var calendar = cElem.fullCalendar('getCalendar');
            if (!calendar) {
                return false;
            }
            var now = calendar.getNow();
            var view = cElem.fullCalendar('getView');
            return view.dateProfile.currentUnzonedRange.containsDate(now);
        } else {
            return false;
        }
    }

    function gotoCalendarPrev() {
        calendarElem().fullCalendar('prev');
    }

    function gotoCalendarNext() {
        calendarElem().fullCalendar('next');
    }

    function calendarElem() {
        var element = uiCalendarConfig.calendars[vm.calendarId];
        if (element && element.data('fullCalendar')) {
            return element;
        } else {
            return null;
        }
    }

    function enterFilterMode(event) {
        vm.query.search = '';
        if (vm.widgetMode) {
            vm.ctx.hideTitlePanel = true;
        }

        $timeout(() => {
            if (vm.widgetMode) {
                angular.element(vm.ctx.$container).find('.searchInput').focus();
            } else {
                let $button = angular.element(event.currentTarget);
                let $toolbarsContainer = $button.closest('.toolbarsContainer');
                $toolbarsContainer.find('.searchInput').focus();
            }
        })
    }

    function exitFilterMode() {
        vm.query.search = null;
        updateSchedulerEvents();
        if (vm.widgetMode) {
            vm.ctx.hideTitlePanel = false;
        }
    }

    function onReorder() {
        updateSchedulerEvents();
    }

    function onPaginate() {
        updateSchedulerEvents();
    }

    function addSchedulerEvent($event) {
        if ($event) {
            $event.stopPropagation();
        }
        openSchedulerEventDialog($event);
    }

    function editSchedulerEvent($event, schedulerEvent) {
        if ($event) {
            $event.stopPropagation();
        }
        schedulerEventService.getSchedulerEvent(schedulerEvent.id.id).then(
            (schedulerEvent) => {
                openSchedulerEventDialog($event, schedulerEvent);
            }
        );
    }

    function viewSchedulerEvent($event, schedulerEvent) {
        if ($event) {
            $event.stopPropagation();
        }
        schedulerEventService.getSchedulerEvent(schedulerEvent.id.id).then(
            (schedulerEvent) => {
                openSchedulerEventDialog($event, schedulerEvent, true);
            }
        );
    }

    function openSchedulerEventDialog($event, schedulerEvent, readonly) {
        if ($event) {
            $event.stopPropagation();
        }
        var isAdd = false;
          if (!schedulerEvent || !schedulerEvent.id) {
              isAdd = true;
              if (!schedulerEvent) {
                  schedulerEvent = {
                      schedule: {},
                      configuration: {
                          originatorId: null,
                          msgType: null,
                          msgBody: {},
                          metadata: {}
                      }
                  };
              }
          }
          $mdDialog.show({
              controller: SchedulerEventController,
              controllerAs: 'vm',
              template: schedulerEventTemplate,
              parent: angular.element($document[0].body),
              locals: {
                  configTypesList: vm.configTypesList,
                  isAdd: isAdd,
                  readonly: readonly,
                  schedulerEvent: schedulerEvent,
                  defaultEventType: vm.defaultEventType,
                  ctx: vm.ctx
              },
              targetEvent: $event,
              fullscreen: true,
              multiple: true,
              onComplete: function () {
                  var w = angular.element($window);
                  w.triggerHandler('resize');
              }
          }).then(function () {
              reloadSchedulerEvents();
          }, function () {
          });
    }

    function deleteSchedulerEvent($event, schedulerEvent) {
        if ($event) {
            $event.stopPropagation();
        }
        if (schedulerEvent) {
            var title = $translate.instant('scheduler.delete-scheduler-event-title', {schedulerEventName: schedulerEvent.name});
            var content = $translate.instant('scheduler.delete-scheduler-event-text');

            var confirm = $mdDialog.confirm()
                .targetEvent($event)
                .title(title)
                .htmlContent(content)
                .ariaLabel(title)
                .cancel($translate.instant('action.no'))
                .ok($translate.instant('action.yes'));
            $mdDialog.show(confirm).then(function() {
                schedulerEventService.deleteSchedulerEvent(schedulerEvent.id.id).then(
                    () => {
                        reloadSchedulerEvents();
                    }
                );
            });
        }
    }

    function deleteSchedulerEvents($event) {
        if ($event) {
            $event.stopPropagation();
        }
        if (vm.selectedSchedulerEvents && vm.selectedSchedulerEvents.length > 0) {
            var title = $translate.instant('scheduler.delete-scheduler-events-title', {count: vm.selectedSchedulerEvents.length}, 'messageformat');
            var content = $translate.instant('scheduler.delete-scheduler-events-text');
            var confirm = $mdDialog.confirm()
                .targetEvent($event)
                .title(title)
                .htmlContent(content)
                .ariaLabel(title)
                .cancel($translate.instant('action.no'))
                .ok($translate.instant('action.yes'));
            $mdDialog.show(confirm).then(function() {
                var tasks = [];
                for (var i = 0; i < vm.selectedSchedulerEvents.length; i++) {
                    var schedulerEvent = vm.selectedSchedulerEvents[i];
                    tasks.push(schedulerEventService.deleteSchedulerEvent(schedulerEvent.id.id));
                }
                $q.all(tasks).then(
                    () => {
                        reloadSchedulerEvents();
                    }
                );

            });
        }
    }

    function reloadSchedulerEvents() {
        vm.allSchedulerEvents.length = 0;
        vm.schedulerEvents.length = 0;
        vm.schedulerEventsPromise;
        vm.schedulerEventsPromise = schedulerEventService.getSchedulerEvents(vm.defaultEventType, vm.displayCustomer);
        vm.schedulerEventsPromise.then(
            function success(allSchedulerEvents) {
                allSchedulerEvents.forEach(
                    (schedulerEvent) => {
                        var typeName = schedulerEvent.type;
                        if (vm.configTypes[typeName]) {
                            typeName = vm.configTypes[typeName].name;
                        }
                        schedulerEvent.typeName = typeName;
                    }
                );
                const user = userService.getCurrentUser();
                vm.allSchedulerEvents = allSchedulerEvents.filter(event=>{
                  return user.customerId === event.customerId.id
                });
                vm.selectedSchedulerEvents = [];
                vm.updateSchedulerEvents();
                vm.schedulerEventsPromise = null;
            },
            function fail() {
                vm.allSchedulerEvents = [];
                vm.selectedSchedulerEvents = [];
                vm.updateSchedulerEvents();
                vm.schedulerEventsPromise = null;
            }
        )
    }

    function updateSchedulerEvents() {
        vm.selectedSchedulerEvents = [];
        var result = $filter('orderBy')(vm.allSchedulerEvents, vm.query.order);
        if (vm.query.search != null) {
            result = $filter('filter')(result, {$: vm.query.search});
        }
        vm.schedulerEventsCount = result.length;
        var startIndex = vm.query.limit * (vm.query.page - 1);
        vm.schedulerEvents = result.slice(startIndex, startIndex + vm.query.limit);
        calendarElem().fullCalendar('refetchEvents');
    }

}
