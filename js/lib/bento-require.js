/**
 * A very simple require system
 */
(function () {
    'use strict';
    var modules = {},
        waiting = {},
        getModule = function (name, onSuccess) {
            if (modules[name]) {
                // module exists! return immediately
                onSuccess(modules[name]);
                return;
            }

            // does not exist yet, put on waiting list
            waiting[name] = waiting[name] || [];
            waiting[name].push(onSuccess);
        },
        defineAndFlush = function (name, module) {
            var i,
                callbacksWaiting = waiting[name],
                onSuccess;
            
            // add to modules
            modules[name] = module;

            // flush waiting
            if (!callbacksWaiting) {
                return;
            }
            for (i = 0; i < callbacksWaiting.length; ++i) {
                onSuccess = callbacksWaiting[i];
                onSuccess(module);
            }
            callbacksWaiting = [];
        },
        require = function (dep, fn) {
            var i,
                loaded = 0,
                ready,
                end = function () {
                    var params = [];

                    // build param list and call function
                    for (i = 0; i < dep.length; ++i) {
                        getModule(dep[i], function (module) {
                            params.push(module);
                        });
                    }
                    fn.apply(window, params);
                };
            if (dep.length === 0) {
                // load immediately
                end();
            }

            // loop through dependencies and try to load it (the module may not be defined yet)
            for (i = 0; i < dep.length; ++i) {
                getModule(dep[i], function (module) {
                    loaded += 1;
                    if (loaded === dep.length) {
                        // all modules are loaded
                        end();
                    }
                });
            }
        },
        define = function (name, dep, fn) {
            var i,
                params = [],
                loaded = 0,
                ready,
                end = function () {
                    var params = [],
                        myModule;

                    // build param list and call function
                    for (i = 0; i < dep.length; ++i) {
                        getModule(dep[i], function (module) {
                            params.push(module);
                        });
                    }
                    myModule = fn.apply(window, params);
                    // add to modules list
                    defineAndFlush(name, myModule);
                };
            if (dep.length === 0) {
                // load immediately
                end();
            }

            // loop through dependencies and try to load it (the module may not be defined yet)
            for (i = 0; i < dep.length; ++i) {
                getModule(dep[i], function (module) {
                    loaded += 1;
                    if (loaded === dep.length) {
                        // all modules are loaded
                        end();
                    }
                });
            }
        };

    // export
    window.require = require;
    window.define = define;
})();