/*
 * Sends custom events
 * @copyright (C) HeiGames
 */
bento.define('bento/eventsystem', [
    'bento/utils'
], function (Utils) {
    var events = {};
    /*events = {
        [String eventName]: [Array listeners]
    }*/
    return {
        fire: function (eventName, eventData) {
            var i, l, listeners, listener;
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
            var i, l, listener;
            if (Utils.isUndefined(events[eventName])) {
                return;
            }
            listener = events[eventName];
            for (i = 0, l = listener.length; i < l; ++i) {
                if (listener[i] === callback) {
                    listener.splice(i, 1);
                    break;
                }
            }
        }
    };
});