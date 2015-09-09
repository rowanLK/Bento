/**
 * Sends custom events
 * <br>Exports: Object
 * @module bento/eventsystem
 */
bento.define('bento/eventsystem', [
    'bento/utils'
], function (Utils) {
    var events = {},
        /*events = {
            [String eventName]: [Array listeners = {callback: Function, context: this}]
        }*/
        removedEvents = [],
        cleanEventListeners = function () {
            var i, j, l, listeners, eventName, callback, context;
            for (j = 0; j < removedEvents.length; j += 1) {
                eventName = removedEvents[j].eventName;
                callback = removedEvents[j].callback;
                context = removedEvents[j].context;
                if (Utils.isUndefined(events[eventName])) {
                    continue;
                }
                listeners = events[eventName];
                for (i = listeners.length - 1; i >= 0; i -= 1) {
                    if (listeners[i].callback === callback) {
                        if (listeners[i].context) {
                            if (listeners[i].context === context) {
                                listeners.splice(i, 1);
                            }
                        } else {
                            listeners.splice(i, 1);
                        }
                        break;
                    }
                }
            }
            removedEvents = [];
        },
        addEventListener = function (eventName, callback, context) {
            if (Utils.isUndefined(events[eventName])) {
                events[eventName] = [];
            }
            events[eventName].push({
                callback: callback,
                context: context
            });
        },
        removeEventListener = function (eventName, callback, context) {
            // TODO: check if event listeners are really removed
            removedEvents.push({
                eventName: eventName,
                callback: callback,
                context: context
            });
        };

    return {
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
            cleanEventListeners();
            if (!Utils.isString(eventName)) {
                eventName = eventName.toString();
            }
            if (Utils.isUndefined(events[eventName])) {
                return;
            }
            listeners = events[eventName];
            for (i = 0, l = listeners.length; i < l; ++i) {
                listener = listeners[i];
                if (listener) {
                    if (listener.context) {
                        listener.callback.apply(listener.context, [eventData]);
                    } else {
                        listener.callback(eventData);
                    }
                } else {
                    // TODO: fix this
                    console.log('Warning: listener is not a function:', listener, i);
                }
            }
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
        off: removeEventListener
    };
});