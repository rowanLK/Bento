/**
 * Allows you to fire custom events. Catch these events by using EventSystem.on(). Don't forget to turn
 off listeners with EventSystem.off or you will end up with memory leaks and/or unexpected behaviors.
 * <br>Exports: Object
 * @module bento/eventsystem
 */
bento.define('bento/eventsystem', [
    'bento/utils'
], function (Utils) {
    var isLoopingEvents = false;
    var events = {};
    /*events = {
            [String eventName]: [Array listeners = {callback: Function, context: this}]
        }*/
    var removedEvents = [];
    var cleanEventListeners = function () {
        var i, j, l, listeners, eventName, callback, context;

        if (isLoopingEvents) {
            return;
        }
        for (j = 0; j < removedEvents.length; ++j) {
            eventName = removedEvents[j].eventName;
            if (removedEvents[j].reset === true) {
                // reset the whole event listener
                events[eventName] = [];
                continue;
            }
            callback = removedEvents[j].callback;
            context = removedEvents[j].context;
            if (Utils.isUndefined(events[eventName])) {
                continue;
            }
            listeners = events[eventName];
            for (i = listeners.length - 1; i >= 0; --i) {
                if (listeners[i].callback === callback) {
                    if (context) {
                        if (listeners[i].context === context) {
                            events[eventName].splice(i, 1);
                            break;
                        }
                    } else {
                        events[eventName].splice(i, 1);
                        break;
                    }
                }
            }
        }
        removedEvents = [];
    };
    var addEventListener = function (eventName, callback, context) {
        if (Utils.isUndefined(events[eventName])) {
            events[eventName] = [];
        }
        events[eventName].push({
            callback: callback,
            context: context
        });
    };
    var removeEventListener = function (eventName, callback, context) {
        var listeners = events[eventName];
        if (!listeners || listeners.length === 0) {
            return;
        }
        removedEvents.push({
            eventName: eventName,
            callback: callback,
            context: context
        });

        if (!isLoopingEvents) {
            // can clean immediately
            cleanEventListeners();
        }
    };
    var clearEventListeners = function (eventName) {
        var listeners = events[eventName];
        if (!listeners || listeners.length === 0) {
            return;
        }
        removedEvents.push({
            eventName: eventName,
            reset: true
        });

        if (!isLoopingEvents) {
            // can clean immediately
            cleanEventListeners();
        }
    };

    return {
        /**
         * Ignore warnings
         * @instance
         * @name suppressWarnings
         */
        suppressWarnings: false,
        /**
         * Fires an event
         * @function
         * @instance
         * @param {String} eventName - Name of the event
         * @param {Object} [eventData] - Extra data to pass with event
         * @name fire
         */
        fire: function (eventName, eventData) {
            var i, l, listeners, listener;

            // clean up before firing event
            cleanEventListeners();

            if (!Utils.isString(eventName)) {
                eventName = eventName.toString();
            }
            if (Utils.isUndefined(events[eventName])) {
                return;
            }
            listeners = events[eventName];
            for (i = 0, l = listeners.length; i < l; ++i) {
                isLoopingEvents = true;
                listener = listeners[i];
                if (listener) {
                    if (listener.context) {
                        listener.callback.apply(listener.context, [eventData]);
                    } else {
                        listener.callback(eventData);
                    }
                } else if (!this.suppressWarnings) {
                    // TODO: this warning appears when event listeners are removed
                    // during another listener being triggered. For example, removing an entity
                    // while that entity was listening to the same event.
                    // In a lot of cases, this is normal... Consider removing this warning?
                    console.log('Warning: listener is not a function');
                }
            }
            isLoopingEvents = false;
        },
        addEventListener: addEventListener,
        removeEventListener: removeEventListener,
        /**
         * Callback function
         *
         * @callback Callback
         * @param {Object} eventData - Any data that is passed
         */
        /**
         * Listen to event
         * @function
         * @instance
         * @param {String} eventName - Name of the event
         * @param {Callback} callback - Callback function.
         * Be careful about adding anonymous functions here, you should consider removing the event listener
         * to prevent memory leaks.
         * @name on
         */
        on: addEventListener,
        /**
         * Removes event listener
         * @function
         * @instance
         * @param {String} eventName - Name of the event
         * @param {Callback} callback - Reference to the callback function
         * @name off
         */
        off: removeEventListener,
        /**
         * Removes all listeners of an event
         * @function
         * @instance
         * @param {String} eventName - Name of the event
         * @name clear
         */
        clear: clearEventListeners
    };
});