/*
 * Copyright © 2020 ThingsBoard
 */
/*@ngInject*/
export default function SchedulerEventDialogController($rootScope, $scope, $mdDialog, schedulerEventService, types,
                                                       configTypesList, isAdd, readonly, schedulerEvent, defaultEventType,
                                                       entityViewService, entityRelationService, ctx) {
                                                           
    var vm = this;

    vm.types = types;

    vm.ctx = ctx;

    vm.defaultTimezone = moment.tz.guess(); //eslint-disable-line

    vm.configTypesList = configTypesList;

    vm.configTypes = {};
    configTypesList.forEach((configType) => {
        vm.configTypes[configType.value] = configType;
    });

    vm.schedulerEvent = schedulerEvent;
    vm.defaultEventType = defaultEventType;
    vm.isAdd = isAdd;
    vm.readonly = readonly;
    vm.repeatType = types.schedulerRepeat;
    vm.timeUnits = types.schedulerTimeUnit;

    var startDate;
    if (vm.isAdd) {
        vm.schedulerEvent.type = vm.defaultEventType;
        if (!vm.schedulerEvent.schedule.timezone) {
            vm.schedulerEvent.schedule.timezone = vm.defaultTimezone;
        }
        if (!vm.schedulerEvent.schedule.startTime) {
            var date = new Date();
            startDate = new Date(
                date.getFullYear(),
                date.getMonth(),
                date.getDate());
        } else {
            startDate = dateFromUtcTime(vm.schedulerEvent.schedule.startTime);
        }
    } else {
        startDate = dateFromUtcTime(vm.schedulerEvent.schedule.startTime);
        if (vm.schedulerEvent.schedule.repeat) {
            if (vm.schedulerEvent.schedule.repeat.type == types.schedulerRepeat.weekly.value &&
                vm.schedulerEvent.schedule.repeat.repeatOn) {
                vm.weeklyRepeat = [];
                for (var i = 0; i < vm.schedulerEvent.schedule.repeat.repeatOn.length; i++) {
                    vm.weeklyRepeat[vm.schedulerEvent.schedule.repeat.repeatOn[i]] = true;
                }
            } else if (vm.schedulerEvent.schedule.repeat.type == types.schedulerRepeat.timer.value) {
                vm.timerRepeat = [];
                vm.timerRepeat.repeatInterval = vm.schedulerEvent.schedule.repeat.repeatInterval;
                vm.timerRepeat.timeUnit = vm.schedulerEvent.schedule.repeat.timeUnit;
            }
            vm.endsOn = dateFromUtcTime(vm.schedulerEvent.schedule.repeat.endsOn);
        }
    }
    setStartDate(startDate);

    vm.lastAppliedTimezone = vm.schedulerEvent.schedule.timezone;

    vm.repeat = vm.schedulerEvent.schedule.repeat ? true : false;

    vm.repeatsChange = repeatsChange;
    vm.repeatTypeChange = repeatTypeChange;
    vm.weekDayChange = weekDayChange;

    vm.save = save;
    vm.cancel = cancel;

    $scope.$watch('vm.schedulerEvent.type', function (newValue, prevValue) {
        if (!angular.equals(newValue, prevValue)) {
            vm.schedulerEvent.configuration = {
                originatorId: null,
                msgType: null,
                msgBody: {},
                metadata: {}
            }
        }
    });

    $scope.$watch('vm.schedulerEvent.schedule.timezone', function (newValue, prevValue) {
        if (!angular.equals(newValue, prevValue) && newValue) {
            timezoneChange();
        }
    });

    function dateFromUtcTime(time, timezone) {
        if (!timezone) {
            timezone = vm.schedulerEvent.schedule.timezone;
        }
        var offset = moment.tz.zone(timezone).utcOffset(time) * 60 * 1000; //eslint-disable-line
        return new Date(time - offset + new Date().getTimezoneOffset() * 60 * 1000);
    }

    function dateTimeToUtcTime(date, timezone) {
        if (!timezone) {
            timezone = vm.schedulerEvent.schedule.timezone;
        }
        var ts = new Date(
            date.getFullYear(),
            date.getMonth(),
            date.getDate(),
            date.getHours(),
            date.getMinutes(),
            date.getSeconds(),
            date.getMilliseconds()
        ).getTime();
        var offset = moment.tz.zone(timezone).utcOffset(ts) * 60 * 1000; //eslint-disable-line
        return ts + offset - new Date().getTimezoneOffset() * 60 * 1000;
    }

    function dateToUtcTime(date, timezone) {
        if (!timezone) {
            timezone = vm.schedulerEvent.schedule.timezone;
        }
        var ts = new Date(
            date.getFullYear(),
            date.getMonth(),
            date.getDate()
        ).getTime();
        var offset = moment.tz.zone(timezone).utcOffset(ts) * 60 * 1000; //eslint-disable-line
        return ts + offset - new Date().getTimezoneOffset() * 60 * 1000;
    }

    function timezoneChange() {
        if (!angular.equals(vm.schedulerEvent.schedule.timezone, vm.lastAppliedTimezone)) {
            var startTime = dateTimeToUtcTime(vm.startDate, vm.lastAppliedTimezone);
            var startDate = dateFromUtcTime(startTime);
            setStartDate(startDate);
            if (vm.endsOn) {
                var endsOnTime = dateToUtcTime(vm.endsOn, vm.lastAppliedTimezone);
                vm.endsOn = dateFromUtcTime(endsOnTime);
            }
            vm.lastAppliedTimezone = vm.schedulerEvent.schedule.timezone;
        }
    }

    function setStartDate(startDate) {
        vm.startDate = startDate;
    }

    function repeatsChange() {
        if (vm.repeat) {
            if (!vm.schedulerEvent.schedule.repeat) {
                vm.schedulerEvent.schedule.repeat = {
                    type: types.schedulerRepeat.daily.value
                }
            }
            vm.endsOn = new Date(
                vm.startDate.getFullYear(),
                vm.startDate.getMonth(),
                vm.startDate.getDate() + 5);
        }
    }

    function repeatTypeChange() {
        if (vm.repeat && vm.schedulerEvent.schedule.repeat && vm.schedulerEvent.schedule.repeat.type == types.schedulerRepeat.weekly.value) {
            if (!vm.weeklyRepeat) {
                vm.weeklyRepeat = [];
            }
            weekDayChange();
        }
    }

    function weekDayChange() {
        if (vm.repeat && vm.startDate) {
            var setCurrentDay = true;
            for (var i = 0; i < 7; i++) {
                if (vm.weeklyRepeat[i]) {
                    setCurrentDay = false;
                    break;
                }
            }
            if (setCurrentDay) {
                var day = moment(vm.startDate).day(); //eslint-disable-line
                vm.weeklyRepeat[day] = true;
            }
        }
    }

    function cancel() {
        $mdDialog.cancel();
    }

    function save() {
        if (!vm.repeat) {
            delete vm.schedulerEvent.schedule.repeat;
        } else {
            vm.schedulerEvent.schedule.repeat.endsOn = dateToUtcTime(vm.endsOn);
            if (vm.schedulerEvent.schedule.repeat.type == types.schedulerRepeat.weekly.value) {
                vm.schedulerEvent.schedule.repeat.repeatOn = [];
                for (var i = 0; i < 7; i++) {
                    if (vm.weeklyRepeat[i]) {
                        vm.schedulerEvent.schedule.repeat.repeatOn.push(i);
                    }
                }
            } else if (vm.schedulerEvent.schedule.repeat.type == types.schedulerRepeat.timer.value) {
                vm.schedulerEvent.schedule.repeat.repeatInterval = vm.timerRepeat.repeatInterval;
                vm.schedulerEvent.schedule.repeat.timeUnit = vm.timerRepeat.timeUnit;
            }
            else {
                delete vm.schedulerEvent.schedule.repeat.repeatOn;
            }
        }
        vm.schedulerEvent.schedule.startTime = dateTimeToUtcTime(vm.startDate);
        vm.schedulerEvent.name = vm.schedulerEvent.type;
        if(vm.ctx.datasources[0].entityId) {
            entityRelationService.findByFrom(vm.ctx.datasources[0].entityId, vm.ctx.datasources[0].entityType).then((relations) => {
                if(!relations.length){
                    $mdDialog.hide();
                }
                vm.schedulerEvent.configuration.originatorId = relations[0].to;
                vm.schedulerEvent.configuration.metadata = {
                    deviceId: vm.ctx.datasources[0].entityId
                };
                schedulerEventService.saveSchedulerEvent(vm.schedulerEvent).then(
                    () => {
                        $mdDialog.hide();
                    }
                );
            })
        } else {
            entityViewService.getUserEntityViews({limit:1}).then((res) => {
                if(!res.data.length){
                    $mdDialog.hide();
                }
                vm.schedulerEvent.configuration.originatorId = res.data[0].id;
                vm.schedulerEvent.configuration.metadata = {
                    deviceId: res.data[0].entityId.id
                };
                schedulerEventService.saveSchedulerEvent(vm.schedulerEvent).then(
                    () => {
                        $mdDialog.hide();
                    }
                );
            })
        }
    }
}
