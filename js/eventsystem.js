rice.define('rice/eventsystem', [
    'rice/sugar'
], function (Sugar) {
    var events = {};
    /*
    events = {
        'eventName': [Array of listeners]
    }
    */
    return {
        fire: function (eventName, eventData) {
            var i, l, listeners;
            if (!Sugar.isString(eventName)) {
                eventName = eventName.toString();
            }
            if (Sugar.isUndefined(events[eventName])) {
                return;
            }
            listeners = events[eventName];
            for (i = 0, l = listeners.length; i < l; ++i) {
                listeners[i](eventData);
            }
        },
        addEventListener: function (eventName, callback) {
            if (Sugar.isUndefined(events[eventName])) {
                events[eventName] = [];
            }
            events[eventName].push(callback);
        },
        removeEventListener: function (eventName, callback) {
            var i, l, listener;
            if (Sugar.isUndefined(events[eventName])) {
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