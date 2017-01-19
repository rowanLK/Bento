/**
 * Sorted EventSystem is EventSystem's little brother
 * <br>Exports: Object
 * @module bento/sortedeventsystem
 */
bento.define('bento/sortedeventsystem', [
    'bento/managers/object',
    'bento/eventsystem',
    'bento/utils'
], function (
    ObjectManager,
    EventSystem,
    Utils
) {
    var isLoopingEvents = false;
    var objects = null;
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
    var addEventListener = function (component, eventName, callback, context) {
        var sortingData = getSortingData(component);

        if (Utils.isUndefined(events[eventName])) {
            events[eventName] = [];
        }
        events[eventName].push({
            sortingData: sortingData,
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
    var getSortingData = function (component) {
        // cached data for sorting purposes
        var rootIndex = -1; // index of root parent in object manager
        var componentIndex = -1; // index of component in entity
        var depth = -1; // how many grandparents
        var parent = component.parent; // component's direct parent
        var parents = [];
        var rootParent = null;
        var rootZ;

        // init objects if needed
        if (objects === null) {
            objects = ObjectManager.getObjects();
        }

        if (!parent) {
            // either the component itself a rootParent, or it wasn't attached yet
            rootParent = component;
        } else {
            // get index of component
            if (parent.components) {
                componentIndex = parent.components.indexOf(component);
            }

            // find the root
            while (parent) {
                parents.push(parent);
                depth += 1;
                if (!parent.parent) {
                    // current parent must be the root
                    rootParent = parent;
                }
                // next iteration
                parent = parent.parent;
            }
        }

        // collect data
        rootIndex = objects.indexOf(rootParent);
        rootZ = rootParent.z;

        return {
            isDirty: false,
            component: component,
            parent: parent,
            parents: parents,
            componentIndex: componentIndex,
            depth: depth,
            rootParent: rootParent,
            rootIndex: rootIndex,
            rootZ: rootZ
        };
    };
    var sortFunction = function (a, b) {
        // sort event listeners by the component location in the scenegraph
        var sortA = a.sortingData;
        var sortB = b.sortingData;
        // refresh sorting data
        if (sortA.isDirty) {
            a.sortingData = getSortingData(sortA.component);
            sortA = a.sortingData;
        }
        if (sortB.isDirty) {
            b.sortingData = getSortingData(sortB.component);
            sortB = b.sortingData;
        }

        // sort by root parents
        var rootDiff = sortA.rootIndex - sortB.rootIndex;
        if (rootDiff) {
            // different roots: sort by root
            return rootDiff;
        } else {
            // components have a root parent
            if (sortA.parent === sortB.parent) {
                // quickest check: are the components siblings?
                return sortA.componentIndex - sortB.componentIndex;
            } else {
                // need to find the earliest common parent
                return findCommonParentIndex(sortA, sortB);
            }
        }
    };
    var findCommonParentIndex = function (sortA, sortB) {
        // used when components have a common parent, but that common parent is not the root
        var parentsA = sortA.parents;
        var parentsB = sortB.parents;
        var min = Math.min(parentsA.length, parentsB.length);
        var i;
        var commonParent = null;
        var componentA;
        var componentB;
        // find the last common parent
        for (i = 0; i < min; ++i) {
            if (parentsA[i] === parentsB[i]) {
                commonParent = parentsA[i];
            } else {
                // we found the last common parent, now we need to compare these children
                componentA = parentsA[i];
                componentB = parentsB[i];
                break;
            }
        }
        // compare indices
        return commonParent.indexOf(componentA) - commonParent.indexOf(componentB);
    };
    var inspectSortingData = function (listeners) {
        // go through all sortingData and check if their z index didnt change in the meantime
        var sortingData;
        var i = 0,
            l = listeners.length;
        for (i = 0; i < l; ++i) {
            sortingData = listeners[i].sortingData;
            if (sortingData.rootZ !== sortingData.rootParent.z) {
                sortingData.isDirty = true;
            }
            // are there other causes of changing order??
        }
    };
    var sortListeners = function (listeners) {
        // sort the listeners
        Utils.stableSort.inplace(listeners, sortFunction);
    };
    var stopPropagation = false;

    var SortedEventSystem = {
        /**
         * Ignore warnings
         * @instance
         * @name suppressWarnings
         */
        suppressWarnings: false,
        stopPropagation: function () {
            stopPropagation = true;
        },
        fire: function (eventName, eventData) {
            var i, l, listeners, listener;

            stopPropagation = false;

            // clean up before firing event
            cleanEventListeners();

            if (!Utils.isString(eventName)) {
                eventName = eventName.toString();
            }
            if (Utils.isUndefined(events[eventName])) {
                return;
            }

            listeners = events[eventName];

            // sort before looping through listeners
            inspectSortingData(listeners);
            sortListeners(listeners);

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
                    // console.log('Warning: listener is not a function');
                }
                if (stopPropagation) {
                    stopPropagation = false;
                    break;
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
         * Listen to event.
         * @function
         * @instance
         * @param {Object} component - The component as sorting reference
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
        clear: clearEventListeners,
        sortListeners: sortListeners
    };

    // save reference in EventSystem
    EventSystem.SortedEventSystem = SortedEventSystem;


    return SortedEventSystem;
});