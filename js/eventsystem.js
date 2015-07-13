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
            [String eventName]: [Array listeners]
        }*/
        removedEvents = [],
        cleanEventListeners = function () {
            var i, j, l, listeners, eventName, callback;
            for (j = 0; j < removedEvents.length; j += 1) {
                eventName = removedEvents[j].eventName;
                callback = removedEvents[j].callback;
                if (Utils.isUndefined(events[eventName])) {
                    continue;
                }
                listeners = events[eventName];
                for (i = listeners.length - 1; i >= 0; i -= 1) {
                    if (listeners[i] === callback) {
                        listeners.splice(i, 1);
                        break;
                    }
                }
            }
            removedEvents = [];
        },
        addEventListener = function (eventName, callback) {
            if (Utils.isUndefined(events[eventName])) {
                events[eventName] = [];
            }
            events[eventName].push(callback);
        },
        removeEventListener = function (eventName, callback) {
            removedEvents.push({
                eventName: eventName,
                callback: callback
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
                    listener(eventData);
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