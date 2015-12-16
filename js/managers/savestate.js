/**
 * Manager that controls presistent variables. Wrapper for localStorage.
 * <br>Exports: Object
 * @module bento/managers/savestate
 * @returns SaveState
 */
bento.define('bento/managers/savestate', [
    'bento/utils'
], function (Utils) {
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
            if (typeof elementKey !== 'string') {
                elementKey = JSON.stringify(elementKey);
            }
            storage.setItem(uniqueID + elementKey, JSON.stringify(element));

            // also store the keys
            if (this.saveKeys) {
                keys = this.load('_keys', []);
                keys.push(elementKey);
                storage.setItem(uniqueID + '_keys', JSON.stringify(keys));
                console.log('save keys')
            }
        },
        /**
         * Loads a variable
         * @function
         * @instance
         * @param {String} key - Name of the variable
         * @param {Object} defaultValue - The value returns if saved variable doesn't exists
         * @returns {Object} Returns saved value, otherwise defaultValue
         * @name load
         */
        load: function (elementKey, defaultValue) {
            var element;
            element = storage.getItem(uniqueID + elementKey);
            if (element === null || element === undefined) {
                return defaultValue;
            }
            return JSON.parse(element);
        },
        /**
         * Deletes a variable
         * @function
         * @instance
         * @param {String} key - Name of the variable
         * @name remove
         */
        remove: function (elementKey) {
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
         * Sets an identifier that's prepended on every key.
         * By default this is the URL, to prevend savefile clashing.
         * TODO: better if its the game name
         * @function
         * @instance
         * @param {String} name - ID name
         * @name setId
         */
        setId: function (str) {
            uniqueID = str;
        },
        /**
         * Swaps the storage object
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