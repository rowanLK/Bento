/**
 * Manager that controls presistent variables. A wrapper for localStorage. Use Bento.saveState.save() to
 * save values and Bento.saveState.load() to retrieve them.
 * <br>Exports: Object, can be accessed through Bento.saveState namespace.
 * @module bento/managers/savestate
 * @returns SaveState
 */
bento.define('bento/managers/savestate', [
    'bento/utils'
], function (
    Utils
) {
    'use strict';
    var uniqueID = document.URL,
        storage,
        // an object that acts like a localStorageObject
        storageFallBack = {
            data: {},
            setItem: function (key, value) {
                var k,
                    count = 0,
                    data = this.data;
                data[key] = value;
                // update length
                for (k in data) {
                    if (data.hasOwnProperty(k)) {
                        ++count;
                    }
                }
                this.length = count;
            },
            getItem: function (key) {
                var item = storageFallBack.data[key];
                return Utils.isDefined(item) ? item : null;
            },
            removeItem: function (key) {
                delete storageFallBack.data[key];
            },
            clear: function () {
                this.data = {};
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
        /**
         * Boolean that indicates if keys should be saved
         * @instance
         * @name saveKeys
         */
        saveKeys: false,
        /**
         * Saves/serializes a variable
         * @function
         * @instance
         * @param {String} key - Name of the variable
         * @param {Object} value - Number/Object/Array to be saved
         * @name save
         */
        save: function (elementKey, element) {
            var keys;
            if (!elementKey) {
                Utils.log("ERROR: savestate key is not defined.");
                return;
            }
            if (typeof elementKey !== 'string') {
                elementKey = JSON.stringify(elementKey);
            }
            if (element === undefined) {
                Utils.log("ERROR: Don't save a value as undefined, it can't be loaded back in. Use null instead.");
                element = null;
            }
            storage.setItem(uniqueID + elementKey, JSON.stringify(element));

            // also store the keys
            if (this.saveKeys) {
                keys = this.load('_keys', []);
                if (keys.indexOf(elementKey) > -1) {
                    return;
                }
                keys.push(elementKey);
                storage.setItem(uniqueID + '_keys', JSON.stringify(keys));
            }
        },
        /**
         * Adds to a saved variable/number
         * @function
         * @instance
         * @param {String} key - Name of the variable
         * @param {Object} value - Number to be added, if the value does not exists, it defaults to 0
         * @name add
         */
        add: function (elementKey, element) {
            if (!elementKey) {
                Utils.log("ERROR: savestate key is not defined.");
                return;
            }
            var value = this.load(elementKey, 0);
            value += element;
            this.save(elementKey, value);
        },
        /**
         * Loads/deserializes a variable
         * @function
         * @instance
         * @param {String} key - Name of the variable
         * @param {Object} defaultValue - The value returns if saved variable doesn't exists
         * @returns {Object} Returns saved value, otherwise defaultValue
         * @name load
         */
        load: function (elementKey, defaultValue) {
            var element;

            if (!elementKey) {
                Utils.log("ERROR: savestate key is not defined.");
                return;
            }

            element = storage.getItem(uniqueID + elementKey);
            if (element === null || element === undefined) {
                return defaultValue;
            }
            try {
                return JSON.parse(element);
            } catch (e) {
                Utils.log("ERROR: save file corrupted. " + e);
                return defaultValue;
            }
        },
        /**
         * Deletes a variable
         * @function
         * @instance
         * @param {String} key - Name of the variable
         * @name remove
         */
        remove: function (elementKey) {
            if (!elementKey) {
                Utils.log("ERROR: savestate key is not defined.");
                return;
            }
            storage.removeItem(uniqueID + elementKey);
        },
        /**
         * Clears the savestate
         * @function
         * @instance
         * @name clear
         */
        clear: function () {
            storage.clear();
        },
        debug: function () {
            console.log(localStorage);
        },
        /**
         * Checks if localStorage has values
         * @function
         * @instance
         * @name isEmpty
         */
        isEmpty: function () {
            return storage.length === 0;
        },
        /**
         * Returns a copy of the uniqueID.
         * @function
         * @instance
         * @returns {String} uniqueID of current game
         * @name getId
         */
        getId: function () {
            return uniqueID.slice(0);
        },
        /**
         * Sets an identifier that's prepended on every key.
         * By default this is the game's URL, to prevend savefile clashing.
         * @function
         * @instance
         * @param {String} name - ID name
         * @name setId
         */
        setId: function (str) {
            uniqueID = str;
        },
        /**
         * Swaps the storage object. Allows you to use something else than localStorage. But the storage object
         * must have similar methods as localStorage.
         * @function
         * @instance
         * @param {Object} storageObject - an object that resembels localStorage
         * @name setStorage
         */
        setStorage: function (storageObj) {
            storage = storageObj;
        },
        /**
         * Returns the current storage object
         * @function
         * @instance
         * @name getStorage
         */
        getStorage: function () {
            return storage;
        }
    };
});