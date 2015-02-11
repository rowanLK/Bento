/*
 * Sends custom events
 * @copyright (C) HeiGames
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
        };
    return {
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
        addEventListener: function (eventName, callback) {
            if (Utils.isUndefined(events[eventName])) {
                events[eventName] = [];
            }
            events[eventName].push(callback);
        },
        removeEventListener: function (eventName, callback) {
            removedEvents.push({
                eventName: eventName,
                callback: callback
            });
        }
    };
});