define('bento/managers/savestate', [
    'bento/utils'
],
function (Utils) {
    'use strict';
    var uniqueID = document.URL,
        storage,
        storageFallBack = {
            setItem: function (key, value) {
                var k,
                    count = 0;
                storageFallBack[key] = value;
                // update length
                for (k in storageFallBack) {
                    if (storageFallBack.hasOwnProperty(k)) {
                        ++count;
                    }
                }
                this.length = count;
            },
            getItem: function (key) {
                var item = storageFallBack[key];
                return Utils.isDefined(item) ? item : null;
            },
            removeItem: function (key) {
                delete storageFallBack[key];
            },
            clear: function () {
                this.length = 0;
            },
            length: 0
        };

    // initialize
    try {
        storage = window.localStorage;
        // try saving once
        if (window.localStorage) {
            window.localStorage.setItem(uniqueID + 'save', '0');
        } else {
            throw 'No local storage available';
        }
    } catch (e) {
        console.log('Warning: you have disabled cookies on your browser. You cannot save progress in your game.');
        storage = storageFallBack;
    }
    return {
        save: function (elementKey, element) {
            if (typeof elementKey !== 'string') {
                elementKey = JSON.stringify(elementKey);
            }
            storage.setItem(uniqueID + elementKey, JSON.stringify(element));
        },
        load: function (elementKey, defaultValue) {
            var element;
            element = storage.getItem(uniqueID + elementKey);
            if (element === null) {
                return defaultValue;
            }
            return JSON.parse(element);
        },
        remove: function (elementKey) {
            storage.removeItem(uniqueID + elementKey);
        },
        clear: function () {
            storage.clear();
        },
        debug: function () {
            console.log(localStorage);
        },
        isEmpty: function () {
            return storage.length === 0;
        }
    };
});