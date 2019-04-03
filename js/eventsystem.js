/**
 * Allows you to fire custom events. Catch these events by using EventSystem.on(). Don't forget to turn
 off listeners with EventSystem.off or you will end up with memory leaks and/or unexpected behaviors.
 * Edge case: EventSystem.off will not clear an event if it's called during an event loop. It will take the
 * next opportunity to clear the event.
 * <br>Exports: Object
 * @module bento/eventsystem
 * @moduleName EventSystem
 * @snippet EventSystem.on|snippet
EventSystem.on('${1}', ${2:fn});
 * @snippet EventSystem.off|snippet
EventSystem.off('${1}', ${2:fn});
 * @snippet EventSystem.fire|snippet
EventSystem.fire('${1}', ${2:data});
 */
bento.define('bento/eventsystem', [
    'bento/utils'
], function (Utils) {
    
    var isLooping = {};  // Mapping of event name to bool (true if this event is currently being looped over)
    var events = {};     // Mapping of event name to array[{callback:Function, context:Object}]
    var removed = {};    // Mapping of event name to array[{callback:Function, context:Object}]

    // Clear the looping status of all events if an unhandled exception occurs.
    // Without this, the event would be blocked from ever occuring again.
    window.addEventListener('error', function (errorEvent) {
        isLooping = {};
    });

    // Clean a single event
    // (remove any listeners that are queued for removal)
    var cleanEvent = function (eventName) {
        var i, j, l, callback, context;

        var removedEvents = removed[eventName];
        var listeners = events[eventName];
        if (!listeners || !removedEvents) {
            return;
        }

        for (j = 0, l = removedEvents.length; j < l; ++j) {
            if (removedEvents[j].reset) {
                // reset the whole event listener
                events[eventName] = [];
                break;
            }
            callback = removedEvents[j].callback;
            context = removedEvents[j].context;
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
        removed[eventName] = [];
    };

    var addEventListener = function (eventName, callback, context) {
        if (Utils.isUndefined(events[eventName])) {
            events[eventName] = [];
            isLooping[eventName] = false;
            removed[eventName] = [];
        }
        events[eventName].push({
            callback: callback,
            context: context
        });
    };

    var removeEventListener = function (eventName, callback, context) {
        var i, listeners, removedEvents;
        
        listeners = events[eventName];
        removedEvents = removed[eventName];
        if (!listeners || !removedEvents) {
            return;
        }

        if (isLooping[eventName]) {
            // remove this event after we are done looping over it
            removedEvents.push({
                callback: callback,
                context: context
            });
        } else {
            // remove this event immediately
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
    };

    var clearEventListeners = function (eventName) {
        var listeners = events[eventName];
        var removedEvents = removed[eventName];

        if (!listeners || !removedEvents) {
            return;
        }
        if (isLooping[eventName]) {
            // reset the whole event after we're done looping over it
            removedEvents.push({
                reset: true
            });
        } else {
            // reset the whole event now
            events[eventName] = [];
        }
    };
    var stopPropagation = false;
    var EventSystem = {
        SortedEventSystem: null,
        /**
         * Stops the current event from further propagating
         * @function
         * @instance
         * @name stopPropagation
         */
        stopPropagation: function () {
            stopPropagation = true;
            // also stop propagation of sorted events by calling this
            var SortedEventSystem = EventSystem.SortedEventSystem;
            if (SortedEventSystem) {
                SortedEventSystem.stopPropagation();
            }
        },
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
            // Note: Sorted events are called before unsorted event listeners
            var SortedEventSystem = EventSystem.SortedEventSystem;
            if (SortedEventSystem) {
                SortedEventSystem.fire(eventName, eventData);
            }

            stopPropagation = false;

            // clean up before firing event
            cleanEvent(eventName);

            if (!Utils.isString(eventName)) {
                eventName = eventName.toString();
            }
            if (Utils.isUndefined(events[eventName])) {
                return;
            }
            listeners = events[eventName];
            if (isLooping[eventName]) {
                Utils.log('ERROR: Already looping over event "' + eventName + '"');
                return;
            }
            isLooping[eventName] = true;

            for (i = 0, l = listeners.length; i < l; ++i) {
                listener = listeners[i];
                if (listener) {
                    if (listener.context) {
                        listener.callback.apply(listener.context, [eventData]);
                    } else {
                        listener.callback(eventData);
                    }
                }
                if (stopPropagation) {
                    stopPropagation = false;
                    break;
                }

            }
            isLooping[eventName] = false;
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
         * Listen to event.
         * @function
         * @instance
         * @param {String} eventName - Name of the event
         * @param {Callback} callback - Callback function.
         * Be careful about adding anonymous functions here, you should consider removing the event listener
         * to prevent memory leaks.
         * @param {Object} [context] - For prototype objects only: if the callback function is a prototype of an object
         you must pass the object instance or "this" here!
         * @name on
         */
        on: addEventListener,
        /**
         * Removes event listener
         * @function
         * @instance
         * @param {String} eventName - Name of the event
         * @param {Callback} callback - Reference to the callback function
         * @param {Object} [context] - For prototype objects only: if the callback function is a prototype of an object
         you must pass the object instance or "this" here!
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

    return EventSystem;
});