/** vim: et:ts=4:sw=4:sts=4
 * @license RequireJS 2.1.9 Copyright (c) 2010-2012, The Dojo Foundation All Rights Reserved.
 * Available via the MIT or new BSD license.
 * see: http://github.com/jrburke/requirejs for details
 */
//Not using strict: uneven strict support in browsers, #392, and causes
//problems with requirejs.exec()/transpiler plugins that may not be strict.
/*jslint regexp: true, nomen: true, sloppy: true */
/*global window, navigator, document, importScripts, setTimeout, opera */

var requirejs, require, define;
(function (global) {
    var req, s, head, baseElement, dataMain, src,
        interactiveScript, currentlyAddingScript, mainScript, subPath,
        version = '2.1.9',
        commentRegExp = /(\/\*([\s\S]*?)\*\/|([^:]|^)\/\/(.*)$)/mg,
        cjsRequireRegExp = /[^.]\s*require\s*\(\s*["']([^'"\s]+)["']\s*\)/g,
        jsSuffixRegExp = /\.js$/,
        currDirRegExp = /^\.\//,
        op = Object.prototype,
        ostring = op.toString,
        hasOwn = op.hasOwnProperty,
        ap = Array.prototype,
        apsp = ap.splice,
        isBrowser = !!(typeof window !== 'undefined' && typeof navigator !== 'undefined' && window.document),
        isWebWorker = !isBrowser && typeof importScripts !== 'undefined',
        //PS3 indicates loaded and complete, but need to wait for complete
        //specifically. Sequence is 'loading', 'loaded', execution,
        // then 'complete'. The UA check is unfortunate, but not sure how
        //to feature test w/o causing perf issues.
        readyRegExp = isBrowser && navigator.platform === 'PLAYSTATION 3' ?
                      /^complete$/ : /^(complete|loaded)$/,
        defContextName = '_',
        //Oh the tragedy, detecting opera. See the usage of isOpera for reason.
        isOpera = typeof opera !== 'undefined' && opera.toString() === '[object Opera]',
        contexts = {},
        cfg = {},
        globalDefQueue = [],
        useInteractive = false;

    function isFunction(it) {
        return ostring.call(it) === '[object Function]';
    }

    function isArray(it) {
        return ostring.call(it) === '[object Array]';
    }

    /**
     * Helper function for iterating over an array. If the func returns
     * a true value, it will break out of the loop.
     */
    function each(ary, func) {
        if (ary) {
            var i;
            for (i = 0; i < ary.length; i += 1) {
                if (ary[i] && func(ary[i], i, ary)) {
                    break;
                }
            }
        }
    }

    /**
     * Helper function for iterating over an array backwards. If the func
     * returns a true value, it will break out of the loop.
     */
    function eachReverse(ary, func) {
        if (ary) {
            var i;
            for (i = ary.length - 1; i > -1; i -= 1) {
                if (ary[i] && func(ary[i], i, ary)) {
                    break;
                }
            }
        }
    }

    function hasProp(obj, prop) {
        return hasOwn.call(obj, prop);
    }

    function getOwn(obj, prop) {
        return hasProp(obj, prop) && obj[prop];
    }

    /**
     * Cycles over properties in an object and calls a function for each
     * property value. If the function returns a truthy value, then the
     * iteration is stopped.
     */
    function eachProp(obj, func) {
        var prop;
        for (prop in obj) {
            if (hasProp(obj, prop)) {
                if (func(obj[prop], prop)) {
                    break;
                }
            }
        }
    }

    /**
     * Simple function to mix in properties from source into target,
     * but only if target does not already have a property of the same name.
     */
    function mixin(target, source, force, deepStringMixin) {
        if (source) {
            eachProp(source, function (value, prop) {
                if (force || !hasProp(target, prop)) {
                    if (deepStringMixin && typeof value !== 'string') {
                        if (!target[prop]) {
                            target[prop] = {};
                        }
                        mixin(target[prop], value, force, deepStringMixin);
                    } else {
                        target[prop] = value;
                    }
                }
            });
        }
        return target;
    }

    //Similar to Function.prototype.bind, but the 'this' object is specified
    //first, since it is easier to read/figure out what 'this' will be.
    function bind(obj, fn) {
        return function () {
            return fn.apply(obj, arguments);
        };
    }

    function scripts() {
        return document.getElementsByTagName('script');
    }

    function defaultOnError(err) {
        throw err;
    }

    //Allow getting a global that expressed in
    //dot notation, like 'a.b.c'.
    function getGlobal(value) {
        if (!value) {
            return value;
        }
        var g = global;
        each(value.split('.'), function (part) {
            g = g[part];
        });
        return g;
    }

    /**
     * Constructs an error with a pointer to an URL with more information.
     * @param {String} id the error ID that maps to an ID on a web page.
     * @param {String} message human readable error.
     * @param {Error} [err] the original error, if there is one.
     *
     * @returns {Error}
     */
    function makeError(id, msg, err, requireModules) {
        var e = new Error(msg + '\nhttp://requirejs.org/docs/errors.html#' + id);
        e.requireType = id;
        e.requireModules = requireModules;
        if (err) {
            e.originalError = err;
        }
        return e;
    }

    if (typeof define !== 'undefined') {
        //If a define is already in play via another AMD loader,
        //do not overwrite.
        return;
    }

    if (typeof requirejs !== 'undefined') {
        if (isFunction(requirejs)) {
            //Do not overwrite and existing requirejs instance.
            return;
        }
        cfg = requirejs;
        requirejs = undefined;
    }

    //Allow for a require config object
    if (typeof require !== 'undefined' && !isFunction(require)) {
        //assume it is a config object.
        cfg = require;
        require = undefined;
    }

    function newContext(contextName) {
        var inCheckLoaded, Module, context, handlers,
            checkLoadedTimeoutId,
            config = {
                //Defaults. Do not set a default for map
                //config to speed up normalize(), which
                //will run faster if there is no default.
                waitSeconds: 7,
                baseUrl: './',
                paths: {},
                pkgs: {},
                shim: {},
                config: {}
            },
            registry = {},
            //registry of just enabled modules, to speed
            //cycle breaking code when lots of modules
            //are registered, but not activated.
            enabledRegistry = {},
            undefEvents = {},
            defQueue = [],
            defined = {},
            urlFetched = {},
            requireCounter = 1,
            unnormalizedCounter = 1;

        /**
         * Trims the . and .. from an array of path segments.
         * It will keep a leading path segment if a .. will become
         * the first path segment, to help with module name lookups,
         * which act like paths, but can be remapped. But the end result,
         * all paths that use this function should look normalized.
         * NOTE: this method MODIFIES the input array.
         * @param {Array} ary the array of path segments.
         */
        function trimDots(ary) {
            var i, part;
            for (i = 0; ary[i]; i += 1) {
                part = ary[i];
                if (part === '.') {
                    ary.splice(i, 1);
                    i -= 1;
                } else if (part === '..') {
                    if (i === 1 && (ary[2] === '..' || ary[0] === '..')) {
                        //End of the line. Keep at least one non-dot
                        //path segment at the front so it can be mapped
                        //correctly to disk. Otherwise, there is likely
                        //no path mapping for a path starting with '..'.
                        //This can still fail, but catches the most reasonable
                        //uses of ..
                        break;
                    } else if (i > 0) {
                        ary.splice(i - 1, 2);
                        i -= 2;
                    }
                }
            }
        }

        /**
         * Given a relative module name, like ./something, normalize it to
         * a real name that can be mapped to a path.
         * @param {String} name the relative name
         * @param {String} baseName a real name that the name arg is relative
         * to.
         * @param {Boolean} applyMap apply the map config to the value. Should
         * only be done if this normalization is for a dependency ID.
         * @returns {String} normalized name
         */
        function normalize(name, baseName, applyMap) {
            var pkgName, pkgConfig, mapValue, nameParts, i, j, nameSegment,
                foundMap, foundI, foundStarMap, starI,
                baseParts = baseName && baseName.split('/'),
                normalizedBaseParts = baseParts,
                map = config.map,
                starMap = map && map['*'];

            //Adjust any relative paths.
            if (name && name.charAt(0) === '.') {
                //If have a base name, try to normalize against it,
                //otherwise, assume it is a top-level require that will
                //be relative to baseUrl in the end.
                if (baseName) {
                    if (getOwn(config.pkgs, baseName)) {
                        //If the baseName is a package name, then just treat it as one
                        //name to concat the name with.
                        normalizedBaseParts = baseParts = [baseName];
                    } else {
                        //Convert baseName to array, and lop off the last part,
                        //so that . matches that 'directory' and not name of the baseName's
                        //module. For instance, baseName of 'one/two/three', maps to
                        //'one/two/three.js', but we want the directory, 'one/two' for
                        //this normalization.
                        normalizedBaseParts = baseParts.slice(0, baseParts.length - 1);
                    }

                    name = normalizedBaseParts.concat(name.split('/'));
                    trimDots(name);

                    //Some use of packages may use a . path to reference the
                    //'main' module name, so normalize for that.
                    pkgConfig = getOwn(config.pkgs, (pkgName = name[0]));
                    name = name.join('/');
                    if (pkgConfig && name === pkgName + '/' + pkgConfig.main) {
                        name = pkgName;
                    }
                } else if (name.indexOf('./') === 0) {
                    // No baseName, so this is ID is resolved relative
                    // to baseUrl, pull off the leading dot.
                    name = name.substring(2);
                }
            }

            //Apply map config if available.
            if (applyMap && map && (baseParts || starMap)) {
                nameParts = name.split('/');

                for (i = nameParts.length; i > 0; i -= 1) {
                    nameSegment = nameParts.slice(0, i).join('/');

                    if (baseParts) {
                        //Find the longest baseName segment match in the config.
                        //So, do joins on the biggest to smallest lengths of baseParts.
                        for (j = baseParts.length; j > 0; j -= 1) {
                            mapValue = getOwn(map, baseParts.slice(0, j).join('/'));

                            //baseName segment has config, find if it has one for
                            //this name.
                            if (mapValue) {
                                mapValue = getOwn(mapValue, nameSegment);
                                if (mapValue) {
                                    //Match, update name to the new value.
                                    foundMap = mapValue;
                                    foundI = i;
                                    break;
                                }
                            }
                        }
                    }

                    if (foundMap) {
                        break;
                    }

                    //Check for a star map match, but just hold on to it,
                    //if there is a shorter segment match later in a matching
                    //config, then favor over this star map.
                    if (!foundStarMap && starMap && getOwn(starMap, nameSegment)) {
                        foundStarMap = getOwn(starMap, nameSegment);
                        starI = i;
                    }
                }

                if (!foundMap && foundStarMap) {
                    foundMap = foundStarMap;
                    foundI = starI;
                }

                if (foundMap) {
                    nameParts.splice(0, foundI, foundMap);
                    name = nameParts.join('/');
                }
            }

            return name;
        }

        function removeScript(name) {
            if (isBrowser) {
                each(scripts(), function (scriptNode) {
                    if (scriptNode.getAttribute('data-requiremodule') === name &&
                            scriptNode.getAttribute('data-requirecontext') === context.contextName) {
                        scriptNode.parentNode.removeChild(scriptNode);
                        return true;
                    }
                });
            }
        }

        function hasPathFallback(id) {
            var pathConfig = getOwn(config.paths, id);
            if (pathConfig && isArray(pathConfig) && pathConfig.length > 1) {
                //Pop off the first array value, since it failed, and
                //retry
                pathConfig.shift();
                context.require.undef(id);
                context.require([id]);
                return true;
            }
        }

        //Turns a plugin!resource to [plugin, resource]
        //with the plugin being undefined if the name
        //did not have a plugin prefix.
        function splitPrefix(name) {
            var prefix,
                index = name ? name.indexOf('!') : -1;
            if (index > -1) {
                prefix = name.substring(0, index);
                name = name.substring(index + 1, name.length);
            }
            return [prefix, name];
        }

        /**
         * Creates a module mapping that includes plugin prefix, module
         * name, and path. If parentModuleMap is provided it will
         * also normalize the name via require.normalize()
         *
         * @param {String} name the module name
         * @param {String} [parentModuleMap] parent module map
         * for the module name, used to resolve relative names.
         * @param {Boolean} isNormalized: is the ID already normalized.
         * This is true if this call is done for a define() module ID.
         * @param {Boolean} applyMap: apply the map config to the ID.
         * Should only be true if this map is for a dependency.
         *
         * @returns {Object}
         */
        function makeModuleMap(name, parentModuleMap, isNormalized, applyMap) {
            var url, pluginModule, suffix, nameParts,
                prefix = null,
                parentName = parentModuleMap ? parentModuleMap.name : null,
                originalName = name,
                isDefine = true,
                normalizedName = '';

            //If no name, then it means it is a require call, generate an
            //internal name.
            if (!name) {
                isDefine = false;
                name = '_@r' + (requireCounter += 1);
            }

            nameParts = splitPrefix(name);
            prefix = nameParts[0];
            name = nameParts[1];

            if (prefix) {
                prefix = normalize(prefix, parentName, applyMap);
                pluginModule = getOwn(defined, prefix);
            }

            //Account for relative paths if there is a base name.
            if (name) {
                if (prefix) {
                    if (pluginModule && pluginModule.normalize) {
                        //Plugin is loaded, use its normalize method.
                        normalizedName = pluginModule.normalize(name, function (name) {
                            return normalize(name, parentName, applyMap);
                        });
                    } else {
                        normalizedName = normalize(name, parentName, applyMap);
                    }
                } else {
                    //A regular module.
                    normalizedName = normalize(name, parentName, applyMap);

                    //Normalized name may be a plugin ID due to map config
                    //application in normalize. The map config values must
                    //already be normalized, so do not need to redo that part.
                    nameParts = splitPrefix(normalizedName);
                    prefix = nameParts[0];
                    normalizedName = nameParts[1];
                    isNormalized = true;

                    url = context.nameToUrl(normalizedName);
                }
            }

            //If the id is a plugin id that cannot be determined if it needs
            //normalization, stamp it with a unique ID so two matching relative
            //ids that may conflict can be separate.
            suffix = prefix && !pluginModule && !isNormalized ?
                     '_unnormalized' + (unnormalizedCounter += 1) :
                     '';

            return {
                prefix: prefix,
                name: normalizedName,
                parentMap: parentModuleMap,
                unnormalized: !!suffix,
                url: url,
                originalName: originalName,
                isDefine: isDefine,
                id: (prefix ?
                        prefix + '!' + normalizedName :
                        normalizedName) + suffix
            };
        }

        function getModule(depMap) {
            var id = depMap.id,
                mod = getOwn(registry, id);

            if (!mod) {
                mod = registry[id] = new context.Module(depMap);
            }

            return mod;
        }

        function on(depMap, name, fn) {
            var id = depMap.id,
                mod = getOwn(registry, id);

            if (hasProp(defined, id) &&
                    (!mod || mod.defineEmitComplete)) {
                if (name === 'defined') {
                    fn(defined[id]);
                }
            } else {
                mod = getModule(depMap);
                if (mod.error && name === 'error') {
                    fn(mod.error);
                } else {
                    mod.on(name, fn);
                }
            }
        }

        function onError(err, errback) {
            var ids = err.requireModules,
                notified = false;

            if (errback) {
                errback(err);
            } else {
                each(ids, function (id) {
                    var mod = getOwn(registry, id);
                    if (mod) {
                        //Set error on module, so it skips timeout checks.
                        mod.error = err;
                        if (mod.events.error) {
                            notified = true;
                            mod.emit('error', err);
                        }
                    }
                });

                if (!notified) {
                    req.onError(err);
                }
            }
        }

        /**
         * Internal method to transfer globalQueue items to this context's
         * defQueue.
         */
        function takeGlobalQueue() {
            //Push all the globalDefQueue items into the context's defQueue
            if (globalDefQueue.length) {
                //Array splice in the values since the context code has a
                //local var ref to defQueue, so cannot just reassign the one
                //on context.
                apsp.apply(defQueue,
                           [defQueue.length - 1, 0].concat(globalDefQueue));
                globalDefQueue = [];
            }
        }

        handlers = {
            'require': function (mod) {
                if (mod.require) {
                    return mod.require;
                } else {
                    return (mod.require = context.makeRequire(mod.map));
                }
            },
            'exports': function (mod) {
                mod.usingExports = true;
                if (mod.map.isDefine) {
                    if (mod.exports) {
                        return mod.exports;
                    } else {
                        return (mod.exports = defined[mod.map.id] = {});
                    }
                }
            },
            'module': function (mod) {
                if (mod.module) {
                    return mod.module;
                } else {
                    return (mod.module = {
                        id: mod.map.id,
                        uri: mod.map.url,
                        config: function () {
                            var c,
                                pkg = getOwn(config.pkgs, mod.map.id);
                            // For packages, only support config targeted
                            // at the main module.
                            c = pkg ? getOwn(config.config, mod.map.id + '/' + pkg.main) :
                                      getOwn(config.config, mod.map.id);
                            return  c || {};
                        },
                        exports: defined[mod.map.id]
                    });
                }
            }
        };

        function cleanRegistry(id) {
            //Clean up machinery used for waiting modules.
            delete registry[id];
            delete enabledRegistry[id];
        }

        function breakCycle(mod, traced, processed) {
            var id = mod.map.id;

            if (mod.error) {
                mod.emit('error', mod.error);
            } else {
                traced[id] = true;
                each(mod.depMaps, function (depMap, i) {
                    var depId = depMap.id,
                        dep = getOwn(registry, depId);

                    //Only force things that have not completed
                    //being defined, so still in the registry,
                    //and only if it has not been matched up
                    //in the module already.
                    if (dep && !mod.depMatched[i] && !processed[depId]) {
                        if (getOwn(traced, depId)) {
                            mod.defineDep(i, defined[depId]);
                            mod.check(); //pass false?
                        } else {
                            breakCycle(dep, traced, processed);
                        }
                    }
                });
                processed[id] = true;
            }
        }

        function checkLoaded() {
            var map, modId, err, usingPathFallback,
                waitInterval = config.waitSeconds * 1000,
                //It is possible to disable the wait interval by using waitSeconds of 0.
                expired = waitInterval && (context.startTime + waitInterval) < new Date().getTime(),
                noLoads = [],
                reqCalls = [],
                stillLoading = false,
                needCycleCheck = true;

            //Do not bother if this call was a result of a cycle break.
            if (inCheckLoaded) {
                return;
            }

            inCheckLoaded = true;

            //Figure out the state of all the modules.
            eachProp(enabledRegistry, function (mod) {
                map = mod.map;
                modId = map.id;

                //Skip things that are not enabled or in error state.
                if (!mod.enabled) {
                    return;
                }

                if (!map.isDefine) {
                    reqCalls.push(mod);
                }

                if (!mod.error) {
                    //If the module should be executed, and it has not
                    //been inited and time is up, remember it.
                    if (!mod.inited && expired) {
                        if (hasPathFallback(modId)) {
                            usingPathFallback = true;
                            stillLoading = true;
                        } else {
                            noLoads.push(modId);
                            removeScript(modId);
                        }
                    } else if (!mod.inited && mod.fetched && map.isDefine) {
                        stillLoading = true;
                        if (!map.prefix) {
                            //No reason to keep looking for unfinished
                            //loading. If the only stillLoading is a
                            //plugin resource though, keep going,
                            //because it may be that a plugin resource
                            //is waiting on a non-plugin cycle.
                            return (needCycleCheck = false);
                        }
                    }
                }
            });

            if (expired && noLoads.length) {
                //If wait time expired, throw error of unloaded modules.
                err = makeError('timeout', 'Load timeout for modules: ' + noLoads, null, noLoads);
                err.contextName = context.contextName;
                return onError(err);
            }

            //Not expired, check for a cycle.
            if (needCycleCheck) {
                each(reqCalls, function (mod) {
                    breakCycle(mod, {}, {});
                });
            }

            //If still waiting on loads, and the waiting load is something
            //other than a plugin resource, or there are still outstanding
            //scripts, then just try back later.
            if ((!expired || usingPathFallback) && stillLoading) {
                //Something is still waiting to load. Wait for it, but only
                //if a timeout is not already in effect.
                if ((isBrowser || isWebWorker) && !checkLoadedTimeoutId) {
                    checkLoadedTimeoutId = setTimeout(function () {
                        checkLoadedTimeoutId = 0;
                        checkLoaded();
                    }, 50);
                }
            }

            inCheckLoaded = false;
        }

        Module = function (map) {
            this.events = getOwn(undefEvents, map.id) || {};
            this.map = map;
            this.shim = getOwn(config.shim, map.id);
            this.depExports = [];
            this.depMaps = [];
            this.depMatched = [];
            this.pluginMaps = {};
            this.depCount = 0;

            /* this.exports this.factory
               this.depMaps = [],
               this.enabled, this.fetched
            */
        };

        Module.prototype = {
            init: function (depMaps, factory, errback, options) {
                options = options || {};

                //Do not do more inits if already done. Can happen if there
                //are multiple define calls for the same module. That is not
                //a normal, common case, but it is also not unexpected.
                if (this.inited) {
                    return;
                }

                this.factory = factory;

                if (errback) {
                    //Register for errors on this module.
                    this.on('error', errback);
                } else if (this.events.error) {
                    //If no errback already, but there are error listeners
                    //on this module, set up an errback to pass to the deps.
                    errback = bind(this, function (err) {
                        this.emit('error', err);
                    });
                }

                //Do a copy of the dependency array, so that
                //source inputs are not modified. For example
                //"shim" deps are passed in here directly, and
                //doing a direct modification of the depMaps array
                //would affect that config.
                this.depMaps = depMaps && depMaps.slice(0);

                this.errback = errback;

                //Indicate this module has be initialized
                this.inited = true;

                this.ignore = options.ignore;

                //Could have option to init this module in enabled mode,
                //or could have been previously marked as enabled. However,
                //the dependencies are not known until init is called. So
                //if enabled previously, now trigger dependencies as enabled.
                if (options.enabled || this.enabled) {
                    //Enable this module and dependencies.
                    //Will call this.check()
                    this.enable();
                } else {
                    this.check();
                }
            },

            defineDep: function (i, depExports) {
                //Because of cycles, defined callback for a given
                //export can be called more than once.
                if (!this.depMatched[i]) {
                    this.depMatched[i] = true;
                    this.depCount -= 1;
                    this.depExports[i] = depExports;
                }
            },

            fetch: function () {
                if (this.fetched) {
                    return;
                }
                this.fetched = true;

                context.startTime = (new Date()).getTime();

                var map = this.map;

                //If the manager is for a plugin managed resource,
                //ask the plugin to load it now.
                if (this.shim) {
                    context.makeRequire(this.map, {
                        enableBuildCallback: true
                    })(this.shim.deps || [], bind(this, function () {
                        return map.prefix ? this.callPlugin() : this.load();
                    }));
                } else {
                    //Regular dependency.
                    return map.prefix ? this.callPlugin() : this.load();
                }
            },

            load: function () {
                var url = this.map.url;

                //Regular dependency.
                if (!urlFetched[url]) {
                    urlFetched[url] = true;
                    context.load(this.map.id, url);
                }
            },

            /**
             * Checks if the module is ready to define itself, and if so,
             * define it.
             */
            check: function () {
                if (!this.enabled || this.enabling) {
                    return;
                }

                var err, cjsModule,
                    id = this.map.id,
                    depExports = this.depExports,
                    exports = this.exports,
                    factory = this.factory;

                if (!this.inited) {
                    this.fetch();
                } else if (this.error) {
                    this.emit('error', this.error);
                } else if (!this.defining) {
                    //The factory could trigger another require call
                    //that would result in checking this module to
                    //define itself again. If already in the process
                    //of doing that, skip this work.
                    this.defining = true;

                    if (this.depCount < 1 && !this.defined) {
                        if (isFunction(factory)) {
                            //If there is an error listener, favor passing
                            //to that instead of throwing an error. However,
                            //only do it for define()'d  modules. require
                            //errbacks should not be called for failures in
                            //their callbacks (#699). However if a global
                            //onError is set, use that.
                            if ((this.events.error && this.map.isDefine) ||
                                req.onError !== defaultOnError) {
                                try {
                                    exports = context.execCb(id, factory, depExports, exports);
                                } catch (e) {
                                    err = e;
                                }
                            } else {
                                exports = context.execCb(id, factory, depExports, exports);
                            }

                            if (this.map.isDefine) {
                                //If setting exports via 'module' is in play,
                                //favor that over return value and exports. After that,
                                //favor a non-undefined return value over exports use.
                                cjsModule = this.module;
                                if (cjsModule &&
                                        cjsModule.exports !== undefined &&
                                        //Make sure it is not already the exports value
                                        cjsModule.exports !== this.exports) {
                                    exports = cjsModule.exports;
                                } else if (exports === undefined && this.usingExports) {
                                    //exports already set the defined value.
                                    exports = this.exports;
                                }
                            }

                            if (err) {
                                err.requireMap = this.map;
                                err.requireModules = this.map.isDefine ? [this.map.id] : null;
                                err.requireType = this.map.isDefine ? 'define' : 'require';
                                return onError((this.error = err));
                            }

                        } else {
                            //Just a literal value
                            exports = factory;
                        }

                        this.exports = exports;

                        if (this.map.isDefine && !this.ignore) {
                            defined[id] = exports;

                            if (req.onResourceLoad) {
                                req.onResourceLoad(context, this.map, this.depMaps);
                            }
                        }

                        //Clean up
                        cleanRegistry(id);

                        this.defined = true;
                    }

                    //Finished the define stage. Allow calling check again
                    //to allow define notifications below in the case of a
                    //cycle.
                    this.defining = false;

                    if (this.defined && !this.defineEmitted) {
                        this.defineEmitted = true;
                        this.emit('defined', this.exports);
                        this.defineEmitComplete = true;
                    }

                }
            },

            callPlugin: function () {
                var map = this.map,
                    id = map.id,
                    //Map already normalized the prefix.
                    pluginMap = makeModuleMap(map.prefix);

                //Mark this as a dependency for this plugin, so it
                //can be traced for cycles.
                this.depMaps.push(pluginMap);

                on(pluginMap, 'defined', bind(this, function (plugin) {
                    var load, normalizedMap, normalizedMod,
                        name = this.map.name,
                        parentName = this.map.parentMap ? this.map.parentMap.name : null,
                        localRequire = context.makeRequire(map.parentMap, {
                            enableBuildCallback: true
                        });

                    //If current map is not normalized, wait for that
                    //normalized name to load instead of continuing.
                    if (this.map.unnormalized) {
                        //Normalize the ID if the plugin allows it.
                        if (plugin.normalize) {
                            name = plugin.normalize(name, function (name) {
                                return normalize(name, parentName, true);
                            }) || '';
                        }

                        //prefix and name should already be normalized, no need
                        //for applying map config again either.
                        normalizedMap = makeModuleMap(map.prefix + '!' + name,
                                                      this.map.parentMap);
                        on(normalizedMap,
                            'defined', bind(this, function (value) {
                                this.init([], function () { return value; }, null, {
                                    enabled: true,
                                    ignore: true
                                });
                            }));

                        normalizedMod = getOwn(registry, normalizedMap.id);
                        if (normalizedMod) {
                            //Mark this as a dependency for this plugin, so it
                            //can be traced for cycles.
                            this.depMaps.push(normalizedMap);

                            if (this.events.error) {
                                normalizedMod.on('error', bind(this, function (err) {
                                    this.emit('error', err);
                                }));
                            }
                            normalizedMod.enable();
                        }

                        return;
                    }

                    load = bind(this, function (value) {
                        this.init([], function () { return value; }, null, {
                            enabled: true
                        });
                    });

                    load.error = bind(this, function (err) {
                        this.inited = true;
                        this.error = err;
                        err.requireModules = [id];

                        //Remove temp unnormalized modules for this module,
                        //since they will never be resolved otherwise now.
                        eachProp(registry, function (mod) {
                            if (mod.map.id.indexOf(id + '_unnormalized') === 0) {
                                cleanRegistry(mod.map.id);
                            }
                        });

                        onError(err);
                    });

                    //Allow plugins to load other code without having to know the
                    //context or how to 'complete' the load.
                    load.fromText = bind(this, function (text, textAlt) {
                        /*jslint evil: true */
                        var moduleName = map.name,
                            moduleMap = makeModuleMap(moduleName),
                            hasInteractive = useInteractive;

                        //As of 2.1.0, support just passing the text, to reinforce
                        //fromText only being called once per resource. Still
                        //support old style of passing moduleName but discard
                        //that moduleName in favor of the internal ref.
                        if (textAlt) {
                            text = textAlt;
                        }

                        //Turn off interactive script matching for IE for any define
                        //calls in the text, then turn it back on at the end.
                        if (hasInteractive) {
                            useInteractive = false;
                        }

                        //Prime the system by creating a module instance for
                        //it.
                        getModule(moduleMap);

                        //Transfer any config to this other module.
                        if (hasProp(config.config, id)) {
                            config.config[moduleName] = config.config[id];
                        }

                        try {
                            req.exec(text);
                        } catch (e) {
                            return onError(makeError('fromtexteval',
                                             'fromText eval for ' + id +
                                            ' failed: ' + e,
                                             e,
                                             [id]));
                        }

                        if (hasInteractive) {
                            useInteractive = true;
                        }

                        //Mark this as a dependency for the plugin
                        //resource
                        this.depMaps.push(moduleMap);

                        //Support anonymous modules.
                        context.completeLoad(moduleName);

                        //Bind the value of that module to the value for this
                        //resource ID.
                        localRequire([moduleName], load);
                    });

                    //Use parentName here since the plugin's name is not reliable,
                    //could be some weird string with no path that actually wants to
                    //reference the parentName's path.
                    plugin.load(map.name, localRequire, load, config);
                }));

                context.enable(pluginMap, this);
                this.pluginMaps[pluginMap.id] = pluginMap;
            },

            enable: function () {
                enabledRegistry[this.map.id] = this;
                this.enabled = true;

                //Set flag mentioning that the module is enabling,
                //so that immediate calls to the defined callbacks
                //for dependencies do not trigger inadvertent load
                //with the depCount still being zero.
                this.enabling = true;

                //Enable each dependency
                each(this.depMaps, bind(this, function (depMap, i) {
                    var id, mod, handler;

                    if (typeof depMap === 'string') {
                        //Dependency needs to be converted to a depMap
                        //and wired up to this module.
                        depMap = makeModuleMap(depMap,
                                               (this.map.isDefine ? this.map : this.map.parentMap),
                                               false,
                                               !this.skipMap);
                        this.depMaps[i] = depMap;

                        handler = getOwn(handlers, depMap.id);

                        if (handler) {
                            this.depExports[i] = handler(this);
                            return;
                        }

                        this.depCount += 1;

                        on(depMap, 'defined', bind(this, function (depExports) {
                            this.defineDep(i, depExports);
                            this.check();
                        }));

                        if (this.errback) {
                            on(depMap, 'error', bind(this, this.errback));
                        }
                    }

                    id = depMap.id;
                    mod = registry[id];

                    //Skip special modules like 'require', 'exports', 'module'
                    //Also, don't call enable if it is already enabled,
                    //important in circular dependency cases.
                    if (!hasProp(handlers, id) && mod && !mod.enabled) {
                        context.enable(depMap, this);
                    }
                }));

                //Enable each plugin that is used in
                //a dependency
                eachProp(this.pluginMaps, bind(this, function (pluginMap) {
                    var mod = getOwn(registry, pluginMap.id);
                    if (mod && !mod.enabled) {
                        context.enable(pluginMap, this);
                    }
                }));

                this.enabling = false;

                this.check();
            },

            on: function (name, cb) {
                var cbs = this.events[name];
                if (!cbs) {
                    cbs = this.events[name] = [];
                }
                cbs.push(cb);
            },

            emit: function (name, evt) {
                each(this.events[name], function (cb) {
                    cb(evt);
                });
                if (name === 'error') {
                    //Now that the error handler was triggered, remove
                    //the listeners, since this broken Module instance
                    //can stay around for a while in the registry.
                    delete this.events[name];
                }
            }
        };

        function callGetModule(args) {
            //Skip modules already defined.
            if (!hasProp(defined, args[0])) {
                getModule(makeModuleMap(args[0], null, true)).init(args[1], args[2]);
            }
        }

        function removeListener(node, func, name, ieName) {
            //Favor detachEvent because of IE9
            //issue, see attachEvent/addEventListener comment elsewhere
            //in this file.
            if (node.detachEvent && !isOpera) {
                //Probably IE. If not it will throw an error, which will be
                //useful to know.
                if (ieName) {
                    node.detachEvent(ieName, func);
                }
            } else {
                node.removeEventListener(name, func, false);
            }
        }

        /**
         * Given an event from a script node, get the requirejs info from it,
         * and then removes the event listeners on the node.
         * @param {Event} evt
         * @returns {Object}
         */
        function getScriptData(evt) {
            //Using currentTarget instead of target for Firefox 2.0's sake. Not
            //all old browsers will be supported, but this one was easy enough
            //to support and still makes sense.
            var node = evt.currentTarget || evt.srcElement;

            //Remove the listeners once here.
            removeListener(node, context.onScriptLoad, 'load', 'onreadystatechange');
            removeListener(node, context.onScriptError, 'error');

            return {
                node: node,
                id: node && node.getAttribute('data-requiremodule')
            };
        }

        function intakeDefines() {
            var args;

            //Any defined modules in the global queue, intake them now.
            takeGlobalQueue();

            //Make sure any remaining defQueue items get properly processed.
            while (defQueue.length) {
                args = defQueue.shift();
                if (args[0] === null) {
                    return onError(makeError('mismatch', 'Mismatched anonymous define() module: ' + args[args.length - 1]));
                } else {
                    //args are id, deps, factory. Should be normalized by the
                    //define() function.
                    callGetModule(args);
                }
            }
        }

        context = {
            config: config,
            contextName: contextName,
            registry: registry,
            defined: defined,
            urlFetched: urlFetched,
            defQueue: defQueue,
            Module: Module,
            makeModuleMap: makeModuleMap,
            nextTick: req.nextTick,
            onError: onError,

            /**
             * Set a configuration for the context.
             * @param {Object} cfg config object to integrate.
             */
            configure: function (cfg) {
                //Make sure the baseUrl ends in a slash.
                if (cfg.baseUrl) {
                    if (cfg.baseUrl.charAt(cfg.baseUrl.length - 1) !== '/') {
                        cfg.baseUrl += '/';
                    }
                }

                //Save off the paths and packages since they require special processing,
                //they are additive.
                var pkgs = config.pkgs,
                    shim = config.shim,
                    objs = {
                        paths: true,
                        config: true,
                        map: true
                    };

                eachProp(cfg, function (value, prop) {
                    if (objs[prop]) {
                        if (prop === 'map') {
                            if (!config.map) {
                                config.map = {};
                            }
                            mixin(config[prop], value, true, true);
                        } else {
                            mixin(config[prop], value, true);
                        }
                    } else {
                        config[prop] = value;
                    }
                });

                //Merge shim
                if (cfg.shim) {
                    eachProp(cfg.shim, function (value, id) {
                        //Normalize the structure
                        if (isArray(value)) {
                            value = {
                                deps: value
                            };
                        }
                        if ((value.exports || value.init) && !value.exportsFn) {
                            value.exportsFn = context.makeShimExports(value);
                        }
                        shim[id] = value;
                    });
                    config.shim = shim;
                }

                //Adjust packages if necessary.
                if (cfg.packages) {
                    each(cfg.packages, function (pkgObj) {
                        var location;

                        pkgObj = typeof pkgObj === 'string' ? { name: pkgObj } : pkgObj;
                        location = pkgObj.location;

                        //Create a brand new object on pkgs, since currentPackages can
                        //be passed in again, and config.pkgs is the internal transformed
                        //state for all package configs.
                        pkgs[pkgObj.name] = {
                            name: pkgObj.name,
                            location: location || pkgObj.name,
                            //Remove leading dot in main, so main paths are normalized,
                            //and remove any trailing .js, since different package
                            //envs have different conventions: some use a module name,
                            //some use a file name.
                            main: (pkgObj.main || 'main')
                                  .replace(currDirRegExp, '')
                                  .replace(jsSuffixRegExp, '')
                        };
                    });

                    //Done with modifications, assing packages back to context config
                    config.pkgs = pkgs;
                }

                //If there are any "waiting to execute" modules in the registry,
                //update the maps for them, since their info, like URLs to load,
                //may have changed.
                eachProp(registry, function (mod, id) {
                    //If module already has init called, since it is too
                    //late to modify them, and ignore unnormalized ones
                    //since they are transient.
                    if (!mod.inited && !mod.map.unnormalized) {
                        mod.map = makeModuleMap(id);
                    }
                });

                //If a deps array or a config callback is specified, then call
                //require with those args. This is useful when require is defined as a
                //config object before require.js is loaded.
                if (cfg.deps || cfg.callback) {
                    context.require(cfg.deps || [], cfg.callback);
                }
            },

            makeShimExports: function (value) {
                function fn() {
                    var ret;
                    if (value.init) {
                        ret = value.init.apply(global, arguments);
                    }
                    return ret || (value.exports && getGlobal(value.exports));
                }
                return fn;
            },

            makeRequire: function (relMap, options) {
                options = options || {};

                function localRequire(deps, callback, errback) {
                    var id, map, requireMod;

                    if (options.enableBuildCallback && callback && isFunction(callback)) {
                        callback.__requireJsBuild = true;
                    }

                    if (typeof deps === 'string') {
                        if (isFunction(callback)) {
                            //Invalid call
                            return onError(makeError('requireargs', 'Invalid require call'), errback);
                        }

                        //If require|exports|module are requested, get the
                        //value for them from the special handlers. Caveat:
                        //this only works while module is being defined.
                        if (relMap && hasProp(handlers, deps)) {
                            return handlers[deps](registry[relMap.id]);
                        }

                        //Synchronous access to one module. If require.get is
                        //available (as in the Node adapter), prefer that.
                        if (req.get) {
                            return req.get(context, deps, relMap, localRequire);
                        }

                        //Normalize module name, if it contains . or ..
                        map = makeModuleMap(deps, relMap, false, true);
                        id = map.id;

                        if (!hasProp(defined, id)) {
                            return onError(makeError('notloaded', 'Module name "' +
                                        id +
                                        '" has not been loaded yet for context: ' +
                                        contextName +
                                        (relMap ? '' : '. Use require([])')));
                        }
                        return defined[id];
                    }

                    //Grab defines waiting in the global queue.
                    intakeDefines();

                    //Mark all the dependencies as needing to be loaded.
                    context.nextTick(function () {
                        //Some defines could have been added since the
                        //require call, collect them.
                        intakeDefines();

                        requireMod = getModule(makeModuleMap(null, relMap));

                        //Store if map config should be applied to this require
                        //call for dependencies.
                        requireMod.skipMap = options.skipMap;

                        requireMod.init(deps, callback, errback, {
                            enabled: true
                        });

                        checkLoaded();
                    });

                    return localRequire;
                }

                mixin(localRequire, {
                    isBrowser: isBrowser,

                    /**
                     * Converts a module name + .extension into an URL path.
                     * *Requires* the use of a module name. It does not support using
                     * plain URLs like nameToUrl.
                     */
                    toUrl: function (moduleNamePlusExt) {
                        var ext,
                            index = moduleNamePlusExt.lastIndexOf('.'),
                            segment = moduleNamePlusExt.split('/')[0],
                            isRelative = segment === '.' || segment === '..';

                        //Have a file extension alias, and it is not the
                        //dots from a relative path.
                        if (index !== -1 && (!isRelative || index > 1)) {
                            ext = moduleNamePlusExt.substring(index, moduleNamePlusExt.length);
                            moduleNamePlusExt = moduleNamePlusExt.substring(0, index);
                        }

                        return context.nameToUrl(normalize(moduleNamePlusExt,
                                                relMap && relMap.id, true), ext,  true);
                    },

                    defined: function (id) {
                        return hasProp(defined, makeModuleMap(id, relMap, false, true).id);
                    },

                    specified: function (id) {
                        id = makeModuleMap(id, relMap, false, true).id;
                        return hasProp(defined, id) || hasProp(registry, id);
                    }
                });

                //Only allow undef on top level require calls
                if (!relMap) {
                    localRequire.undef = function (id) {
                        //Bind any waiting define() calls to this context,
                        //fix for #408
                        takeGlobalQueue();

                        var map = makeModuleMap(id, relMap, true),
                            mod = getOwn(registry, id);

                        removeScript(id);

                        delete defined[id];
                        delete urlFetched[map.url];
                        delete undefEvents[id];

                        if (mod) {
                            //Hold on to listeners in case the
                            //module will be attempted to be reloaded
                            //using a different config.
                            if (mod.events.defined) {
                                undefEvents[id] = mod.events;
                            }

                            cleanRegistry(id);
                        }
                    };
                }

                return localRequire;
            },

            /**
             * Called to enable a module if it is still in the registry
             * awaiting enablement. A second arg, parent, the parent module,
             * is passed in for context, when this method is overriden by
             * the optimizer. Not shown here to keep code compact.
             */
            enable: function (depMap) {
                var mod = getOwn(registry, depMap.id);
                if (mod) {
                    getModule(depMap).enable();
                }
            },

            /**
             * Internal method used by environment adapters to complete a load event.
             * A load event could be a script load or just a load pass from a synchronous
             * load call.
             * @param {String} moduleName the name of the module to potentially complete.
             */
            completeLoad: function (moduleName) {
                var found, args, mod,
                    shim = getOwn(config.shim, moduleName) || {},
                    shExports = shim.exports;

                takeGlobalQueue();

                while (defQueue.length) {
                    args = defQueue.shift();
                    if (args[0] === null) {
                        args[0] = moduleName;
                        //If already found an anonymous module and bound it
                        //to this name, then this is some other anon module
                        //waiting for its completeLoad to fire.
                        if (found) {
                            break;
                        }
                        found = true;
                    } else if (args[0] === moduleName) {
                        //Found matching define call for this script!
                        found = true;
                    }

                    callGetModule(args);
                }

                //Do this after the cycle of callGetModule in case the result
                //of those calls/init calls changes the registry.
                mod = getOwn(registry, moduleName);

                if (!found && !hasProp(defined, moduleName) && mod && !mod.inited) {
                    if (config.enforceDefine && (!shExports || !getGlobal(shExports))) {
                        if (hasPathFallback(moduleName)) {
                            return;
                        } else {
                            return onError(makeError('nodefine',
                                             'No define call for ' + moduleName,
                                             null,
                                             [moduleName]));
                        }
                    } else {
                        //A script that does not call define(), so just simulate
                        //the call for it.
                        callGetModule([moduleName, (shim.deps || []), shim.exportsFn]);
                    }
                }

                checkLoaded();
            },

            /**
             * Converts a module name to a file path. Supports cases where
             * moduleName may actually be just an URL.
             * Note that it **does not** call normalize on the moduleName,
             * it is assumed to have already been normalized. This is an
             * internal API, not a public one. Use toUrl for the public API.
             */
            nameToUrl: function (moduleName, ext, skipExt) {
                var paths, pkgs, pkg, pkgPath, syms, i, parentModule, url,
                    parentPath;

                //If a colon is in the URL, it indicates a protocol is used and it is just
                //an URL to a file, or if it starts with a slash, contains a query arg (i.e. ?)
                //or ends with .js, then assume the user meant to use an url and not a module id.
                //The slash is important for protocol-less URLs as well as full paths.
                if (req.jsExtRegExp.test(moduleName)) {
                    //Just a plain path, not module name lookup, so just return it.
                    //Add extension if it is included. This is a bit wonky, only non-.js things pass
                    //an extension, this method probably needs to be reworked.
                    url = moduleName + (ext || '');
                } else {
                    //A module that needs to be converted to a path.
                    paths = config.paths;
                    pkgs = config.pkgs;

                    syms = moduleName.split('/');
                    //For each module name segment, see if there is a path
                    //registered for it. Start with most specific name
                    //and work up from it.
                    for (i = syms.length; i > 0; i -= 1) {
                        parentModule = syms.slice(0, i).join('/');
                        pkg = getOwn(pkgs, parentModule);
                        parentPath = getOwn(paths, parentModule);
                        if (parentPath) {
                            //If an array, it means there are a few choices,
                            //Choose the one that is desired
                            if (isArray(parentPath)) {
                                parentPath = parentPath[0];
                            }
                            syms.splice(0, i, parentPath);
                            break;
                        } else if (pkg) {
                            //If module name is just the package name, then looking
                            //for the main module.
                            if (moduleName === pkg.name) {
                                pkgPath = pkg.location + '/' + pkg.main;
                            } else {
                                pkgPath = pkg.location;
                            }
                            syms.splice(0, i, pkgPath);
                            break;
                        }
                    }

                    //Join the path parts together, then figure out if baseUrl is needed.
                    url = syms.join('/');
                    url += (ext || (/^data\:|\?/.test(url) || skipExt ? '' : '.js'));
                    url = (url.charAt(0) === '/' || url.match(/^[\w\+\.\-]+:/) ? '' : config.baseUrl) + url;
                }

                return config.urlArgs ? url +
                                        ((url.indexOf('?') === -1 ? '?' : '&') +
                                         config.urlArgs) : url;
            },

            //Delegates to req.load. Broken out as a separate function to
            //allow overriding in the optimizer.
            load: function (id, url) {
                req.load(context, id, url);
            },

            /**
             * Executes a module callback function. Broken out as a separate function
             * solely to allow the build system to sequence the files in the built
             * layer in the right sequence.
             *
             * @private
             */
            execCb: function (name, callback, args, exports) {
                return callback.apply(exports, args);
            },

            /**
             * callback for script loads, used to check status of loading.
             *
             * @param {Event} evt the event from the browser for the script
             * that was loaded.
             */
            onScriptLoad: function (evt) {
                //Using currentTarget instead of target for Firefox 2.0's sake. Not
                //all old browsers will be supported, but this one was easy enough
                //to support and still makes sense.
                if (evt.type === 'load' ||
                        (readyRegExp.test((evt.currentTarget || evt.srcElement).readyState))) {
                    //Reset interactive script so a script node is not held onto for
                    //to long.
                    interactiveScript = null;

                    //Pull out the name of the module and the context.
                    var data = getScriptData(evt);
                    context.completeLoad(data.id);
                }
            },

            /**
             * Callback for script errors.
             */
            onScriptError: function (evt) {
                var data = getScriptData(evt);
                if (!hasPathFallback(data.id)) {
                    return onError(makeError('scripterror', 'Script error for: ' + data.id, evt, [data.id]));
                }
            }
        };

        context.require = context.makeRequire();
        return context;
    }

    /**
     * Main entry point.
     *
     * If the only argument to require is a string, then the module that
     * is represented by that string is fetched for the appropriate context.
     *
     * If the first argument is an array, then it will be treated as an array
     * of dependency string names to fetch. An optional function callback can
     * be specified to execute when all of those dependencies are available.
     *
     * Make a local req variable to help Caja compliance (it assumes things
     * on a require that are not standardized), and to give a short
     * name for minification/local scope use.
     */
    req = requirejs = function (deps, callback, errback, optional) {

        //Find the right context, use default
        var context, config,
            contextName = defContextName;

        // Determine if have config object in the call.
        if (!isArray(deps) && typeof deps !== 'string') {
            // deps is a config object
            config = deps;
            if (isArray(callback)) {
                // Adjust args if there are dependencies
                deps = callback;
                callback = errback;
                errback = optional;
            } else {
                deps = [];
            }
        }

        if (config && config.context) {
            contextName = config.context;
        }

        context = getOwn(contexts, contextName);
        if (!context) {
            context = contexts[contextName] = req.s.newContext(contextName);
        }

        if (config) {
            context.configure(config);
        }

        return context.require(deps, callback, errback);
    };

    /**
     * Support require.config() to make it easier to cooperate with other
     * AMD loaders on globally agreed names.
     */
    req.config = function (config) {
        return req(config);
    };

    /**
     * Execute something after the current tick
     * of the event loop. Override for other envs
     * that have a better solution than setTimeout.
     * @param  {Function} fn function to execute later.
     */
    req.nextTick = typeof setTimeout !== 'undefined' ? function (fn) {
        setTimeout(fn, 4);
    } : function (fn) { fn(); };

    /**
     * Export require as a global, but only if it does not already exist.
     */
    if (!require) {
        require = req;
    }

    req.version = version;

    //Used to filter out dependencies that are already paths.
    req.jsExtRegExp = /^\/|:|\?|\.js$/;
    req.isBrowser = isBrowser;
    s = req.s = {
        contexts: contexts,
        newContext: newContext
    };

    //Create default context.
    req({});

    //Exports some context-sensitive methods on global require.
    each([
        'toUrl',
        'undef',
        'defined',
        'specified'
    ], function (prop) {
        //Reference from contexts instead of early binding to default context,
        //so that during builds, the latest instance of the default context
        //with its config gets used.
        req[prop] = function () {
            var ctx = contexts[defContextName];
            return ctx.require[prop].apply(ctx, arguments);
        };
    });

    if (isBrowser) {
        head = s.head = document.getElementsByTagName('head')[0];
        //If BASE tag is in play, using appendChild is a problem for IE6.
        //When that browser dies, this can be removed. Details in this jQuery bug:
        //http://dev.jquery.com/ticket/2709
        baseElement = document.getElementsByTagName('base')[0];
        if (baseElement) {
            head = s.head = baseElement.parentNode;
        }
    }

    /**
     * Any errors that require explicitly generates will be passed to this
     * function. Intercept/override it if you want custom error handling.
     * @param {Error} err the error object.
     */
    req.onError = defaultOnError;

    /**
     * Creates the node for the load command. Only used in browser envs.
     */
    req.createNode = function (config, moduleName, url) {
        var node = config.xhtml ?
                document.createElementNS('http://www.w3.org/1999/xhtml', 'html:script') :
                document.createElement('script');
        node.type = config.scriptType || 'text/javascript';
        node.charset = 'utf-8';
        node.async = true;
        return node;
    };

    /**
     * Does the request to load a module for the browser case.
     * Make this a separate function to allow other environments
     * to override it.
     *
     * @param {Object} context the require context to find state.
     * @param {String} moduleName the name of the module.
     * @param {Object} url the URL to the module.
     */
    req.load = function (context, moduleName, url) {
        var config = (context && context.config) || {},
            node;
        if (isBrowser) {
            //In the browser so use a script tag
            node = req.createNode(config, moduleName, url);

            node.setAttribute('data-requirecontext', context.contextName);
            node.setAttribute('data-requiremodule', moduleName);

            //Set up load listener. Test attachEvent first because IE9 has
            //a subtle issue in its addEventListener and script onload firings
            //that do not match the behavior of all other browsers with
            //addEventListener support, which fire the onload event for a
            //script right after the script execution. See:
            //https://connect.microsoft.com/IE/feedback/details/648057/script-onload-event-is-not-fired-immediately-after-script-execution
            //UNFORTUNATELY Opera implements attachEvent but does not follow the script
            //script execution mode.
            if (node.attachEvent &&
                    //Check if node.attachEvent is artificially added by custom script or
                    //natively supported by browser
                    //read https://github.com/jrburke/requirejs/issues/187
                    //if we can NOT find [native code] then it must NOT natively supported.
                    //in IE8, node.attachEvent does not have toString()
                    //Note the test for "[native code" with no closing brace, see:
                    //https://github.com/jrburke/requirejs/issues/273
                    !(node.attachEvent.toString && node.attachEvent.toString().indexOf('[native code') < 0) &&
                    !isOpera) {
                //Probably IE. IE (at least 6-8) do not fire
                //script onload right after executing the script, so
                //we cannot tie the anonymous define call to a name.
                //However, IE reports the script as being in 'interactive'
                //readyState at the time of the define call.
                useInteractive = true;

                node.attachEvent('onreadystatechange', context.onScriptLoad);
                //It would be great to add an error handler here to catch
                //404s in IE9+. However, onreadystatechange will fire before
                //the error handler, so that does not help. If addEventListener
                //is used, then IE will fire error before load, but we cannot
                //use that pathway given the connect.microsoft.com issue
                //mentioned above about not doing the 'script execute,
                //then fire the script load event listener before execute
                //next script' that other browsers do.
                //Best hope: IE10 fixes the issues,
                //and then destroys all installs of IE 6-9.
                //node.attachEvent('onerror', context.onScriptError);
            } else {
                node.addEventListener('load', context.onScriptLoad, false);
                node.addEventListener('error', context.onScriptError, false);
            }
            node.src = url;

            //For some cache cases in IE 6-8, the script executes before the end
            //of the appendChild execution, so to tie an anonymous define
            //call to the module name (which is stored on the node), hold on
            //to a reference to this node, but clear after the DOM insertion.
            currentlyAddingScript = node;
            if (baseElement) {
                head.insertBefore(node, baseElement);
            } else {
                head.appendChild(node);
            }
            currentlyAddingScript = null;

            return node;
        } else if (isWebWorker) {
            try {
                //In a web worker, use importScripts. This is not a very
                //efficient use of importScripts, importScripts will block until
                //its script is downloaded and evaluated. However, if web workers
                //are in play, the expectation that a build has been done so that
                //only one script needs to be loaded anyway. This may need to be
                //reevaluated if other use cases become common.
                importScripts(url);

                //Account for anonymous modules
                context.completeLoad(moduleName);
            } catch (e) {
                context.onError(makeError('importscripts',
                                'importScripts failed for ' +
                                    moduleName + ' at ' + url,
                                e,
                                [moduleName]));
            }
        }
    };

    function getInteractiveScript() {
        if (interactiveScript && interactiveScript.readyState === 'interactive') {
            return interactiveScript;
        }

        eachReverse(scripts(), function (script) {
            if (script.readyState === 'interactive') {
                return (interactiveScript = script);
            }
        });
        return interactiveScript;
    }

    //Look for a data-main script attribute, which could also adjust the baseUrl.
    if (isBrowser && !cfg.skipDataMain) {
        //Figure out baseUrl. Get it from the script tag with require.js in it.
        eachReverse(scripts(), function (script) {
            //Set the 'head' where we can append children by
            //using the script's parent.
            if (!head) {
                head = script.parentNode;
            }

            //Look for a data-main attribute to set main script for the page
            //to load. If it is there, the path to data main becomes the
            //baseUrl, if it is not already set.
            dataMain = script.getAttribute('data-main');
            if (dataMain) {
                //Preserve dataMain in case it is a path (i.e. contains '?')
                mainScript = dataMain;

                //Set final baseUrl if there is not already an explicit one.
                if (!cfg.baseUrl) {
                    //Pull off the directory of data-main for use as the
                    //baseUrl.
                    src = mainScript.split('/');
                    mainScript = src.pop();
                    subPath = src.length ? src.join('/')  + '/' : './';

                    cfg.baseUrl = subPath;
                }

                //Strip off any trailing .js since mainScript is now
                //like a module name.
                mainScript = mainScript.replace(jsSuffixRegExp, '');

                 //If mainScript is still a path, fall back to dataMain
                if (req.jsExtRegExp.test(mainScript)) {
                    mainScript = dataMain;
                }

                //Put the data-main script in the files to load.
                cfg.deps = cfg.deps ? cfg.deps.concat(mainScript) : [mainScript];

                return true;
            }
        });
    }

    /**
     * The function that handles definitions of modules. Differs from
     * require() in that a string for the module should be the first argument,
     * and the function to execute after dependencies are loaded should
     * return a value to define the module corresponding to the first argument's
     * name.
     */
    define = function (name, deps, callback) {
        var node, context;

        //Allow for anonymous modules
        if (typeof name !== 'string') {
            //Adjust args appropriately
            callback = deps;
            deps = name;
            name = null;
        }

        //This module may not have dependencies
        if (!isArray(deps)) {
            callback = deps;
            deps = null;
        }

        //If no name, and callback is a function, then figure out if it a
        //CommonJS thing with dependencies.
        if (!deps && isFunction(callback)) {
            deps = [];
            //Remove comments from the callback string,
            //look for require calls, and pull them into the dependencies,
            //but only if there are function args.
            if (callback.length) {
                callback
                    .toString()
                    .replace(commentRegExp, '')
                    .replace(cjsRequireRegExp, function (match, dep) {
                        deps.push(dep);
                    });

                //May be a CommonJS thing even without require calls, but still
                //could use exports, and module. Avoid doing exports and module
                //work though if it just needs require.
                //REQUIRES the function to expect the CommonJS variables in the
                //order listed below.
                deps = (callback.length === 1 ? ['require'] : ['require', 'exports', 'module']).concat(deps);
            }
        }

        //If in IE 6-8 and hit an anonymous define() call, do the interactive
        //work.
        if (useInteractive) {
            node = currentlyAddingScript || getInteractiveScript();
            if (node) {
                if (!name) {
                    name = node.getAttribute('data-requiremodule');
                }
                context = contexts[node.getAttribute('data-requirecontext')];
            }
        }

        //Always save off evaluating the def call until the script onload handler.
        //This allows multiple modules to be in a file without prematurely
        //tracing dependencies, and allows for anonymous module support,
        //where the module name is not known until the script onload event
        //occurs. If no context, use the global queue, and get it processed
        //in the onscript load callback.
        (context ? context.defQueue : globalDefQueue).push([name, deps, callback]);
    };

    define.amd = {
        jQuery: true
    };


    /**
     * Executes the text. Normally just uses eval, but can be modified
     * to use a better, environment-specific call. Only used for transpiling
     * loader plugins, not for plain JS modules.
     * @param {String} text the text to execute/evaluate.
     */
    req.exec = function (text) {
        /*jslint evil: true */
        return eval(text);
    };

    //Set up with config info.
    req(cfg);
}(this));

/**
 * @license
 * pixi.js - v2.1.0
 * Copyright (c) 2012-2014, Mat Groves
 * http://goodboydigital.com/
 *
 * Compiled: 2014-11-12
 *
 * pixi.js is licensed under the MIT License.
 * http://www.opensource.org/licenses/mit-license.php
 */
(function(){var a=this,b=b||{};b.WEBGL_RENDERER=0,b.CANVAS_RENDERER=1,b.VERSION="v2.1.0",b.blendModes={NORMAL:0,ADD:1,MULTIPLY:2,SCREEN:3,OVERLAY:4,DARKEN:5,LIGHTEN:6,COLOR_DODGE:7,COLOR_BURN:8,HARD_LIGHT:9,SOFT_LIGHT:10,DIFFERENCE:11,EXCLUSION:12,HUE:13,SATURATION:14,COLOR:15,LUMINOSITY:16},b.scaleModes={DEFAULT:0,LINEAR:0,NEAREST:1},b._UID=0,"undefined"!=typeof Float32Array?(b.Float32Array=Float32Array,b.Uint16Array=Uint16Array):(b.Float32Array=Array,b.Uint16Array=Array),b.INTERACTION_FREQUENCY=30,b.AUTO_PREVENT_DEFAULT=!0,b.PI_2=2*Math.PI,b.RAD_TO_DEG=180/Math.PI,b.DEG_TO_RAD=Math.PI/180,b.RETINA_PREFIX="@2x",b.dontSayHello=!1,b.defaultRenderOptions={view:null,transparent:!1,antialias:!1,preserveDrawingBuffer:!1,resolution:1,clearBeforeRender:!0,autoResize:!1},b.sayHello=function(a){if(!b.dontSayHello){if(navigator.userAgent.toLowerCase().indexOf("chrome")>-1){var c=["%c %c %c Pixi.js "+b.VERSION+" - "+a+"  %c  %c  http://www.pixijs.com/  %c %c ♥%c♥%c♥ ","background: #ff66a5","background: #ff66a5","color: #ff66a5; background: #030307;","background: #ff66a5","background: #ffc3dc","background: #ff66a5","color: #ff2424; background: #fff","color: #ff2424; background: #fff","color: #ff2424; background: #fff"];console.log.apply(console,c)}else window.console&&console.log("Pixi.js "+b.VERSION+" - http://www.pixijs.com/");b.dontSayHello=!0}},b.Point=function(a,b){this.x=a||0,this.y=b||0},b.Point.prototype.clone=function(){return new b.Point(this.x,this.y)},b.Point.prototype.set=function(a,b){this.x=a||0,this.y=b||(0!==b?this.x:0)},b.Point.prototype.constructor=b.Point,b.Rectangle=function(a,b,c,d){this.x=a||0,this.y=b||0,this.width=c||0,this.height=d||0},b.Rectangle.prototype.clone=function(){return new b.Rectangle(this.x,this.y,this.width,this.height)},b.Rectangle.prototype.contains=function(a,b){if(this.width<=0||this.height<=0)return!1;var c=this.x;if(a>=c&&a<=c+this.width){var d=this.y;if(b>=d&&b<=d+this.height)return!0}return!1},b.Rectangle.prototype.constructor=b.Rectangle,b.EmptyRectangle=new b.Rectangle(0,0,0,0),b.Polygon=function(a){if(a instanceof Array||(a=Array.prototype.slice.call(arguments)),a[0]instanceof b.Point){for(var c=[],d=0,e=a.length;e>d;d++)c.push(a[d].x,a[d].y);a=c}this.closed=!0,this.points=a},b.Polygon.prototype.clone=function(){var a=this.points.slice();return new b.Polygon(a)},b.Polygon.prototype.contains=function(a,b){for(var c=!1,d=this.points.length/2,e=0,f=d-1;d>e;f=e++){var g=this.points[2*e],h=this.points[2*e+1],i=this.points[2*f],j=this.points[2*f+1],k=h>b!=j>b&&(i-g)*(b-h)/(j-h)+g>a;k&&(c=!c)}return c},b.Polygon.prototype.constructor=b.Polygon,b.Circle=function(a,b,c){this.x=a||0,this.y=b||0,this.radius=c||0},b.Circle.prototype.clone=function(){return new b.Circle(this.x,this.y,this.radius)},b.Circle.prototype.contains=function(a,b){if(this.radius<=0)return!1;var c=this.x-a,d=this.y-b,e=this.radius*this.radius;return c*=c,d*=d,e>=c+d},b.Circle.prototype.getBounds=function(){return new b.Rectangle(this.x-this.radius,this.y-this.radius,2*this.radius,2*this.radius)},b.Circle.prototype.constructor=b.Circle,b.Ellipse=function(a,b,c,d){this.x=a||0,this.y=b||0,this.width=c||0,this.height=d||0},b.Ellipse.prototype.clone=function(){return new b.Ellipse(this.x,this.y,this.width,this.height)},b.Ellipse.prototype.contains=function(a,b){if(this.width<=0||this.height<=0)return!1;var c=(a-this.x)/this.width,d=(b-this.y)/this.height;return c*=c,d*=d,1>=c+d},b.Ellipse.prototype.getBounds=function(){return new b.Rectangle(this.x-this.width,this.y-this.height,this.width,this.height)},b.Ellipse.prototype.constructor=b.Ellipse,b.RoundedRectangle=function(a,b,c,d,e){this.x=a||0,this.y=b||0,this.width=c||0,this.height=d||0,this.radius=e||20},b.RoundedRectangle.prototype.clone=function(){return new b.RoundedRectangle(this.x,this.y,this.width,this.height,this.radius)},b.RoundedRectangle.prototype.contains=function(a,b){if(this.width<=0||this.height<=0)return!1;var c=this.x;if(a>=c&&a<=c+this.width){var d=this.y;if(b>=d&&b<=d+this.height)return!0}return!1},b.RoundedRectangle.prototype.constructor=b.RoundedRectangle,b.Matrix=function(){this.a=1,this.b=0,this.c=0,this.d=1,this.tx=0,this.ty=0},b.Matrix.prototype.fromArray=function(a){this.a=a[0],this.b=a[1],this.c=a[3],this.d=a[4],this.tx=a[2],this.ty=a[5]},b.Matrix.prototype.toArray=function(a){this.array||(this.array=new b.Float32Array(9));var c=this.array;return a?(c[0]=this.a,c[1]=this.b,c[2]=0,c[3]=this.c,c[4]=this.d,c[5]=0,c[6]=this.tx,c[7]=this.ty,c[8]=1):(c[0]=this.a,c[1]=this.c,c[2]=this.tx,c[3]=this.b,c[4]=this.d,c[5]=this.ty,c[6]=0,c[7]=0,c[8]=1),c},b.Matrix.prototype.apply=function(a,c){return c=c||new b.Point,c.x=this.a*a.x+this.c*a.y+this.tx,c.y=this.b*a.x+this.d*a.y+this.ty,c},b.Matrix.prototype.applyInverse=function(a,c){c=c||new b.Point;var d=1/(this.a*this.d+this.c*-this.b);return c.x=this.d*d*a.x+-this.c*d*a.y+(this.ty*this.c-this.tx*this.d)*d,c.y=this.a*d*a.y+-this.b*d*a.x+(-this.ty*this.a+this.tx*this.b)*d,c},b.Matrix.prototype.translate=function(a,b){return this.tx+=a,this.ty+=b,this},b.Matrix.prototype.scale=function(a,b){return this.a*=a,this.d*=b,this.c*=a,this.b*=b,this.tx*=a,this.ty*=b,this},b.Matrix.prototype.rotate=function(a){var b=Math.cos(a),c=Math.sin(a),d=this.a,e=this.c,f=this.tx;return this.a=d*b-this.b*c,this.b=d*c+this.b*b,this.c=e*b-this.d*c,this.d=e*c+this.d*b,this.tx=f*b-this.ty*c,this.ty=f*c+this.ty*b,this},b.Matrix.prototype.append=function(a){var b=this.a,c=this.b,d=this.c,e=this.d;return this.a=a.a*b+a.b*d,this.b=a.a*c+a.b*e,this.c=a.c*b+a.d*d,this.d=a.c*c+a.d*e,this.tx=a.tx*b+a.ty*d+this.tx,this.ty=a.tx*c+a.ty*e+this.ty,this},b.Matrix.prototype.identity=function(){return this.a=1,this.b=0,this.c=0,this.d=1,this.tx=0,this.ty=0,this},b.identityMatrix=new b.Matrix,b.DisplayObject=function(){this.position=new b.Point,this.scale=new b.Point(1,1),this.pivot=new b.Point(0,0),this.rotation=0,this.alpha=1,this.visible=!0,this.hitArea=null,this.buttonMode=!1,this.renderable=!1,this.parent=null,this.stage=null,this.worldAlpha=1,this._interactive=!1,this.defaultCursor="pointer",this.worldTransform=new b.Matrix,this._sr=0,this._cr=1,this.filterArea=null,this._bounds=new b.Rectangle(0,0,1,1),this._currentBounds=null,this._mask=null,this._cacheAsBitmap=!1,this._cacheIsDirty=!1},b.DisplayObject.prototype.constructor=b.DisplayObject,Object.defineProperty(b.DisplayObject.prototype,"interactive",{get:function(){return this._interactive},set:function(a){this._interactive=a,this.stage&&(this.stage.dirty=!0)}}),Object.defineProperty(b.DisplayObject.prototype,"worldVisible",{get:function(){var a=this;do{if(!a.visible)return!1;a=a.parent}while(a);return!0}}),Object.defineProperty(b.DisplayObject.prototype,"mask",{get:function(){return this._mask},set:function(a){this._mask&&(this._mask.isMask=!1),this._mask=a,this._mask&&(this._mask.isMask=!0)}}),Object.defineProperty(b.DisplayObject.prototype,"filters",{get:function(){return this._filters},set:function(a){if(a){for(var b=[],c=0;c<a.length;c++)for(var d=a[c].passes,e=0;e<d.length;e++)b.push(d[e]);this._filterBlock={target:this,filterPasses:b}}this._filters=a}}),Object.defineProperty(b.DisplayObject.prototype,"cacheAsBitmap",{get:function(){return this._cacheAsBitmap},set:function(a){this._cacheAsBitmap!==a&&(a?this._generateCachedSprite():this._destroyCachedSprite(),this._cacheAsBitmap=a)}}),b.DisplayObject.prototype.updateTransform=function(){var a,c,d,e,f,g,h=this.parent.worldTransform,i=this.worldTransform;this.rotation%b.PI_2?(this.rotation!==this.rotationCache&&(this.rotationCache=this.rotation,this._sr=Math.sin(this.rotation),this._cr=Math.cos(this.rotation)),a=this._cr*this.scale.x,c=this._sr*this.scale.x,d=-this._sr*this.scale.y,e=this._cr*this.scale.y,f=this.position.x,g=this.position.y,(this.pivot.x||this.pivot.y)&&(f-=this.pivot.x*a+this.pivot.y*d,g-=this.pivot.x*c+this.pivot.y*e),i.a=a*h.a+c*h.c,i.b=a*h.b+c*h.d,i.c=d*h.a+e*h.c,i.d=d*h.b+e*h.d,i.tx=f*h.a+g*h.c+h.tx,i.ty=f*h.b+g*h.d+h.ty):(a=this.scale.x,e=this.scale.y,f=this.position.x-this.pivot.x*a,g=this.position.y-this.pivot.y*e,i.a=a*h.a,i.b=a*h.b,i.c=e*h.c,i.d=e*h.d,i.tx=f*h.a+g*h.c+h.tx,i.ty=f*h.b+g*h.d+h.ty),this.worldAlpha=this.alpha*this.parent.worldAlpha},b.DisplayObject.prototype.displayObjectUpdateTransform=b.DisplayObject.prototype.updateTransform,b.DisplayObject.prototype.getBounds=function(a){return a=a,b.EmptyRectangle},b.DisplayObject.prototype.getLocalBounds=function(){return this.getBounds(b.identityMatrix)},b.DisplayObject.prototype.setStageReference=function(a){this.stage=a,this._interactive&&(this.stage.dirty=!0)},b.DisplayObject.prototype.generateTexture=function(a,c,d){var e=this.getLocalBounds(),f=new b.RenderTexture(0|e.width,0|e.height,d,c,a);return b.DisplayObject._tempMatrix.tx=-e.x,b.DisplayObject._tempMatrix.ty=-e.y,f.render(this,b.DisplayObject._tempMatrix),f},b.DisplayObject.prototype.updateCache=function(){this._generateCachedSprite()},b.DisplayObject.prototype.toGlobal=function(a){return this.updateTransform(),this.worldTransform.apply(a)},b.DisplayObject.prototype.toLocal=function(a,b){return b&&(a=b.toGlobal(a)),this.updateTransform(),this.worldTransform.applyInverse(a)},b.DisplayObject.prototype._renderCachedSprite=function(a){this._cachedSprite.worldAlpha=this.worldAlpha,a.gl?b.Sprite.prototype._renderWebGL.call(this._cachedSprite,a):b.Sprite.prototype._renderCanvas.call(this._cachedSprite,a)},b.DisplayObject.prototype._generateCachedSprite=function(){this._cacheAsBitmap=!1;var a=this.getLocalBounds();if(this._cachedSprite)this._cachedSprite.texture.resize(0|a.width,0|a.height);else{var c=new b.RenderTexture(0|a.width,0|a.height);this._cachedSprite=new b.Sprite(c),this._cachedSprite.worldTransform=this.worldTransform}var d=this._filters;this._filters=null,this._cachedSprite.filters=d,b.DisplayObject._tempMatrix.tx=-a.x,b.DisplayObject._tempMatrix.ty=-a.y,this._cachedSprite.texture.render(this,b.DisplayObject._tempMatrix),this._cachedSprite.anchor.x=-(a.x/a.width),this._cachedSprite.anchor.y=-(a.y/a.height),this._filters=d,this._cacheAsBitmap=!0},b.DisplayObject.prototype._destroyCachedSprite=function(){this._cachedSprite&&(this._cachedSprite.texture.destroy(!0),this._cachedSprite=null)},b.DisplayObject.prototype._renderWebGL=function(a){a=a},b.DisplayObject.prototype._renderCanvas=function(a){a=a},b.DisplayObject._tempMatrix=new b.Matrix,Object.defineProperty(b.DisplayObject.prototype,"x",{get:function(){return this.position.x},set:function(a){this.position.x=a}}),Object.defineProperty(b.DisplayObject.prototype,"y",{get:function(){return this.position.y},set:function(a){this.position.y=a}}),b.DisplayObjectContainer=function(){b.DisplayObject.call(this),this.children=[]},b.DisplayObjectContainer.prototype=Object.create(b.DisplayObject.prototype),b.DisplayObjectContainer.prototype.constructor=b.DisplayObjectContainer,Object.defineProperty(b.DisplayObjectContainer.prototype,"width",{get:function(){return this.scale.x*this.getLocalBounds().width},set:function(a){var b=this.getLocalBounds().width;this.scale.x=0!==b?a/b:1,this._width=a}}),Object.defineProperty(b.DisplayObjectContainer.prototype,"height",{get:function(){return this.scale.y*this.getLocalBounds().height},set:function(a){var b=this.getLocalBounds().height;this.scale.y=0!==b?a/b:1,this._height=a}}),b.DisplayObjectContainer.prototype.addChild=function(a){return this.addChildAt(a,this.children.length)},b.DisplayObjectContainer.prototype.addChildAt=function(a,b){if(b>=0&&b<=this.children.length)return a.parent&&a.parent.removeChild(a),a.parent=this,this.children.splice(b,0,a),this.stage&&a.setStageReference(this.stage),a;throw new Error(a+"addChildAt: The index "+b+" supplied is out of bounds "+this.children.length)},b.DisplayObjectContainer.prototype.swapChildren=function(a,b){if(a!==b){var c=this.getChildIndex(a),d=this.getChildIndex(b);if(0>c||0>d)throw new Error("swapChildren: Both the supplied DisplayObjects must be a child of the caller.");this.children[c]=b,this.children[d]=a}},b.DisplayObjectContainer.prototype.getChildIndex=function(a){var b=this.children.indexOf(a);if(-1===b)throw new Error("The supplied DisplayObject must be a child of the caller");return b},b.DisplayObjectContainer.prototype.setChildIndex=function(a,b){if(0>b||b>=this.children.length)throw new Error("The supplied index is out of bounds");var c=this.getChildIndex(a);this.children.splice(c,1),this.children.splice(b,0,a)},b.DisplayObjectContainer.prototype.getChildAt=function(a){if(0>a||a>=this.children.length)throw new Error("getChildAt: Supplied index "+a+" does not exist in the child list, or the supplied DisplayObject must be a child of the caller");return this.children[a]},b.DisplayObjectContainer.prototype.removeChild=function(a){var b=this.children.indexOf(a);if(-1!==b)return this.removeChildAt(b)},b.DisplayObjectContainer.prototype.removeChildAt=function(a){var b=this.getChildAt(a);return this.stage&&b.removeStageReference(),b.parent=void 0,this.children.splice(a,1),b},b.DisplayObjectContainer.prototype.removeChildren=function(a,b){var c=a||0,d="number"==typeof b?b:this.children.length,e=d-c;if(e>0&&d>=e){for(var f=this.children.splice(c,e),g=0;g<f.length;g++){var h=f[g];this.stage&&h.removeStageReference(),h.parent=void 0}return f}if(0===e&&0===this.children.length)return[];throw new Error("removeChildren: Range Error, numeric values are outside the acceptable range")},b.DisplayObjectContainer.prototype.updateTransform=function(){if(this.visible&&(this.displayObjectUpdateTransform(),!this._cacheAsBitmap))for(var a=0,b=this.children.length;b>a;a++)this.children[a].updateTransform()},b.DisplayObjectContainer.prototype.displayObjectContainerUpdateTransform=b.DisplayObjectContainer.prototype.updateTransform,b.DisplayObjectContainer.prototype.getBounds=function(){if(0===this.children.length)return b.EmptyRectangle;for(var a,c,d,e=1/0,f=1/0,g=-1/0,h=-1/0,i=!1,j=0,k=this.children.length;k>j;j++){var l=this.children[j];l.visible&&(i=!0,a=this.children[j].getBounds(),e=e<a.x?e:a.x,f=f<a.y?f:a.y,c=a.width+a.x,d=a.height+a.y,g=g>c?g:c,h=h>d?h:d)}if(!i)return b.EmptyRectangle;var m=this._bounds;return m.x=e,m.y=f,m.width=g-e,m.height=h-f,m},b.DisplayObjectContainer.prototype.getLocalBounds=function(){var a=this.worldTransform;this.worldTransform=b.identityMatrix;for(var c=0,d=this.children.length;d>c;c++)this.children[c].updateTransform();var e=this.getBounds();return this.worldTransform=a,e},b.DisplayObjectContainer.prototype.setStageReference=function(a){this.stage=a,this._interactive&&(this.stage.dirty=!0);for(var b=0,c=this.children.length;c>b;b++){var d=this.children[b];d.setStageReference(a)}},b.DisplayObjectContainer.prototype.removeStageReference=function(){for(var a=0,b=this.children.length;b>a;a++){var c=this.children[a];c.removeStageReference()}this._interactive&&(this.stage.dirty=!0),this.stage=null},b.DisplayObjectContainer.prototype._renderWebGL=function(a){if(this.visible&&!(this.alpha<=0)){if(this._cacheAsBitmap)return this._renderCachedSprite(a),void 0;var b,c;if(this._mask||this._filters){for(this._filters&&(a.spriteBatch.flush(),a.filterManager.pushFilter(this._filterBlock)),this._mask&&(a.spriteBatch.stop(),a.maskManager.pushMask(this.mask,a),a.spriteBatch.start()),b=0,c=this.children.length;c>b;b++)this.children[b]._renderWebGL(a);a.spriteBatch.stop(),this._mask&&a.maskManager.popMask(this._mask,a),this._filters&&a.filterManager.popFilter(),a.spriteBatch.start()}else for(b=0,c=this.children.length;c>b;b++)this.children[b]._renderWebGL(a)}},b.DisplayObjectContainer.prototype._renderCanvas=function(a){if(this.visible!==!1&&0!==this.alpha){if(this._cacheAsBitmap)return this._renderCachedSprite(a),void 0;this._mask&&a.maskManager.pushMask(this._mask,a);for(var b=0,c=this.children.length;c>b;b++){var d=this.children[b];d._renderCanvas(a)}this._mask&&a.maskManager.popMask(a)}},b.Sprite=function(a){b.DisplayObjectContainer.call(this),this.anchor=new b.Point,this.texture=a,this._width=0,this._height=0,this.tint=16777215,this.blendMode=b.blendModes.NORMAL,this.shader=null,a.baseTexture.hasLoaded?this.onTextureUpdate():this.texture.on("update",this.onTextureUpdate.bind(this)),this.renderable=!0},b.Sprite.prototype=Object.create(b.DisplayObjectContainer.prototype),b.Sprite.prototype.constructor=b.Sprite,Object.defineProperty(b.Sprite.prototype,"width",{get:function(){return this.scale.x*this.texture.frame.width},set:function(a){this.scale.x=a/this.texture.frame.width,this._width=a}}),Object.defineProperty(b.Sprite.prototype,"height",{get:function(){return this.scale.y*this.texture.frame.height},set:function(a){this.scale.y=a/this.texture.frame.height,this._height=a}}),b.Sprite.prototype.setTexture=function(a){this.texture=a,this.cachedTint=16777215},b.Sprite.prototype.onTextureUpdate=function(){this._width&&(this.scale.x=this._width/this.texture.frame.width),this._height&&(this.scale.y=this._height/this.texture.frame.height)},b.Sprite.prototype.getBounds=function(a){var b=this.texture.frame.width,c=this.texture.frame.height,d=b*(1-this.anchor.x),e=b*-this.anchor.x,f=c*(1-this.anchor.y),g=c*-this.anchor.y,h=a||this.worldTransform,i=h.a,j=h.b,k=h.c,l=h.d,m=h.tx,n=h.ty,o=i*e+k*g+m,p=l*g+j*e+n,q=i*d+k*g+m,r=l*g+j*d+n,s=i*d+k*f+m,t=l*f+j*d+n,u=i*e+k*f+m,v=l*f+j*e+n,w=-1/0,x=-1/0,y=1/0,z=1/0;y=y>o?o:y,y=y>q?q:y,y=y>s?s:y,y=y>u?u:y,z=z>p?p:z,z=z>r?r:z,z=z>t?t:z,z=z>v?v:z,w=o>w?o:w,w=q>w?q:w,w=s>w?s:w,w=u>w?u:w,x=p>x?p:x,x=r>x?r:x,x=t>x?t:x,x=v>x?v:x;var A=this._bounds;return A.x=y,A.width=w-y,A.y=z,A.height=x-z,this._currentBounds=A,A},b.Sprite.prototype._renderWebGL=function(a){if(this.visible&&!(this.alpha<=0)){var b,c;if(this._mask||this._filters){var d=a.spriteBatch;for(this._filters&&(d.flush(),a.filterManager.pushFilter(this._filterBlock)),this._mask&&(d.stop(),a.maskManager.pushMask(this.mask,a),d.start()),d.render(this),b=0,c=this.children.length;c>b;b++)this.children[b]._renderWebGL(a);d.stop(),this._mask&&a.maskManager.popMask(this._mask,a),this._filters&&a.filterManager.popFilter(),d.start()}else for(a.spriteBatch.render(this),b=0,c=this.children.length;c>b;b++)this.children[b]._renderWebGL(a)}},b.Sprite.prototype._renderCanvas=function(a){if(!(this.visible===!1||0===this.alpha||this.texture.crop.width<=0||this.texture.crop.height<=0)){if(this.blendMode!==a.currentBlendMode&&(a.currentBlendMode=this.blendMode,a.context.globalCompositeOperation=b.blendModesCanvas[a.currentBlendMode]),this._mask&&a.maskManager.pushMask(this._mask,a),this.texture.valid){var c=this.texture.baseTexture.resolution/a.resolution;a.context.globalAlpha=this.worldAlpha,a.roundPixels?a.context.setTransform(this.worldTransform.a,this.worldTransform.b,this.worldTransform.c,this.worldTransform.d,this.worldTransform.tx*a.resolution|0,this.worldTransform.ty*a.resolution|0):a.context.setTransform(this.worldTransform.a,this.worldTransform.b,this.worldTransform.c,this.worldTransform.d,this.worldTransform.tx*a.resolution,this.worldTransform.ty*a.resolution),a.smoothProperty&&a.scaleMode!==this.texture.baseTexture.scaleMode&&(a.scaleMode=this.texture.baseTexture.scaleMode,a.context[a.smoothProperty]=a.scaleMode===b.scaleModes.LINEAR);var d=this.texture.trim?this.texture.trim.x-this.anchor.x*this.texture.trim.width:this.anchor.x*-this.texture.frame.width,e=this.texture.trim?this.texture.trim.y-this.anchor.y*this.texture.trim.height:this.anchor.y*-this.texture.frame.height;16777215!==this.tint?(this.cachedTint!==this.tint&&(this.cachedTint=this.tint,this.tintedTexture=b.CanvasTinter.getTintedTexture(this,this.tint)),a.context.drawImage(this.tintedTexture,0,0,this.texture.crop.width,this.texture.crop.height,d/c,e/c,this.texture.crop.width/c,this.texture.crop.height/c)):a.context.drawImage(this.texture.baseTexture.source,this.texture.crop.x,this.texture.crop.y,this.texture.crop.width,this.texture.crop.height,d/c,e/c,this.texture.crop.width/c,this.texture.crop.height/c)}for(var f=0,g=this.children.length;g>f;f++)this.children[f]._renderCanvas(a);this._mask&&a.maskManager.popMask(a)}},b.Sprite.fromFrame=function(a){var c=b.TextureCache[a];if(!c)throw new Error('The frameId "'+a+'" does not exist in the texture cache'+this);return new b.Sprite(c)},b.Sprite.fromImage=function(a,c,d){var e=b.Texture.fromImage(a,c,d);return new b.Sprite(e)},b.SpriteBatch=function(a){b.DisplayObjectContainer.call(this),this.textureThing=a,this.ready=!1},b.SpriteBatch.prototype=Object.create(b.DisplayObjectContainer.prototype),b.SpriteBatch.prototype.constructor=b.SpriteBatch,b.SpriteBatch.prototype.initWebGL=function(a){this.fastSpriteBatch=new b.WebGLFastSpriteBatch(a),this.ready=!0},b.SpriteBatch.prototype.updateTransform=function(){b.DisplayObject.prototype.updateTransform.call(this)},b.SpriteBatch.prototype._renderWebGL=function(a){!this.visible||this.alpha<=0||!this.children.length||(this.ready||this.initWebGL(a.gl),a.spriteBatch.stop(),a.shaderManager.setShader(a.shaderManager.fastShader),this.fastSpriteBatch.begin(this,a),this.fastSpriteBatch.render(this),a.spriteBatch.start())},b.SpriteBatch.prototype._renderCanvas=function(a){if(this.visible&&!(this.alpha<=0)&&this.children.length){var c=a.context;c.globalAlpha=this.worldAlpha,b.DisplayObject.prototype.updateTransform.call(this);for(var d=this.worldTransform,e=!0,f=0;f<this.children.length;f++){var g=this.children[f];if(g.visible){var h=g.texture,i=h.frame;if(c.globalAlpha=this.worldAlpha*g.alpha,g.rotation%(2*Math.PI)===0)e&&(c.setTransform(d.a,d.b,d.c,d.d,d.tx,d.ty),e=!1),c.drawImage(h.baseTexture.source,i.x,i.y,i.width,i.height,g.anchor.x*-i.width*g.scale.x+g.position.x+.5|0,g.anchor.y*-i.height*g.scale.y+g.position.y+.5|0,i.width*g.scale.x,i.height*g.scale.y);else{e||(e=!0),b.DisplayObject.prototype.updateTransform.call(g);var j=g.worldTransform;a.roundPixels?c.setTransform(j.a,j.b,j.c,j.d,0|j.tx,0|j.ty):c.setTransform(j.a,j.b,j.c,j.d,j.tx,j.ty),c.drawImage(h.baseTexture.source,i.x,i.y,i.width,i.height,g.anchor.x*-i.width+.5|0,g.anchor.y*-i.height+.5|0,i.width,i.height)}}}}},b.MovieClip=function(a){b.Sprite.call(this,a[0]),this.textures=a,this.animationSpeed=1,this.loop=!0,this.onComplete=null,this.currentFrame=0,this.playing=!1},b.MovieClip.prototype=Object.create(b.Sprite.prototype),b.MovieClip.prototype.constructor=b.MovieClip,Object.defineProperty(b.MovieClip.prototype,"totalFrames",{get:function(){return this.textures.length}}),b.MovieClip.prototype.stop=function(){this.playing=!1},b.MovieClip.prototype.play=function(){this.playing=!0},b.MovieClip.prototype.gotoAndStop=function(a){this.playing=!1,this.currentFrame=a;var b=this.currentFrame+.5|0;this.setTexture(this.textures[b%this.textures.length])},b.MovieClip.prototype.gotoAndPlay=function(a){this.currentFrame=a,this.playing=!0},b.MovieClip.prototype.updateTransform=function(){if(b.Sprite.prototype.updateTransform.call(this),this.playing){this.currentFrame+=this.animationSpeed;var a=this.currentFrame+.5|0;this.currentFrame=this.currentFrame%this.textures.length,this.loop||a<this.textures.length?this.setTexture(this.textures[a%this.textures.length]):a>=this.textures.length&&(this.gotoAndStop(this.textures.length-1),this.onComplete&&this.onComplete())}},b.MovieClip.fromFrames=function(a){for(var c=[],d=0;d<a.length;d++)c.push(new b.Texture.fromFrame(a[d]));return new b.MovieClip(c)},b.MovieClip.fromImages=function(a){for(var c=[],d=0;d<a.length;d++)c.push(new b.Texture.fromImage(a[d]));return new b.MovieClip(c)},b.FilterBlock=function(){this.visible=!0,this.renderable=!0},b.FilterBlock.prototype.constructor=b.FilterBlock,b.Text=function(a,c){this.canvas=document.createElement("canvas"),this.context=this.canvas.getContext("2d"),this.resolution=1,b.Sprite.call(this,b.Texture.fromCanvas(this.canvas)),this.setText(a),this.setStyle(c)},b.Text.prototype=Object.create(b.Sprite.prototype),b.Text.prototype.constructor=b.Text,Object.defineProperty(b.Text.prototype,"width",{get:function(){return this.dirty&&(this.updateText(),this.dirty=!1),this.scale.x*this.texture.frame.width},set:function(a){this.scale.x=a/this.texture.frame.width,this._width=a}}),Object.defineProperty(b.Text.prototype,"height",{get:function(){return this.dirty&&(this.updateText(),this.dirty=!1),this.scale.y*this.texture.frame.height},set:function(a){this.scale.y=a/this.texture.frame.height,this._height=a}}),b.Text.prototype.setStyle=function(a){a=a||{},a.font=a.font||"bold 20pt Arial",a.fill=a.fill||"black",a.align=a.align||"left",a.stroke=a.stroke||"black",a.strokeThickness=a.strokeThickness||0,a.wordWrap=a.wordWrap||!1,a.wordWrapWidth=a.wordWrapWidth||100,a.dropShadow=a.dropShadow||!1,a.dropShadowAngle=a.dropShadowAngle||Math.PI/6,a.dropShadowDistance=a.dropShadowDistance||4,a.dropShadowColor=a.dropShadowColor||"black",this.style=a,this.dirty=!0},b.Text.prototype.setText=function(a){this.text=a.toString()||" ",this.dirty=!0},b.Text.prototype.updateText=function(){this.texture.baseTexture.resolution=this.resolution,this.context.font=this.style.font;var a=this.text;this.style.wordWrap&&(a=this.wordWrap(this.text));for(var b=a.split(/(?:\r\n|\r|\n)/),c=[],d=0,e=this.determineFontProperties(this.style.font),f=0;f<b.length;f++){var g=this.context.measureText(b[f]).width;c[f]=g,d=Math.max(d,g)}var h=d+this.style.strokeThickness;this.style.dropShadow&&(h+=this.style.dropShadowDistance),this.canvas.width=(h+this.context.lineWidth)*this.resolution;var i=e.fontSize+this.style.strokeThickness,j=i*b.length;this.style.dropShadow&&(j+=this.style.dropShadowDistance),this.canvas.height=j*this.resolution,this.context.scale(this.resolution,this.resolution),navigator.isCocoonJS&&this.context.clearRect(0,0,this.canvas.width,this.canvas.height),this.context.font=this.style.font,this.context.strokeStyle=this.style.stroke,this.context.lineWidth=this.style.strokeThickness,this.context.textBaseline="alphabetic";var k,l;if(this.style.dropShadow){this.context.fillStyle=this.style.dropShadowColor;var m=Math.sin(this.style.dropShadowAngle)*this.style.dropShadowDistance,n=Math.cos(this.style.dropShadowAngle)*this.style.dropShadowDistance;for(f=0;f<b.length;f++)k=this.style.strokeThickness/2,l=this.style.strokeThickness/2+f*i+e.ascent,"right"===this.style.align?k+=d-c[f]:"center"===this.style.align&&(k+=(d-c[f])/2),this.style.fill&&this.context.fillText(b[f],k+m,l+n)}for(this.context.fillStyle=this.style.fill,f=0;f<b.length;f++)k=this.style.strokeThickness/2,l=this.style.strokeThickness/2+f*i+e.ascent,"right"===this.style.align?k+=d-c[f]:"center"===this.style.align&&(k+=(d-c[f])/2),this.style.stroke&&this.style.strokeThickness&&this.context.strokeText(b[f],k,l),this.style.fill&&this.context.fillText(b[f],k,l);this.updateTexture()},b.Text.prototype.updateTexture=function(){this.texture.baseTexture.width=this.canvas.width,this.texture.baseTexture.height=this.canvas.height,this.texture.crop.width=this.texture.frame.width=this.canvas.width,this.texture.crop.height=this.texture.frame.height=this.canvas.height,this._width=this.canvas.width,this._height=this.canvas.height,this.texture.baseTexture.dirty()},b.Text.prototype._renderWebGL=function(a){this.dirty&&(this.resolution=a.resolution,this.updateText(),this.dirty=!1),b.Sprite.prototype._renderWebGL.call(this,a)},b.Text.prototype._renderCanvas=function(a){this.dirty&&(this.resolution=a.resolution,this.updateText(),this.dirty=!1),b.Sprite.prototype._renderCanvas.call(this,a)},b.Text.prototype.determineFontProperties=function(a){var c=b.Text.fontPropertiesCache[a];if(!c){c={};var d=b.Text.fontPropertiesCanvas,e=b.Text.fontPropertiesContext;e.font=a;var f=Math.ceil(e.measureText("|Mq").width),g=Math.ceil(e.measureText("M").width),h=2*g;g=1.4*g|0,d.width=f,d.height=h,e.fillStyle="#f00",e.fillRect(0,0,f,h),e.font=a,e.textBaseline="alphabetic",e.fillStyle="#000",e.fillText("|Mq",0,g);var i,j,k=e.getImageData(0,0,f,h).data,l=k.length,m=4*f,n=0,o=!1;for(i=0;g>i;i++){for(j=0;m>j;j+=4)if(255!==k[n+j]){o=!0;break}if(o)break;n+=m}for(c.ascent=g-i,n=l-m,o=!1,i=h;i>g;i--){for(j=0;m>j;j+=4)if(255!==k[n+j]){o=!0;break}if(o)break;n-=m}c.descent=i-g,c.fontSize=c.ascent+c.descent,b.Text.fontPropertiesCache[a]=c}return c},b.Text.prototype.wordWrap=function(a){for(var b="",c=a.split("\n"),d=0;d<c.length;d++){for(var e=this.style.wordWrapWidth,f=c[d].split(" "),g=0;g<f.length;g++){var h=this.context.measureText(f[g]).width,i=h+this.context.measureText(" ").width;0===g||i>e?(g>0&&(b+="\n"),b+=f[g],e=this.style.wordWrapWidth-h):(e-=i,b+=" "+f[g])}d<c.length-1&&(b+="\n")}return b},b.Text.prototype.getBounds=function(a){return this.dirty&&(this.updateText(),this.dirty=!1),b.Sprite.prototype.getBounds.call(this,a)},b.Text.prototype.destroy=function(a){this.context=null,this.canvas=null,this.texture.destroy(void 0===a?!0:a)},b.Text.fontPropertiesCache={},b.Text.fontPropertiesCanvas=document.createElement("canvas"),b.Text.fontPropertiesContext=b.Text.fontPropertiesCanvas.getContext("2d"),b.BitmapText=function(a,c){b.DisplayObjectContainer.call(this),this.textWidth=0,this.textHeight=0,this._pool=[],this.setText(a),this.setStyle(c),this.updateText(),this.dirty=!1},b.BitmapText.prototype=Object.create(b.DisplayObjectContainer.prototype),b.BitmapText.prototype.constructor=b.BitmapText,b.BitmapText.prototype.setText=function(a){this.text=a||" ",this.dirty=!0},b.BitmapText.prototype.setStyle=function(a){a=a||{},a.align=a.align||"left",this.style=a;var c=a.font.split(" ");this.fontName=c[c.length-1],this.fontSize=c.length>=2?parseInt(c[c.length-2],10):b.BitmapText.fonts[this.fontName].size,this.dirty=!0,this.tint=a.tint},b.BitmapText.prototype.updateText=function(){for(var a=b.BitmapText.fonts[this.fontName],c=new b.Point,d=null,e=[],f=0,g=[],h=0,i=this.fontSize/a.size,j=0;j<this.text.length;j++){var k=this.text.charCodeAt(j);if(/(?:\r\n|\r|\n)/.test(this.text.charAt(j)))g.push(c.x),f=Math.max(f,c.x),h++,c.x=0,c.y+=a.lineHeight,d=null;else{var l=a.chars[k];l&&(d&&l.kerning[d]&&(c.x+=l.kerning[d]),e.push({texture:l.texture,line:h,charCode:k,position:new b.Point(c.x+l.xOffset,c.y+l.yOffset)}),c.x+=l.xAdvance,d=k)}}g.push(c.x),f=Math.max(f,c.x);var m=[];for(j=0;h>=j;j++){var n=0;"right"===this.style.align?n=f-g[j]:"center"===this.style.align&&(n=(f-g[j])/2),m.push(n)}var o=this.children.length,p=e.length,q=this.tint||16777215;for(j=0;p>j;j++){var r=o>j?this.children[j]:this._pool.pop();r?r.setTexture(e[j].texture):r=new b.Sprite(e[j].texture),r.position.x=(e[j].position.x+m[e[j].line])*i,r.position.y=e[j].position.y*i,r.scale.x=r.scale.y=i,r.tint=q,r.parent||this.addChild(r)}for(;this.children.length>p;){var s=this.getChildAt(this.children.length-1);this._pool.push(s),this.removeChild(s)}this.textWidth=f*i,this.textHeight=(c.y+a.lineHeight)*i},b.BitmapText.prototype.updateTransform=function(){this.dirty&&(this.updateText(),this.dirty=!1),b.DisplayObjectContainer.prototype.updateTransform.call(this)},b.BitmapText.fonts={},b.InteractionData=function(){this.global=new b.Point,this.target=null,this.originalEvent=null},b.InteractionData.prototype.getLocalPosition=function(a,c){var d=a.worldTransform,e=this.global,f=d.a,g=d.c,h=d.tx,i=d.b,j=d.d,k=d.ty,l=1/(f*j+g*-i);return c=c||new b.Point,c.x=j*l*e.x+-g*l*e.y+(k*g-h*j)*l,c.y=f*l*e.y+-i*l*e.x+(-k*f+h*i)*l,c},b.InteractionData.prototype.constructor=b.InteractionData,b.InteractionManager=function(a){this.stage=a,this.mouse=new b.InteractionData,this.touches={},this.tempPoint=new b.Point,this.mouseoverEnabled=!0,this.pool=[],this.interactiveItems=[],this.interactionDOMElement=null,this.onMouseMove=this.onMouseMove.bind(this),this.onMouseDown=this.onMouseDown.bind(this),this.onMouseOut=this.onMouseOut.bind(this),this.onMouseUp=this.onMouseUp.bind(this),this.onTouchStart=this.onTouchStart.bind(this),this.onTouchEnd=this.onTouchEnd.bind(this),this.onTouchMove=this.onTouchMove.bind(this),this.last=0,this.currentCursorStyle="inherit",this.mouseOut=!1,this.resolution=1},b.InteractionManager.prototype.constructor=b.InteractionManager,b.InteractionManager.prototype.collectInteractiveSprite=function(a,b){for(var c=a.children,d=c.length,e=d-1;e>=0;e--){var f=c[e];f._interactive?(b.interactiveChildren=!0,this.interactiveItems.push(f),f.children.length>0&&this.collectInteractiveSprite(f,f)):(f.__iParent=null,f.children.length>0&&this.collectInteractiveSprite(f,b))
}},b.InteractionManager.prototype.setTarget=function(a){this.target=a,this.resolution=a.resolution,null===this.interactionDOMElement&&this.setTargetDomElement(a.view)},b.InteractionManager.prototype.setTargetDomElement=function(a){this.removeEvents(),window.navigator.msPointerEnabled&&(a.style["-ms-content-zooming"]="none",a.style["-ms-touch-action"]="none"),this.interactionDOMElement=a,a.addEventListener("mousemove",this.onMouseMove,!0),a.addEventListener("mousedown",this.onMouseDown,!0),a.addEventListener("mouseout",this.onMouseOut,!0),a.addEventListener("touchstart",this.onTouchStart,!0),a.addEventListener("touchend",this.onTouchEnd,!0),a.addEventListener("touchmove",this.onTouchMove,!0),window.addEventListener("mouseup",this.onMouseUp,!0)},b.InteractionManager.prototype.removeEvents=function(){this.interactionDOMElement&&(this.interactionDOMElement.style["-ms-content-zooming"]="",this.interactionDOMElement.style["-ms-touch-action"]="",this.interactionDOMElement.removeEventListener("mousemove",this.onMouseMove,!0),this.interactionDOMElement.removeEventListener("mousedown",this.onMouseDown,!0),this.interactionDOMElement.removeEventListener("mouseout",this.onMouseOut,!0),this.interactionDOMElement.removeEventListener("touchstart",this.onTouchStart,!0),this.interactionDOMElement.removeEventListener("touchend",this.onTouchEnd,!0),this.interactionDOMElement.removeEventListener("touchmove",this.onTouchMove,!0),this.interactionDOMElement=null,window.removeEventListener("mouseup",this.onMouseUp,!0))},b.InteractionManager.prototype.update=function(){if(this.target){var a=Date.now(),c=a-this.last;if(c=c*b.INTERACTION_FREQUENCY/1e3,!(1>c)){this.last=a;var d=0;this.dirty&&this.rebuildInteractiveGraph();var e=this.interactiveItems.length,f="inherit",g=!1;for(d=0;e>d;d++){var h=this.interactiveItems[d];h.__hit=this.hitTest(h,this.mouse),this.mouse.target=h,h.__hit&&!g?(h.buttonMode&&(f=h.defaultCursor),h.interactiveChildren||(g=!0),h.__isOver||(h.mouseover&&h.mouseover(this.mouse),h.__isOver=!0)):h.__isOver&&(h.mouseout&&h.mouseout(this.mouse),h.__isOver=!1)}this.currentCursorStyle!==f&&(this.currentCursorStyle=f,this.interactionDOMElement.style.cursor=f)}}},b.InteractionManager.prototype.rebuildInteractiveGraph=function(){this.dirty=!1;for(var a=this.interactiveItems.length,b=0;a>b;b++)this.interactiveItems[b].interactiveChildren=!1;this.interactiveItems=[],this.stage.interactive&&this.interactiveItems.push(this.stage),this.collectInteractiveSprite(this.stage,this.stage)},b.InteractionManager.prototype.onMouseMove=function(a){this.dirty&&this.rebuildInteractiveGraph(),this.mouse.originalEvent=a;var b=this.interactionDOMElement.getBoundingClientRect();this.mouse.global.x=(a.clientX-b.left)*(this.target.width/b.width)/this.resolution,this.mouse.global.y=(a.clientY-b.top)*(this.target.height/b.height)/this.resolution;for(var c=this.interactiveItems.length,d=0;c>d;d++){var e=this.interactiveItems[d];e.mousemove&&e.mousemove(this.mouse)}},b.InteractionManager.prototype.onMouseDown=function(a){this.dirty&&this.rebuildInteractiveGraph(),this.mouse.originalEvent=a,b.AUTO_PREVENT_DEFAULT&&this.mouse.originalEvent.preventDefault();for(var c=this.interactiveItems.length,d=this.mouse.originalEvent,e=2===d.button||3===d.which,f=e?"rightdown":"mousedown",g=e?"rightclick":"click",h=e?"__rightIsDown":"__mouseIsDown",i=e?"__isRightDown":"__isDown",j=0;c>j;j++){var k=this.interactiveItems[j];if((k[f]||k[g])&&(k[h]=!0,k.__hit=this.hitTest(k,this.mouse),k.__hit&&(k[f]&&k[f](this.mouse),k[i]=!0,!k.interactiveChildren)))break}},b.InteractionManager.prototype.onMouseOut=function(a){this.dirty&&this.rebuildInteractiveGraph(),this.mouse.originalEvent=a;var b=this.interactiveItems.length;this.interactionDOMElement.style.cursor="inherit";for(var c=0;b>c;c++){var d=this.interactiveItems[c];d.__isOver&&(this.mouse.target=d,d.mouseout&&d.mouseout(this.mouse),d.__isOver=!1)}this.mouseOut=!0,this.mouse.global.x=-1e4,this.mouse.global.y=-1e4},b.InteractionManager.prototype.onMouseUp=function(a){this.dirty&&this.rebuildInteractiveGraph(),this.mouse.originalEvent=a;for(var b=this.interactiveItems.length,c=!1,d=this.mouse.originalEvent,e=2===d.button||3===d.which,f=e?"rightup":"mouseup",g=e?"rightclick":"click",h=e?"rightupoutside":"mouseupoutside",i=e?"__isRightDown":"__isDown",j=0;b>j;j++){var k=this.interactiveItems[j];(k[g]||k[f]||k[h])&&(k.__hit=this.hitTest(k,this.mouse),k.__hit&&!c?(k[f]&&k[f](this.mouse),k[i]&&k[g]&&k[g](this.mouse),k.interactiveChildren||(c=!0)):k[i]&&k[h]&&k[h](this.mouse),k[i]=!1)}},b.InteractionManager.prototype.hitTest=function(a,c){var d=c.global;if(!a.worldVisible)return!1;var e,f=a.worldTransform,g=f.a,h=f.b,i=f.c,j=f.tx,k=f.d,l=f.ty,m=1/(g*k+i*-h),n=k*m*d.x+-i*m*d.y+(l*i-j*k)*m,o=g*m*d.y+-h*m*d.x+(-l*g+j*h)*m;if(c.target=a,a.hitArea&&a.hitArea.contains)return a.hitArea.contains(n,o)?(c.target=a,!0):!1;if(a instanceof b.Sprite){var p,q=a.texture.frame.width,r=a.texture.frame.height,s=-q*a.anchor.x;if(n>s&&s+q>n&&(p=-r*a.anchor.y,o>p&&p+r>o))return c.target=a,!0}else if(a instanceof b.Graphics){var t=a.graphicsData;for(e=0;e<t.length;e++){var u=t[e];if(u.fill&&u.shape&&u.shape.contains(n,o))return c.target=a,!0}}var v=a.children.length;for(e=0;v>e;e++){var w=a.children[e],x=this.hitTest(w,c);if(x)return c.target=a,!0}return!1},b.InteractionManager.prototype.onTouchMove=function(a){this.dirty&&this.rebuildInteractiveGraph();var b,c=this.interactionDOMElement.getBoundingClientRect(),d=a.changedTouches,e=0;for(e=0;e<d.length;e++){var f=d[e];b=this.touches[f.identifier],b.originalEvent=a,b.global.x=(f.clientX-c.left)*(this.target.width/c.width)/this.resolution,b.global.y=(f.clientY-c.top)*(this.target.height/c.height)/this.resolution,!navigator.isCocoonJS||c.left||c.top||a.target.style.width||a.target.style.height||(b.global.x=f.clientX,b.global.y=f.clientY);for(var g=0;g<this.interactiveItems.length;g++){var h=this.interactiveItems[g];h.touchmove&&h.__touchData&&h.__touchData[f.identifier]&&h.touchmove(b)}}},b.InteractionManager.prototype.onTouchStart=function(a){this.dirty&&this.rebuildInteractiveGraph();var c=this.interactionDOMElement.getBoundingClientRect();b.AUTO_PREVENT_DEFAULT&&a.preventDefault();for(var d=a.changedTouches,e=0;e<d.length;e++){var f=d[e],g=this.pool.pop();g||(g=new b.InteractionData),g.originalEvent=a,this.touches[f.identifier]=g,g.global.x=(f.clientX-c.left)*(this.target.width/c.width)/this.resolution,g.global.y=(f.clientY-c.top)*(this.target.height/c.height)/this.resolution,!navigator.isCocoonJS||c.left||c.top||a.target.style.width||a.target.style.height||(g.global.x=f.clientX,g.global.y=f.clientY);for(var h=this.interactiveItems.length,i=0;h>i;i++){var j=this.interactiveItems[i];if((j.touchstart||j.tap)&&(j.__hit=this.hitTest(j,g),j.__hit&&(j.touchstart&&j.touchstart(g),j.__isDown=!0,j.__touchData=j.__touchData||{},j.__touchData[f.identifier]=g,!j.interactiveChildren)))break}}},b.InteractionManager.prototype.onTouchEnd=function(a){this.dirty&&this.rebuildInteractiveGraph();for(var b=this.interactionDOMElement.getBoundingClientRect(),c=a.changedTouches,d=0;d<c.length;d++){var e=c[d],f=this.touches[e.identifier],g=!1;f.global.x=(e.clientX-b.left)*(this.target.width/b.width)/this.resolution,f.global.y=(e.clientY-b.top)*(this.target.height/b.height)/this.resolution,!navigator.isCocoonJS||b.left||b.top||a.target.style.width||a.target.style.height||(f.global.x=e.clientX,f.global.y=e.clientY);for(var h=this.interactiveItems.length,i=0;h>i;i++){var j=this.interactiveItems[i];j.__touchData&&j.__touchData[e.identifier]&&(j.__hit=this.hitTest(j,j.__touchData[e.identifier]),f.originalEvent=a,(j.touchend||j.tap)&&(j.__hit&&!g?(j.touchend&&j.touchend(f),j.__isDown&&j.tap&&j.tap(f),j.interactiveChildren||(g=!0)):j.__isDown&&j.touchendoutside&&j.touchendoutside(f),j.__isDown=!1),j.__touchData[e.identifier]=null)}this.pool.push(f),this.touches[e.identifier]=null}},b.Stage=function(a){b.DisplayObjectContainer.call(this),this.worldTransform=new b.Matrix,this.interactive=!0,this.interactionManager=new b.InteractionManager(this),this.dirty=!0,this.stage=this,this.stage.hitArea=new b.Rectangle(0,0,1e5,1e5),this.setBackgroundColor(a)},b.Stage.prototype=Object.create(b.DisplayObjectContainer.prototype),b.Stage.prototype.constructor=b.Stage,b.Stage.prototype.setInteractionDelegate=function(a){this.interactionManager.setTargetDomElement(a)},b.Stage.prototype.updateTransform=function(){this.worldAlpha=1;for(var a=0,b=this.children.length;b>a;a++)this.children[a].updateTransform();this.dirty&&(this.dirty=!1,this.interactionManager.dirty=!0),this.interactive&&this.interactionManager.update()},b.Stage.prototype.setBackgroundColor=function(a){this.backgroundColor=a||0,this.backgroundColorSplit=b.hex2rgb(this.backgroundColor);var c=this.backgroundColor.toString(16);c="000000".substr(0,6-c.length)+c,this.backgroundColorString="#"+c},b.Stage.prototype.getMousePosition=function(){return this.interactionManager.mouse.global},function(a){for(var b=0,c=["ms","moz","webkit","o"],d=0;d<c.length&&!a.requestAnimationFrame;++d)a.requestAnimationFrame=a[c[d]+"RequestAnimationFrame"],a.cancelAnimationFrame=a[c[d]+"CancelAnimationFrame"]||a[c[d]+"CancelRequestAnimationFrame"];a.requestAnimationFrame||(a.requestAnimationFrame=function(c){var d=(new Date).getTime(),e=Math.max(0,16-(d-b)),f=a.setTimeout(function(){c(d+e)},e);return b=d+e,f}),a.cancelAnimationFrame||(a.cancelAnimationFrame=function(a){clearTimeout(a)}),a.requestAnimFrame=a.requestAnimationFrame}(this),b.hex2rgb=function(a){return[(a>>16&255)/255,(a>>8&255)/255,(255&a)/255]},b.rgb2hex=function(a){return(255*a[0]<<16)+(255*a[1]<<8)+255*a[2]},"function"!=typeof Function.prototype.bind&&(Function.prototype.bind=function(){return function(a){function b(){for(var d=arguments.length,f=new Array(d);d--;)f[d]=arguments[d];return f=e.concat(f),c.apply(this instanceof b?this:a,f)}var c=this,d=arguments.length-1,e=[];if(d>0)for(e.length=d;d--;)e[d]=arguments[d+1];if("function"!=typeof c)throw new TypeError;return b.prototype=function f(a){return a&&(f.prototype=a),this instanceof f?void 0:new f}(c.prototype),b}}()),b.AjaxRequest=function(){var a=["Msxml2.XMLHTTP.6.0","Msxml2.XMLHTTP.3.0","Microsoft.XMLHTTP"];if(!window.ActiveXObject)return window.XMLHttpRequest?new window.XMLHttpRequest:!1;for(var b=0;b<a.length;b++)try{return new window.ActiveXObject(a[b])}catch(c){}},b.canUseNewCanvasBlendModes=function(){if("undefined"==typeof document)return!1;var a=document.createElement("canvas");a.width=1,a.height=1;var b=a.getContext("2d");return b.fillStyle="#000",b.fillRect(0,0,1,1),b.globalCompositeOperation="multiply",b.fillStyle="#fff",b.fillRect(0,0,1,1),0===b.getImageData(0,0,1,1).data[0]},b.getNextPowerOfTwo=function(a){if(a>0&&0===(a&a-1))return a;for(var b=1;a>b;)b<<=1;return b},b.EventTarget={call:function(a){a&&(a=a.prototype||a,b.EventTarget.mixin(a))},mixin:function(a){a.listeners=function(a){return this._listeners=this._listeners||{},this._listeners[a]?this._listeners[a].slice():[]},a.emit=a.dispatchEvent=function(a,c){if(this._listeners=this._listeners||{},"object"==typeof a&&(c=a,a=a.type),c&&c.__isEventObject===!0||(c=new b.Event(this,a,c)),this._listeners&&this._listeners[a]){var d,e=this._listeners[a].slice(0),f=e.length,g=e[0];for(d=0;f>d;g=e[++d])if(g.call(this,c),c.stoppedImmediate)return this;if(c.stopped)return this}return this.parent&&this.parent.emit&&this.parent.emit.call(this.parent,a,c),this},a.on=a.addEventListener=function(a,b){return this._listeners=this._listeners||{},(this._listeners[a]=this._listeners[a]||[]).push(b),this},a.once=function(a,b){function c(){b.apply(d.off(a,c),arguments)}this._listeners=this._listeners||{};var d=this;return c._originalHandler=b,this.on(a,c)},a.off=a.removeEventListener=function(a,b){if(this._listeners=this._listeners||{},!this._listeners[a])return this;for(var c=this._listeners[a],d=b?c.length:0;d-->0;)(c[d]===b||c[d]._originalHandler===b)&&c.splice(d,1);return 0===c.length&&delete this._listeners[a],this},a.removeAllListeners=function(a){return this._listeners=this._listeners||{},this._listeners[a]?(delete this._listeners[a],this):this}}},b.Event=function(a,b,c){this.__isEventObject=!0,this.stopped=!1,this.stoppedImmediate=!1,this.target=a,this.type=b,this.data=c,this.content=c,this.timeStamp=Date.now()},b.Event.prototype.stopPropagation=function(){this.stopped=!0},b.Event.prototype.stopImmediatePropagation=function(){this.stoppedImmediate=!0},b.autoDetectRenderer=function(a,c,d){a||(a=800),c||(c=600);var e=function(){try{var a=document.createElement("canvas");return!!window.WebGLRenderingContext&&(a.getContext("webgl")||a.getContext("experimental-webgl"))}catch(b){return!1}}();return e?new b.WebGLRenderer(a,c,d):new b.CanvasRenderer(a,c,d)},b.autoDetectRecommendedRenderer=function(a,c,d){a||(a=800),c||(c=600);var e=function(){try{var a=document.createElement("canvas");return!!window.WebGLRenderingContext&&(a.getContext("webgl")||a.getContext("experimental-webgl"))}catch(b){return!1}}(),f=/Android/i.test(navigator.userAgent);return e&&!f?new b.WebGLRenderer(a,c,d):new b.CanvasRenderer(a,c,d)},b.PolyK={},b.PolyK.Triangulate=function(a){var c=!0,d=a.length>>1;if(3>d)return[];for(var e=[],f=[],g=0;d>g;g++)f.push(g);g=0;for(var h=d;h>3;){var i=f[(g+0)%h],j=f[(g+1)%h],k=f[(g+2)%h],l=a[2*i],m=a[2*i+1],n=a[2*j],o=a[2*j+1],p=a[2*k],q=a[2*k+1],r=!1;if(b.PolyK._convex(l,m,n,o,p,q,c)){r=!0;for(var s=0;h>s;s++){var t=f[s];if(t!==i&&t!==j&&t!==k&&b.PolyK._PointInTriangle(a[2*t],a[2*t+1],l,m,n,o,p,q)){r=!1;break}}}if(r)e.push(i,j,k),f.splice((g+1)%h,1),h--,g=0;else if(g++>3*h){if(!c)return null;for(e=[],f=[],g=0;d>g;g++)f.push(g);g=0,h=d,c=!1}}return e.push(f[0],f[1],f[2]),e},b.PolyK._PointInTriangle=function(a,b,c,d,e,f,g,h){var i=g-c,j=h-d,k=e-c,l=f-d,m=a-c,n=b-d,o=i*i+j*j,p=i*k+j*l,q=i*m+j*n,r=k*k+l*l,s=k*m+l*n,t=1/(o*r-p*p),u=(r*q-p*s)*t,v=(o*s-p*q)*t;return u>=0&&v>=0&&1>u+v},b.PolyK._convex=function(a,b,c,d,e,f,g){return(b-d)*(e-c)+(c-a)*(f-d)>=0===g},b.initDefaultShaders=function(){},b.CompileVertexShader=function(a,c){return b._CompileShader(a,c,a.VERTEX_SHADER)},b.CompileFragmentShader=function(a,c){return b._CompileShader(a,c,a.FRAGMENT_SHADER)},b._CompileShader=function(a,b,c){var d=b.join("\n"),e=a.createShader(c);return a.shaderSource(e,d),a.compileShader(e),a.getShaderParameter(e,a.COMPILE_STATUS)?e:(window.console.log(a.getShaderInfoLog(e)),null)},b.compileProgram=function(a,c,d){var e=b.CompileFragmentShader(a,d),f=b.CompileVertexShader(a,c),g=a.createProgram();return a.attachShader(g,f),a.attachShader(g,e),a.linkProgram(g),a.getProgramParameter(g,a.LINK_STATUS)||window.console.log("Could not initialise shaders"),g},b.PixiShader=function(a){this._UID=b._UID++,this.gl=a,this.program=null,this.fragmentSrc=["precision lowp float;","varying vec2 vTextureCoord;","varying vec4 vColor;","uniform sampler2D uSampler;","void main(void) {","   gl_FragColor = texture2D(uSampler, vTextureCoord) * vColor ;","}"],this.textureCount=0,this.firstRun=!0,this.dirty=!0,this.attributes=[],this.init()},b.PixiShader.prototype.constructor=b.PixiShader,b.PixiShader.prototype.init=function(){var a=this.gl,c=b.compileProgram(a,this.vertexSrc||b.PixiShader.defaultVertexSrc,this.fragmentSrc);a.useProgram(c),this.uSampler=a.getUniformLocation(c,"uSampler"),this.projectionVector=a.getUniformLocation(c,"projectionVector"),this.offsetVector=a.getUniformLocation(c,"offsetVector"),this.dimensions=a.getUniformLocation(c,"dimensions"),this.aVertexPosition=a.getAttribLocation(c,"aVertexPosition"),this.aTextureCoord=a.getAttribLocation(c,"aTextureCoord"),this.colorAttribute=a.getAttribLocation(c,"aColor"),-1===this.colorAttribute&&(this.colorAttribute=2),this.attributes=[this.aVertexPosition,this.aTextureCoord,this.colorAttribute];for(var d in this.uniforms)this.uniforms[d].uniformLocation=a.getUniformLocation(c,d);this.initUniforms(),this.program=c},b.PixiShader.prototype.initUniforms=function(){this.textureCount=1;var a,b=this.gl;for(var c in this.uniforms){a=this.uniforms[c];var d=a.type;"sampler2D"===d?(a._init=!1,null!==a.value&&this.initSampler2D(a)):"mat2"===d||"mat3"===d||"mat4"===d?(a.glMatrix=!0,a.glValueLength=1,"mat2"===d?a.glFunc=b.uniformMatrix2fv:"mat3"===d?a.glFunc=b.uniformMatrix3fv:"mat4"===d&&(a.glFunc=b.uniformMatrix4fv)):(a.glFunc=b["uniform"+d],a.glValueLength="2f"===d||"2i"===d?2:"3f"===d||"3i"===d?3:"4f"===d||"4i"===d?4:1)}},b.PixiShader.prototype.initSampler2D=function(a){if(a.value&&a.value.baseTexture&&a.value.baseTexture.hasLoaded){var b=this.gl;if(b.activeTexture(b["TEXTURE"+this.textureCount]),b.bindTexture(b.TEXTURE_2D,a.value.baseTexture._glTextures[b.id]),a.textureData){var c=a.textureData,d=c.magFilter?c.magFilter:b.LINEAR,e=c.minFilter?c.minFilter:b.LINEAR,f=c.wrapS?c.wrapS:b.CLAMP_TO_EDGE,g=c.wrapT?c.wrapT:b.CLAMP_TO_EDGE,h=c.luminance?b.LUMINANCE:b.RGBA;if(c.repeat&&(f=b.REPEAT,g=b.REPEAT),b.pixelStorei(b.UNPACK_FLIP_Y_WEBGL,!!c.flipY),c.width){var i=c.width?c.width:512,j=c.height?c.height:2,k=c.border?c.border:0;b.texImage2D(b.TEXTURE_2D,0,h,i,j,k,h,b.UNSIGNED_BYTE,null)}else b.texImage2D(b.TEXTURE_2D,0,h,b.RGBA,b.UNSIGNED_BYTE,a.value.baseTexture.source);b.texParameteri(b.TEXTURE_2D,b.TEXTURE_MAG_FILTER,d),b.texParameteri(b.TEXTURE_2D,b.TEXTURE_MIN_FILTER,e),b.texParameteri(b.TEXTURE_2D,b.TEXTURE_WRAP_S,f),b.texParameteri(b.TEXTURE_2D,b.TEXTURE_WRAP_T,g)}b.uniform1i(a.uniformLocation,this.textureCount),a._init=!0,this.textureCount++}},b.PixiShader.prototype.syncUniforms=function(){this.textureCount=1;var a,c=this.gl;for(var d in this.uniforms)a=this.uniforms[d],1===a.glValueLength?a.glMatrix===!0?a.glFunc.call(c,a.uniformLocation,a.transpose,a.value):a.glFunc.call(c,a.uniformLocation,a.value):2===a.glValueLength?a.glFunc.call(c,a.uniformLocation,a.value.x,a.value.y):3===a.glValueLength?a.glFunc.call(c,a.uniformLocation,a.value.x,a.value.y,a.value.z):4===a.glValueLength?a.glFunc.call(c,a.uniformLocation,a.value.x,a.value.y,a.value.z,a.value.w):"sampler2D"===a.type&&(a._init?(c.activeTexture(c["TEXTURE"+this.textureCount]),a.value.baseTexture._dirty[c.id]?b.instances[c.id].updateTexture(a.value.baseTexture):c.bindTexture(c.TEXTURE_2D,a.value.baseTexture._glTextures[c.id]),c.uniform1i(a.uniformLocation,this.textureCount),this.textureCount++):this.initSampler2D(a))},b.PixiShader.prototype.destroy=function(){this.gl.deleteProgram(this.program),this.uniforms=null,this.gl=null,this.attributes=null},b.PixiShader.defaultVertexSrc=["attribute vec2 aVertexPosition;","attribute vec2 aTextureCoord;","attribute vec4 aColor;","uniform vec2 projectionVector;","uniform vec2 offsetVector;","varying vec2 vTextureCoord;","varying vec4 vColor;","const vec2 center = vec2(-1.0, 1.0);","void main(void) {","   gl_Position = vec4( ((aVertexPosition + offsetVector) / projectionVector) + center , 0.0, 1.0);","   vTextureCoord = aTextureCoord;","   vec3 color = mod(vec3(aColor.y/65536.0, aColor.y/256.0, aColor.y), 256.0) / 256.0;","   vColor = vec4(color * aColor.x, aColor.x);","}"],b.PixiFastShader=function(a){this._UID=b._UID++,this.gl=a,this.program=null,this.fragmentSrc=["precision lowp float;","varying vec2 vTextureCoord;","varying float vColor;","uniform sampler2D uSampler;","void main(void) {","   gl_FragColor = texture2D(uSampler, vTextureCoord) * vColor ;","}"],this.vertexSrc=["attribute vec2 aVertexPosition;","attribute vec2 aPositionCoord;","attribute vec2 aScale;","attribute float aRotation;","attribute vec2 aTextureCoord;","attribute float aColor;","uniform vec2 projectionVector;","uniform vec2 offsetVector;","uniform mat3 uMatrix;","varying vec2 vTextureCoord;","varying float vColor;","const vec2 center = vec2(-1.0, 1.0);","void main(void) {","   vec2 v;","   vec2 sv = aVertexPosition * aScale;","   v.x = (sv.x) * cos(aRotation) - (sv.y) * sin(aRotation);","   v.y = (sv.x) * sin(aRotation) + (sv.y) * cos(aRotation);","   v = ( uMatrix * vec3(v + aPositionCoord , 1.0) ).xy ;","   gl_Position = vec4( ( v / projectionVector) + center , 0.0, 1.0);","   vTextureCoord = aTextureCoord;","   vColor = aColor;","}"],this.textureCount=0,this.init()},b.PixiFastShader.prototype.constructor=b.PixiFastShader,b.PixiFastShader.prototype.init=function(){var a=this.gl,c=b.compileProgram(a,this.vertexSrc,this.fragmentSrc);a.useProgram(c),this.uSampler=a.getUniformLocation(c,"uSampler"),this.projectionVector=a.getUniformLocation(c,"projectionVector"),this.offsetVector=a.getUniformLocation(c,"offsetVector"),this.dimensions=a.getUniformLocation(c,"dimensions"),this.uMatrix=a.getUniformLocation(c,"uMatrix"),this.aVertexPosition=a.getAttribLocation(c,"aVertexPosition"),this.aPositionCoord=a.getAttribLocation(c,"aPositionCoord"),this.aScale=a.getAttribLocation(c,"aScale"),this.aRotation=a.getAttribLocation(c,"aRotation"),this.aTextureCoord=a.getAttribLocation(c,"aTextureCoord"),this.colorAttribute=a.getAttribLocation(c,"aColor"),-1===this.colorAttribute&&(this.colorAttribute=2),this.attributes=[this.aVertexPosition,this.aPositionCoord,this.aScale,this.aRotation,this.aTextureCoord,this.colorAttribute],this.program=c},b.PixiFastShader.prototype.destroy=function(){this.gl.deleteProgram(this.program),this.uniforms=null,this.gl=null,this.attributes=null},b.StripShader=function(a){this._UID=b._UID++,this.gl=a,this.program=null,this.fragmentSrc=["precision mediump float;","varying vec2 vTextureCoord;","uniform float alpha;","uniform sampler2D uSampler;","void main(void) {","   gl_FragColor = texture2D(uSampler, vec2(vTextureCoord.x, vTextureCoord.y)) * alpha;","}"],this.vertexSrc=["attribute vec2 aVertexPosition;","attribute vec2 aTextureCoord;","uniform mat3 translationMatrix;","uniform vec2 projectionVector;","uniform vec2 offsetVector;","varying vec2 vTextureCoord;","void main(void) {","   vec3 v = translationMatrix * vec3(aVertexPosition , 1.0);","   v -= offsetVector.xyx;","   gl_Position = vec4( v.x / projectionVector.x -1.0, v.y / -projectionVector.y + 1.0 , 0.0, 1.0);","   vTextureCoord = aTextureCoord;","}"],this.init()},b.StripShader.prototype.constructor=b.StripShader,b.StripShader.prototype.init=function(){var a=this.gl,c=b.compileProgram(a,this.vertexSrc,this.fragmentSrc);a.useProgram(c),this.uSampler=a.getUniformLocation(c,"uSampler"),this.projectionVector=a.getUniformLocation(c,"projectionVector"),this.offsetVector=a.getUniformLocation(c,"offsetVector"),this.colorAttribute=a.getAttribLocation(c,"aColor"),this.aVertexPosition=a.getAttribLocation(c,"aVertexPosition"),this.aTextureCoord=a.getAttribLocation(c,"aTextureCoord"),this.attributes=[this.aVertexPosition,this.aTextureCoord],this.translationMatrix=a.getUniformLocation(c,"translationMatrix"),this.alpha=a.getUniformLocation(c,"alpha"),this.program=c},b.StripShader.prototype.destroy=function(){this.gl.deleteProgram(this.program),this.uniforms=null,this.gl=null,this.attribute=null},b.PrimitiveShader=function(a){this._UID=b._UID++,this.gl=a,this.program=null,this.fragmentSrc=["precision mediump float;","varying vec4 vColor;","void main(void) {","   gl_FragColor = vColor;","}"],this.vertexSrc=["attribute vec2 aVertexPosition;","attribute vec4 aColor;","uniform mat3 translationMatrix;","uniform vec2 projectionVector;","uniform vec2 offsetVector;","uniform float alpha;","uniform vec3 tint;","varying vec4 vColor;","void main(void) {","   vec3 v = translationMatrix * vec3(aVertexPosition , 1.0);","   v -= offsetVector.xyx;","   gl_Position = vec4( v.x / projectionVector.x -1.0, v.y / -projectionVector.y + 1.0 , 0.0, 1.0);","   vColor = aColor * vec4(tint * alpha, alpha);","}"],this.init()},b.PrimitiveShader.prototype.constructor=b.PrimitiveShader,b.PrimitiveShader.prototype.init=function(){var a=this.gl,c=b.compileProgram(a,this.vertexSrc,this.fragmentSrc);a.useProgram(c),this.projectionVector=a.getUniformLocation(c,"projectionVector"),this.offsetVector=a.getUniformLocation(c,"offsetVector"),this.tintColor=a.getUniformLocation(c,"tint"),this.aVertexPosition=a.getAttribLocation(c,"aVertexPosition"),this.colorAttribute=a.getAttribLocation(c,"aColor"),this.attributes=[this.aVertexPosition,this.colorAttribute],this.translationMatrix=a.getUniformLocation(c,"translationMatrix"),this.alpha=a.getUniformLocation(c,"alpha"),this.program=c},b.PrimitiveShader.prototype.destroy=function(){this.gl.deleteProgram(this.program),this.uniforms=null,this.gl=null,this.attributes=null},b.ComplexPrimitiveShader=function(a){this._UID=b._UID++,this.gl=a,this.program=null,this.fragmentSrc=["precision mediump float;","varying vec4 vColor;","void main(void) {","   gl_FragColor = vColor;","}"],this.vertexSrc=["attribute vec2 aVertexPosition;","uniform mat3 translationMatrix;","uniform vec2 projectionVector;","uniform vec2 offsetVector;","uniform vec3 tint;","uniform float alpha;","uniform vec3 color;","varying vec4 vColor;","void main(void) {","   vec3 v = translationMatrix * vec3(aVertexPosition , 1.0);","   v -= offsetVector.xyx;","   gl_Position = vec4( v.x / projectionVector.x -1.0, v.y / -projectionVector.y + 1.0 , 0.0, 1.0);","   vColor = vec4(color * alpha * tint, alpha);","}"],this.init()},b.ComplexPrimitiveShader.prototype.constructor=b.ComplexPrimitiveShader,b.ComplexPrimitiveShader.prototype.init=function(){var a=this.gl,c=b.compileProgram(a,this.vertexSrc,this.fragmentSrc);a.useProgram(c),this.projectionVector=a.getUniformLocation(c,"projectionVector"),this.offsetVector=a.getUniformLocation(c,"offsetVector"),this.tintColor=a.getUniformLocation(c,"tint"),this.color=a.getUniformLocation(c,"color"),this.aVertexPosition=a.getAttribLocation(c,"aVertexPosition"),this.attributes=[this.aVertexPosition,this.colorAttribute],this.translationMatrix=a.getUniformLocation(c,"translationMatrix"),this.alpha=a.getUniformLocation(c,"alpha"),this.program=c},b.ComplexPrimitiveShader.prototype.destroy=function(){this.gl.deleteProgram(this.program),this.uniforms=null,this.gl=null,this.attribute=null},b.WebGLGraphics=function(){},b.WebGLGraphics.renderGraphics=function(a,c){var d,e=c.gl,f=c.projection,g=c.offset,h=c.shaderManager.primitiveShader;a.dirty&&b.WebGLGraphics.updateGraphics(a,e);for(var i=a._webGL[e.id],j=0;j<i.data.length;j++)1===i.data[j].mode?(d=i.data[j],c.stencilManager.pushStencil(a,d,c),e.drawElements(e.TRIANGLE_FAN,4,e.UNSIGNED_SHORT,2*(d.indices.length-4)),c.stencilManager.popStencil(a,d,c)):(d=i.data[j],c.shaderManager.setShader(h),h=c.shaderManager.primitiveShader,e.uniformMatrix3fv(h.translationMatrix,!1,a.worldTransform.toArray(!0)),e.uniform2f(h.projectionVector,f.x,-f.y),e.uniform2f(h.offsetVector,-g.x,-g.y),e.uniform3fv(h.tintColor,b.hex2rgb(a.tint)),e.uniform1f(h.alpha,a.worldAlpha),e.bindBuffer(e.ARRAY_BUFFER,d.buffer),e.vertexAttribPointer(h.aVertexPosition,2,e.FLOAT,!1,24,0),e.vertexAttribPointer(h.colorAttribute,4,e.FLOAT,!1,24,8),e.bindBuffer(e.ELEMENT_ARRAY_BUFFER,d.indexBuffer),e.drawElements(e.TRIANGLE_STRIP,d.indices.length,e.UNSIGNED_SHORT,0))},b.WebGLGraphics.updateGraphics=function(a,c){var d=a._webGL[c.id];d||(d=a._webGL[c.id]={lastIndex:0,data:[],gl:c}),a.dirty=!1;var e;if(a.clearDirty){for(a.clearDirty=!1,e=0;e<d.data.length;e++){var f=d.data[e];f.reset(),b.WebGLGraphics.graphicsDataPool.push(f)}d.data=[],d.lastIndex=0}var g;for(e=d.lastIndex;e<a.graphicsData.length;e++){var h=a.graphicsData[e];if(h.type===b.Graphics.POLY){if(h.points=h.shape.points.slice(),h.shape.closed&&h.points[0]!==h.points[h.points.length-2]&&h.points[1]!==h.points[h.points.length-1]&&h.points.push(h.points[0],h.points[1]),h.fill&&h.points.length>=6)if(h.points.length<12){g=b.WebGLGraphics.switchMode(d,0);var i=b.WebGLGraphics.buildPoly(h,g);i||(g=b.WebGLGraphics.switchMode(d,1),b.WebGLGraphics.buildComplexPoly(h,g))}else g=b.WebGLGraphics.switchMode(d,1),b.WebGLGraphics.buildComplexPoly(h,g);h.lineWidth>0&&(g=b.WebGLGraphics.switchMode(d,0),b.WebGLGraphics.buildLine(h,g))}else g=b.WebGLGraphics.switchMode(d,0),h.type===b.Graphics.RECT?b.WebGLGraphics.buildRectangle(h,g):h.type===b.Graphics.CIRC||h.type===b.Graphics.ELIP?b.WebGLGraphics.buildCircle(h,g):h.type===b.Graphics.RREC&&b.WebGLGraphics.buildRoundedRectangle(h,g);d.lastIndex++}for(e=0;e<d.data.length;e++)g=d.data[e],g.dirty&&g.upload()},b.WebGLGraphics.switchMode=function(a,c){var d;return a.data.length?(d=a.data[a.data.length-1],(d.mode!==c||1===c)&&(d=b.WebGLGraphics.graphicsDataPool.pop()||new b.WebGLGraphicsData(a.gl),d.mode=c,a.data.push(d))):(d=b.WebGLGraphics.graphicsDataPool.pop()||new b.WebGLGraphicsData(a.gl),d.mode=c,a.data.push(d)),d.dirty=!0,d},b.WebGLGraphics.buildRectangle=function(a,c){var d=a.shape,e=d.x,f=d.y,g=d.width,h=d.height;if(a.fill){var i=b.hex2rgb(a.fillColor),j=a.fillAlpha,k=i[0]*j,l=i[1]*j,m=i[2]*j,n=c.points,o=c.indices,p=n.length/6;n.push(e,f),n.push(k,l,m,j),n.push(e+g,f),n.push(k,l,m,j),n.push(e,f+h),n.push(k,l,m,j),n.push(e+g,f+h),n.push(k,l,m,j),o.push(p,p,p+1,p+2,p+3,p+3)}if(a.lineWidth){var q=a.points;a.points=[e,f,e+g,f,e+g,f+h,e,f+h,e,f],b.WebGLGraphics.buildLine(a,c),a.points=q}},b.WebGLGraphics.buildRoundedRectangle=function(a,c){var d=a.shape,e=d.x,f=d.y,g=d.width,h=d.height,i=d.radius,j=[];if(j.push(e,f+i),j=j.concat(b.WebGLGraphics.quadraticBezierCurve(e,f+h-i,e,f+h,e+i,f+h)),j=j.concat(b.WebGLGraphics.quadraticBezierCurve(e+g-i,f+h,e+g,f+h,e+g,f+h-i)),j=j.concat(b.WebGLGraphics.quadraticBezierCurve(e+g,f+i,e+g,f,e+g-i,f)),j=j.concat(b.WebGLGraphics.quadraticBezierCurve(e+i,f,e,f,e,f+i)),a.fill){var k=b.hex2rgb(a.fillColor),l=a.fillAlpha,m=k[0]*l,n=k[1]*l,o=k[2]*l,p=c.points,q=c.indices,r=p.length/6,s=b.PolyK.Triangulate(j),t=0;for(t=0;t<s.length;t+=3)q.push(s[t]+r),q.push(s[t]+r),q.push(s[t+1]+r),q.push(s[t+2]+r),q.push(s[t+2]+r);for(t=0;t<j.length;t++)p.push(j[t],j[++t],m,n,o,l)}if(a.lineWidth){var u=a.points;a.points=j,b.WebGLGraphics.buildLine(a,c),a.points=u}},b.WebGLGraphics.quadraticBezierCurve=function(a,b,c,d,e,f){function g(a,b,c){var d=b-a;return a+d*c}for(var h,i,j,k,l,m,n=20,o=[],p=0,q=0;n>=q;q++)p=q/n,h=g(a,c,p),i=g(b,d,p),j=g(c,e,p),k=g(d,f,p),l=g(h,j,p),m=g(i,k,p),o.push(l,m);return o},b.WebGLGraphics.buildCircle=function(a,c){var d,e,f=a.shape,g=f.x,h=f.y;a.type===b.Graphics.CIRC?(d=f.radius,e=f.radius):(d=f.width,e=f.height);var i=40,j=2*Math.PI/i,k=0;if(a.fill){var l=b.hex2rgb(a.fillColor),m=a.fillAlpha,n=l[0]*m,o=l[1]*m,p=l[2]*m,q=c.points,r=c.indices,s=q.length/6;for(r.push(s),k=0;i+1>k;k++)q.push(g,h,n,o,p,m),q.push(g+Math.sin(j*k)*d,h+Math.cos(j*k)*e,n,o,p,m),r.push(s++,s++);r.push(s-1)}if(a.lineWidth){var t=a.points;for(a.points=[],k=0;i+1>k;k++)a.points.push(g+Math.sin(j*k)*d,h+Math.cos(j*k)*e);b.WebGLGraphics.buildLine(a,c),a.points=t}},b.WebGLGraphics.buildLine=function(a,c){var d=0,e=a.points;if(0!==e.length){if(a.lineWidth%2)for(d=0;d<e.length;d++)e[d]+=.5;var f=new b.Point(e[0],e[1]),g=new b.Point(e[e.length-2],e[e.length-1]);if(f.x===g.x&&f.y===g.y){e=e.slice(),e.pop(),e.pop(),g=new b.Point(e[e.length-2],e[e.length-1]);var h=g.x+.5*(f.x-g.x),i=g.y+.5*(f.y-g.y);e.unshift(h,i),e.push(h,i)}var j,k,l,m,n,o,p,q,r,s,t,u,v,w,x,y,z,A,B,C,D,E,F,G=c.points,H=c.indices,I=e.length/2,J=e.length,K=G.length/6,L=a.lineWidth/2,M=b.hex2rgb(a.lineColor),N=a.lineAlpha,O=M[0]*N,P=M[1]*N,Q=M[2]*N;for(l=e[0],m=e[1],n=e[2],o=e[3],r=-(m-o),s=l-n,F=Math.sqrt(r*r+s*s),r/=F,s/=F,r*=L,s*=L,G.push(l-r,m-s,O,P,Q,N),G.push(l+r,m+s,O,P,Q,N),d=1;I-1>d;d++)l=e[2*(d-1)],m=e[2*(d-1)+1],n=e[2*d],o=e[2*d+1],p=e[2*(d+1)],q=e[2*(d+1)+1],r=-(m-o),s=l-n,F=Math.sqrt(r*r+s*s),r/=F,s/=F,r*=L,s*=L,t=-(o-q),u=n-p,F=Math.sqrt(t*t+u*u),t/=F,u/=F,t*=L,u*=L,x=-s+m-(-s+o),y=-r+n-(-r+l),z=(-r+l)*(-s+o)-(-r+n)*(-s+m),A=-u+q-(-u+o),B=-t+n-(-t+p),C=(-t+p)*(-u+o)-(-t+n)*(-u+q),D=x*B-A*y,Math.abs(D)<.1?(D+=10.1,G.push(n-r,o-s,O,P,Q,N),G.push(n+r,o+s,O,P,Q,N)):(j=(y*C-B*z)/D,k=(A*z-x*C)/D,E=(j-n)*(j-n)+(k-o)+(k-o),E>19600?(v=r-t,w=s-u,F=Math.sqrt(v*v+w*w),v/=F,w/=F,v*=L,w*=L,G.push(n-v,o-w),G.push(O,P,Q,N),G.push(n+v,o+w),G.push(O,P,Q,N),G.push(n-v,o-w),G.push(O,P,Q,N),J++):(G.push(j,k),G.push(O,P,Q,N),G.push(n-(j-n),o-(k-o)),G.push(O,P,Q,N)));for(l=e[2*(I-2)],m=e[2*(I-2)+1],n=e[2*(I-1)],o=e[2*(I-1)+1],r=-(m-o),s=l-n,F=Math.sqrt(r*r+s*s),r/=F,s/=F,r*=L,s*=L,G.push(n-r,o-s),G.push(O,P,Q,N),G.push(n+r,o+s),G.push(O,P,Q,N),H.push(K),d=0;J>d;d++)H.push(K++);
H.push(K-1)}},b.WebGLGraphics.buildComplexPoly=function(a,c){var d=a.points.slice();if(!(d.length<6)){var e=c.indices;c.points=d,c.alpha=a.fillAlpha,c.color=b.hex2rgb(a.fillColor);for(var f,g,h=1/0,i=-1/0,j=1/0,k=-1/0,l=0;l<d.length;l+=2)f=d[l],g=d[l+1],h=h>f?f:h,i=f>i?f:i,j=j>g?g:j,k=g>k?g:k;d.push(h,j,i,j,i,k,h,k);var m=d.length/2;for(l=0;m>l;l++)e.push(l)}},b.WebGLGraphics.buildPoly=function(a,c){var d=a.points;if(!(d.length<6)){var e=c.points,f=c.indices,g=d.length/2,h=b.hex2rgb(a.fillColor),i=a.fillAlpha,j=h[0]*i,k=h[1]*i,l=h[2]*i,m=b.PolyK.Triangulate(d);if(!m)return!1;var n=e.length/6,o=0;for(o=0;o<m.length;o+=3)f.push(m[o]+n),f.push(m[o]+n),f.push(m[o+1]+n),f.push(m[o+2]+n),f.push(m[o+2]+n);for(o=0;g>o;o++)e.push(d[2*o],d[2*o+1],j,k,l,i);return!0}},b.WebGLGraphics.graphicsDataPool=[],b.WebGLGraphicsData=function(a){this.gl=a,this.color=[0,0,0],this.points=[],this.indices=[],this.lastIndex=0,this.buffer=a.createBuffer(),this.indexBuffer=a.createBuffer(),this.mode=1,this.alpha=1,this.dirty=!0},b.WebGLGraphicsData.prototype.reset=function(){this.points=[],this.indices=[],this.lastIndex=0},b.WebGLGraphicsData.prototype.upload=function(){var a=this.gl;this.glPoints=new b.Float32Array(this.points),a.bindBuffer(a.ARRAY_BUFFER,this.buffer),a.bufferData(a.ARRAY_BUFFER,this.glPoints,a.STATIC_DRAW),this.glIndicies=new b.Uint16Array(this.indices),a.bindBuffer(a.ELEMENT_ARRAY_BUFFER,this.indexBuffer),a.bufferData(a.ELEMENT_ARRAY_BUFFER,this.glIndicies,a.STATIC_DRAW),this.dirty=!1},b.glContexts=[],b.instances=[],b.WebGLRenderer=function(a,c,d){if(d)for(var e in b.defaultRenderOptions)"undefined"==typeof d[e]&&(d[e]=b.defaultRenderOptions[e]);else d=b.defaultRenderOptions;b.defaultRenderer||(b.sayHello("webGL"),b.defaultRenderer=this),this.type=b.WEBGL_RENDERER,this.resolution=d.resolution,this.transparent=d.transparent,this.autoResize=d.autoResize||!1,this.preserveDrawingBuffer=d.preserveDrawingBuffer,this.clearBeforeRender=d.clearBeforeRender,this.width=a||800,this.height=c||600,this.view=d.view||document.createElement("canvas"),this.contextLostBound=this.handleContextLost.bind(this),this.contextRestoredBound=this.handleContextRestored.bind(this),this.view.addEventListener("webglcontextlost",this.contextLostBound,!1),this.view.addEventListener("webglcontextrestored",this.contextRestoredBound,!1),this._contextOptions={alpha:this.transparent,antialias:d.antialias,premultipliedAlpha:this.transparent&&"notMultiplied"!==this.transparent,stencil:!0,preserveDrawingBuffer:d.preserveDrawingBuffer},this.projection=new b.Point,this.offset=new b.Point(0,0),this.shaderManager=new b.WebGLShaderManager,this.spriteBatch=new b.WebGLSpriteBatch,this.maskManager=new b.WebGLMaskManager,this.filterManager=new b.WebGLFilterManager,this.stencilManager=new b.WebGLStencilManager,this.blendModeManager=new b.WebGLBlendModeManager,this.renderSession={},this.renderSession.gl=this.gl,this.renderSession.drawCount=0,this.renderSession.shaderManager=this.shaderManager,this.renderSession.maskManager=this.maskManager,this.renderSession.filterManager=this.filterManager,this.renderSession.blendModeManager=this.blendModeManager,this.renderSession.spriteBatch=this.spriteBatch,this.renderSession.stencilManager=this.stencilManager,this.renderSession.renderer=this,this.renderSession.resolution=this.resolution,this.initContext(),this.mapBlendModes()},b.WebGLRenderer.prototype.constructor=b.WebGLRenderer,b.WebGLRenderer.prototype.initContext=function(){var a=this.view.getContext("webgl",this._contextOptions)||this.view.getContext("experimental-webgl",this._contextOptions);if(this.gl=a,!a)throw new Error("This browser does not support webGL. Try using the canvas renderer");this.glContextId=a.id=b.WebGLRenderer.glContextId++,b.glContexts[this.glContextId]=a,b.instances[this.glContextId]=this,a.disable(a.DEPTH_TEST),a.disable(a.CULL_FACE),a.enable(a.BLEND),this.shaderManager.setContext(a),this.spriteBatch.setContext(a),this.maskManager.setContext(a),this.filterManager.setContext(a),this.blendModeManager.setContext(a),this.stencilManager.setContext(a),this.renderSession.gl=this.gl,this.resize(this.width,this.height)},b.WebGLRenderer.prototype.render=function(a){if(!this.contextLost){this.__stage!==a&&(a.interactive&&a.interactionManager.removeEvents(),this.__stage=a),a.updateTransform();var b=this.gl;a._interactive?a._interactiveEventsAdded||(a._interactiveEventsAdded=!0,a.interactionManager.setTarget(this)):a._interactiveEventsAdded&&(a._interactiveEventsAdded=!1,a.interactionManager.setTarget(this)),b.viewport(0,0,this.width,this.height),b.bindFramebuffer(b.FRAMEBUFFER,null),this.clearBeforeRender&&(this.transparent?b.clearColor(0,0,0,0):b.clearColor(a.backgroundColorSplit[0],a.backgroundColorSplit[1],a.backgroundColorSplit[2],1),b.clear(b.COLOR_BUFFER_BIT)),this.renderDisplayObject(a,this.projection)}},b.WebGLRenderer.prototype.renderDisplayObject=function(a,c,d){this.renderSession.blendModeManager.setBlendMode(b.blendModes.NORMAL),this.renderSession.drawCount=0,this.renderSession.projection=c,this.renderSession.offset=this.offset,this.spriteBatch.begin(this.renderSession),this.filterManager.begin(this.renderSession,d),a._renderWebGL(this.renderSession),this.spriteBatch.end()},b.WebGLRenderer.prototype.resize=function(a,b){this.width=a*this.resolution,this.height=b*this.resolution,this.view.width=this.width,this.view.height=this.height,this.autoResize&&(this.view.style.width=this.width/this.resolution+"px",this.view.style.height=this.height/this.resolution+"px"),this.gl.viewport(0,0,this.width,this.height),this.projection.x=this.width/2/this.resolution,this.projection.y=-this.height/2/this.resolution},b.WebGLRenderer.prototype.updateTexture=function(a){if(a.hasLoaded){var c=this.gl;return a._glTextures[c.id]||(a._glTextures[c.id]=c.createTexture()),c.bindTexture(c.TEXTURE_2D,a._glTextures[c.id]),c.pixelStorei(c.UNPACK_PREMULTIPLY_ALPHA_WEBGL,a.premultipliedAlpha),c.texImage2D(c.TEXTURE_2D,0,c.RGBA,c.RGBA,c.UNSIGNED_BYTE,a.source),c.texParameteri(c.TEXTURE_2D,c.TEXTURE_MAG_FILTER,a.scaleMode===b.scaleModes.LINEAR?c.LINEAR:c.NEAREST),c.texParameteri(c.TEXTURE_2D,c.TEXTURE_MIN_FILTER,a.scaleMode===b.scaleModes.LINEAR?c.LINEAR:c.NEAREST),a._powerOf2?(c.texParameteri(c.TEXTURE_2D,c.TEXTURE_WRAP_S,c.REPEAT),c.texParameteri(c.TEXTURE_2D,c.TEXTURE_WRAP_T,c.REPEAT)):(c.texParameteri(c.TEXTURE_2D,c.TEXTURE_WRAP_S,c.CLAMP_TO_EDGE),c.texParameteri(c.TEXTURE_2D,c.TEXTURE_WRAP_T,c.CLAMP_TO_EDGE)),a._dirty[c.id]=!1,a._glTextures[c.id]}},b.WebGLRenderer.prototype.handleContextLost=function(a){a.preventDefault(),this.contextLost=!0},b.WebGLRenderer.prototype.handleContextRestored=function(){this.initContext();for(var a in b.TextureCache){var c=b.TextureCache[a].baseTexture;c._glTextures=[]}this.contextLost=!1},b.WebGLRenderer.prototype.destroy=function(){this.view.removeEventListener("webglcontextlost",this.contextLostBound),this.view.removeEventListener("webglcontextrestored",this.contextRestoredBound),b.glContexts[this.glContextId]=null,this.projection=null,this.offset=null,this.shaderManager.destroy(),this.spriteBatch.destroy(),this.maskManager.destroy(),this.filterManager.destroy(),this.shaderManager=null,this.spriteBatch=null,this.maskManager=null,this.filterManager=null,this.gl=null,this.renderSession=null},b.WebGLRenderer.prototype.mapBlendModes=function(){var a=this.gl;b.blendModesWebGL||(b.blendModesWebGL=[],b.blendModesWebGL[b.blendModes.NORMAL]=[a.ONE,a.ONE_MINUS_SRC_ALPHA],b.blendModesWebGL[b.blendModes.ADD]=[a.SRC_ALPHA,a.DST_ALPHA],b.blendModesWebGL[b.blendModes.MULTIPLY]=[a.DST_COLOR,a.ONE_MINUS_SRC_ALPHA],b.blendModesWebGL[b.blendModes.SCREEN]=[a.SRC_ALPHA,a.ONE],b.blendModesWebGL[b.blendModes.OVERLAY]=[a.ONE,a.ONE_MINUS_SRC_ALPHA],b.blendModesWebGL[b.blendModes.DARKEN]=[a.ONE,a.ONE_MINUS_SRC_ALPHA],b.blendModesWebGL[b.blendModes.LIGHTEN]=[a.ONE,a.ONE_MINUS_SRC_ALPHA],b.blendModesWebGL[b.blendModes.COLOR_DODGE]=[a.ONE,a.ONE_MINUS_SRC_ALPHA],b.blendModesWebGL[b.blendModes.COLOR_BURN]=[a.ONE,a.ONE_MINUS_SRC_ALPHA],b.blendModesWebGL[b.blendModes.HARD_LIGHT]=[a.ONE,a.ONE_MINUS_SRC_ALPHA],b.blendModesWebGL[b.blendModes.SOFT_LIGHT]=[a.ONE,a.ONE_MINUS_SRC_ALPHA],b.blendModesWebGL[b.blendModes.DIFFERENCE]=[a.ONE,a.ONE_MINUS_SRC_ALPHA],b.blendModesWebGL[b.blendModes.EXCLUSION]=[a.ONE,a.ONE_MINUS_SRC_ALPHA],b.blendModesWebGL[b.blendModes.HUE]=[a.ONE,a.ONE_MINUS_SRC_ALPHA],b.blendModesWebGL[b.blendModes.SATURATION]=[a.ONE,a.ONE_MINUS_SRC_ALPHA],b.blendModesWebGL[b.blendModes.COLOR]=[a.ONE,a.ONE_MINUS_SRC_ALPHA],b.blendModesWebGL[b.blendModes.LUMINOSITY]=[a.ONE,a.ONE_MINUS_SRC_ALPHA])},b.WebGLRenderer.glContextId=0,b.WebGLBlendModeManager=function(){this.currentBlendMode=99999},b.WebGLBlendModeManager.prototype.constructor=b.WebGLBlendModeManager,b.WebGLBlendModeManager.prototype.setContext=function(a){this.gl=a},b.WebGLBlendModeManager.prototype.setBlendMode=function(a){if(this.currentBlendMode===a)return!1;this.currentBlendMode=a;var c=b.blendModesWebGL[this.currentBlendMode];return this.gl.blendFunc(c[0],c[1]),!0},b.WebGLBlendModeManager.prototype.destroy=function(){this.gl=null},b.WebGLMaskManager=function(){},b.WebGLMaskManager.prototype.constructor=b.WebGLMaskManager,b.WebGLMaskManager.prototype.setContext=function(a){this.gl=a},b.WebGLMaskManager.prototype.pushMask=function(a,c){var d=c.gl;a.dirty&&b.WebGLGraphics.updateGraphics(a,d),a._webGL[d.id].data.length&&c.stencilManager.pushStencil(a,a._webGL[d.id].data[0],c)},b.WebGLMaskManager.prototype.popMask=function(a,b){var c=this.gl;b.stencilManager.popStencil(a,a._webGL[c.id].data[0],b)},b.WebGLMaskManager.prototype.destroy=function(){this.gl=null},b.WebGLStencilManager=function(){this.stencilStack=[],this.reverse=!0,this.count=0},b.WebGLStencilManager.prototype.setContext=function(a){this.gl=a},b.WebGLStencilManager.prototype.pushStencil=function(a,b,c){var d=this.gl;this.bindGraphics(a,b,c),0===this.stencilStack.length&&(d.enable(d.STENCIL_TEST),d.clear(d.STENCIL_BUFFER_BIT),this.reverse=!0,this.count=0),this.stencilStack.push(b);var e=this.count;d.colorMask(!1,!1,!1,!1),d.stencilFunc(d.ALWAYS,0,255),d.stencilOp(d.KEEP,d.KEEP,d.INVERT),1===b.mode?(d.drawElements(d.TRIANGLE_FAN,b.indices.length-4,d.UNSIGNED_SHORT,0),this.reverse?(d.stencilFunc(d.EQUAL,255-e,255),d.stencilOp(d.KEEP,d.KEEP,d.DECR)):(d.stencilFunc(d.EQUAL,e,255),d.stencilOp(d.KEEP,d.KEEP,d.INCR)),d.drawElements(d.TRIANGLE_FAN,4,d.UNSIGNED_SHORT,2*(b.indices.length-4)),this.reverse?d.stencilFunc(d.EQUAL,255-(e+1),255):d.stencilFunc(d.EQUAL,e+1,255),this.reverse=!this.reverse):(this.reverse?(d.stencilFunc(d.EQUAL,e,255),d.stencilOp(d.KEEP,d.KEEP,d.INCR)):(d.stencilFunc(d.EQUAL,255-e,255),d.stencilOp(d.KEEP,d.KEEP,d.DECR)),d.drawElements(d.TRIANGLE_STRIP,b.indices.length,d.UNSIGNED_SHORT,0),this.reverse?d.stencilFunc(d.EQUAL,e+1,255):d.stencilFunc(d.EQUAL,255-(e+1),255)),d.colorMask(!0,!0,!0,!0),d.stencilOp(d.KEEP,d.KEEP,d.KEEP),this.count++},b.WebGLStencilManager.prototype.bindGraphics=function(a,c,d){this._currentGraphics=a;var e,f=this.gl,g=d.projection,h=d.offset;1===c.mode?(e=d.shaderManager.complexPrimitiveShader,d.shaderManager.setShader(e),f.uniformMatrix3fv(e.translationMatrix,!1,a.worldTransform.toArray(!0)),f.uniform2f(e.projectionVector,g.x,-g.y),f.uniform2f(e.offsetVector,-h.x,-h.y),f.uniform3fv(e.tintColor,b.hex2rgb(a.tint)),f.uniform3fv(e.color,c.color),f.uniform1f(e.alpha,a.worldAlpha*c.alpha),f.bindBuffer(f.ARRAY_BUFFER,c.buffer),f.vertexAttribPointer(e.aVertexPosition,2,f.FLOAT,!1,8,0),f.bindBuffer(f.ELEMENT_ARRAY_BUFFER,c.indexBuffer)):(e=d.shaderManager.primitiveShader,d.shaderManager.setShader(e),f.uniformMatrix3fv(e.translationMatrix,!1,a.worldTransform.toArray(!0)),f.uniform2f(e.projectionVector,g.x,-g.y),f.uniform2f(e.offsetVector,-h.x,-h.y),f.uniform3fv(e.tintColor,b.hex2rgb(a.tint)),f.uniform1f(e.alpha,a.worldAlpha),f.bindBuffer(f.ARRAY_BUFFER,c.buffer),f.vertexAttribPointer(e.aVertexPosition,2,f.FLOAT,!1,24,0),f.vertexAttribPointer(e.colorAttribute,4,f.FLOAT,!1,24,8),f.bindBuffer(f.ELEMENT_ARRAY_BUFFER,c.indexBuffer))},b.WebGLStencilManager.prototype.popStencil=function(a,b,c){var d=this.gl;if(this.stencilStack.pop(),this.count--,0===this.stencilStack.length)d.disable(d.STENCIL_TEST);else{var e=this.count;this.bindGraphics(a,b,c),d.colorMask(!1,!1,!1,!1),1===b.mode?(this.reverse=!this.reverse,this.reverse?(d.stencilFunc(d.EQUAL,255-(e+1),255),d.stencilOp(d.KEEP,d.KEEP,d.INCR)):(d.stencilFunc(d.EQUAL,e+1,255),d.stencilOp(d.KEEP,d.KEEP,d.DECR)),d.drawElements(d.TRIANGLE_FAN,4,d.UNSIGNED_SHORT,2*(b.indices.length-4)),d.stencilFunc(d.ALWAYS,0,255),d.stencilOp(d.KEEP,d.KEEP,d.INVERT),d.drawElements(d.TRIANGLE_FAN,b.indices.length-4,d.UNSIGNED_SHORT,0),this.reverse?d.stencilFunc(d.EQUAL,e,255):d.stencilFunc(d.EQUAL,255-e,255)):(this.reverse?(d.stencilFunc(d.EQUAL,e+1,255),d.stencilOp(d.KEEP,d.KEEP,d.DECR)):(d.stencilFunc(d.EQUAL,255-(e+1),255),d.stencilOp(d.KEEP,d.KEEP,d.INCR)),d.drawElements(d.TRIANGLE_STRIP,b.indices.length,d.UNSIGNED_SHORT,0),this.reverse?d.stencilFunc(d.EQUAL,e,255):d.stencilFunc(d.EQUAL,255-e,255)),d.colorMask(!0,!0,!0,!0),d.stencilOp(d.KEEP,d.KEEP,d.KEEP)}},b.WebGLStencilManager.prototype.destroy=function(){this.stencilStack=null,this.gl=null},b.WebGLShaderManager=function(){this.maxAttibs=10,this.attribState=[],this.tempAttribState=[];for(var a=0;a<this.maxAttibs;a++)this.attribState[a]=!1;this.stack=[]},b.WebGLShaderManager.prototype.constructor=b.WebGLShaderManager,b.WebGLShaderManager.prototype.setContext=function(a){this.gl=a,this.primitiveShader=new b.PrimitiveShader(a),this.complexPrimitiveShader=new b.ComplexPrimitiveShader(a),this.defaultShader=new b.PixiShader(a),this.fastShader=new b.PixiFastShader(a),this.stripShader=new b.StripShader(a),this.setShader(this.defaultShader)},b.WebGLShaderManager.prototype.setAttribs=function(a){var b;for(b=0;b<this.tempAttribState.length;b++)this.tempAttribState[b]=!1;for(b=0;b<a.length;b++){var c=a[b];this.tempAttribState[c]=!0}var d=this.gl;for(b=0;b<this.attribState.length;b++)this.attribState[b]!==this.tempAttribState[b]&&(this.attribState[b]=this.tempAttribState[b],this.tempAttribState[b]?d.enableVertexAttribArray(b):d.disableVertexAttribArray(b))},b.WebGLShaderManager.prototype.setShader=function(a){return this._currentId===a._UID?!1:(this._currentId=a._UID,this.currentShader=a,this.gl.useProgram(a.program),this.setAttribs(a.attributes),!0)},b.WebGLShaderManager.prototype.destroy=function(){this.attribState=null,this.tempAttribState=null,this.primitiveShader.destroy(),this.complexPrimitiveShader.destroy(),this.defaultShader.destroy(),this.fastShader.destroy(),this.stripShader.destroy(),this.gl=null},b.WebGLSpriteBatch=function(){this.vertSize=6,this.size=2e3;var a=4*this.size*this.vertSize,c=6*this.size;this.vertices=new b.Float32Array(a),this.indices=new b.Uint16Array(c),this.lastIndexCount=0;for(var d=0,e=0;c>d;d+=6,e+=4)this.indices[d+0]=e+0,this.indices[d+1]=e+1,this.indices[d+2]=e+2,this.indices[d+3]=e+0,this.indices[d+4]=e+2,this.indices[d+5]=e+3;this.drawing=!1,this.currentBatchSize=0,this.currentBaseTexture=null,this.dirty=!0,this.textures=[],this.blendModes=[],this.shaders=[],this.sprites=[],this.defaultShader=new b.AbstractFilter(["precision lowp float;","varying vec2 vTextureCoord;","varying vec4 vColor;","uniform sampler2D uSampler;","void main(void) {","   gl_FragColor = texture2D(uSampler, vTextureCoord) * vColor ;","}"])},b.WebGLSpriteBatch.prototype.setContext=function(a){this.gl=a,this.vertexBuffer=a.createBuffer(),this.indexBuffer=a.createBuffer(),a.bindBuffer(a.ELEMENT_ARRAY_BUFFER,this.indexBuffer),a.bufferData(a.ELEMENT_ARRAY_BUFFER,this.indices,a.STATIC_DRAW),a.bindBuffer(a.ARRAY_BUFFER,this.vertexBuffer),a.bufferData(a.ARRAY_BUFFER,this.vertices,a.DYNAMIC_DRAW),this.currentBlendMode=99999;var c=new b.PixiShader(a);c.fragmentSrc=this.defaultShader.fragmentSrc,c.uniforms={},c.init(),this.defaultShader.shaders[a.id]=c},b.WebGLSpriteBatch.prototype.begin=function(a){this.renderSession=a,this.shader=this.renderSession.shaderManager.defaultShader,this.start()},b.WebGLSpriteBatch.prototype.end=function(){this.flush()},b.WebGLSpriteBatch.prototype.render=function(a){var b=a.texture;this.currentBatchSize>=this.size&&(this.flush(),this.currentBaseTexture=b.baseTexture);var c=b._uvs;if(c){var d,e,f,g,h=a.worldAlpha,i=a.tint,j=this.vertices,k=a.anchor.x,l=a.anchor.y;if(b.trim){var m=b.trim;e=m.x-k*m.width,d=e+b.crop.width,g=m.y-l*m.height,f=g+b.crop.height}else d=b.frame.width*(1-k),e=b.frame.width*-k,f=b.frame.height*(1-l),g=b.frame.height*-l;var n=4*this.currentBatchSize*this.vertSize,o=b.baseTexture.resolution,p=a.worldTransform,q=p.a/o,r=p.b/o,s=p.c/o,t=p.d/o,u=p.tx,v=p.ty;j[n++]=q*e+s*g+u,j[n++]=t*g+r*e+v,j[n++]=c.x0,j[n++]=c.y0,j[n++]=h,j[n++]=i,j[n++]=q*d+s*g+u,j[n++]=t*g+r*d+v,j[n++]=c.x1,j[n++]=c.y1,j[n++]=h,j[n++]=i,j[n++]=q*d+s*f+u,j[n++]=t*f+r*d+v,j[n++]=c.x2,j[n++]=c.y2,j[n++]=h,j[n++]=i,j[n++]=q*e+s*f+u,j[n++]=t*f+r*e+v,j[n++]=c.x3,j[n++]=c.y3,j[n++]=h,j[n++]=i,this.sprites[this.currentBatchSize++]=a}},b.WebGLSpriteBatch.prototype.renderTilingSprite=function(a){var c=a.tilingTexture;this.currentBatchSize>=this.size&&(this.flush(),this.currentBaseTexture=c.baseTexture),a._uvs||(a._uvs=new b.TextureUvs);var d=a._uvs;a.tilePosition.x%=c.baseTexture.width*a.tileScaleOffset.x,a.tilePosition.y%=c.baseTexture.height*a.tileScaleOffset.y;var e=a.tilePosition.x/(c.baseTexture.width*a.tileScaleOffset.x),f=a.tilePosition.y/(c.baseTexture.height*a.tileScaleOffset.y),g=a.width/c.baseTexture.width/(a.tileScale.x*a.tileScaleOffset.x),h=a.height/c.baseTexture.height/(a.tileScale.y*a.tileScaleOffset.y);d.x0=0-e,d.y0=0-f,d.x1=1*g-e,d.y1=0-f,d.x2=1*g-e,d.y2=1*h-f,d.x3=0-e,d.y3=1*h-f;var i=a.worldAlpha,j=a.tint,k=this.vertices,l=a.width,m=a.height,n=a.anchor.x,o=a.anchor.y,p=l*(1-n),q=l*-n,r=m*(1-o),s=m*-o,t=4*this.currentBatchSize*this.vertSize,u=c.baseTexture.resolution,v=a.worldTransform,w=v.a/u,x=v.b/u,y=v.c/u,z=v.d/u,A=v.tx,B=v.ty;k[t++]=w*q+y*s+A,k[t++]=z*s+x*q+B,k[t++]=d.x0,k[t++]=d.y0,k[t++]=i,k[t++]=j,k[t++]=w*p+y*s+A,k[t++]=z*s+x*p+B,k[t++]=d.x1,k[t++]=d.y1,k[t++]=i,k[t++]=j,k[t++]=w*p+y*r+A,k[t++]=z*r+x*p+B,k[t++]=d.x2,k[t++]=d.y2,k[t++]=i,k[t++]=j,k[t++]=w*q+y*r+A,k[t++]=z*r+x*q+B,k[t++]=d.x3,k[t++]=d.y3,k[t++]=i,k[t++]=j,this.sprites[this.currentBatchSize++]=a},b.WebGLSpriteBatch.prototype.flush=function(){if(0!==this.currentBatchSize){var a,c=this.gl;if(this.dirty){this.dirty=!1,c.activeTexture(c.TEXTURE0),c.bindBuffer(c.ARRAY_BUFFER,this.vertexBuffer),c.bindBuffer(c.ELEMENT_ARRAY_BUFFER,this.indexBuffer),a=this.defaultShader.shaders[c.id];var d=4*this.vertSize;c.vertexAttribPointer(a.aVertexPosition,2,c.FLOAT,!1,d,0),c.vertexAttribPointer(a.aTextureCoord,2,c.FLOAT,!1,d,8),c.vertexAttribPointer(a.colorAttribute,2,c.FLOAT,!1,d,16)}if(this.currentBatchSize>.5*this.size)c.bufferSubData(c.ARRAY_BUFFER,0,this.vertices);else{var e=this.vertices.subarray(0,4*this.currentBatchSize*this.vertSize);c.bufferSubData(c.ARRAY_BUFFER,0,e)}for(var f,g,h,i,j=0,k=0,l=null,m=this.renderSession.blendModeManager.currentBlendMode,n=null,o=!1,p=!1,q=0,r=this.currentBatchSize;r>q;q++){if(i=this.sprites[q],f=i.texture.baseTexture,g=i.blendMode,h=i.shader||this.defaultShader,o=m!==g,p=n!==h,(l!==f||o||p)&&(this.renderBatch(l,j,k),k=q,j=0,l=f,o&&(m=g,this.renderSession.blendModeManager.setBlendMode(m)),p)){n=h,a=n.shaders[c.id],a||(a=new b.PixiShader(c),a.fragmentSrc=n.fragmentSrc,a.uniforms=n.uniforms,a.init(),n.shaders[c.id]=a),this.renderSession.shaderManager.setShader(a),a.dirty&&a.syncUniforms();var s=this.renderSession.projection;c.uniform2f(a.projectionVector,s.x,s.y);var t=this.renderSession.offset;c.uniform2f(a.offsetVector,t.x,t.y)}j++}this.renderBatch(l,j,k),this.currentBatchSize=0}},b.WebGLSpriteBatch.prototype.renderBatch=function(a,b,c){if(0!==b){var d=this.gl;a._dirty[d.id]?this.renderSession.renderer.updateTexture(a):d.bindTexture(d.TEXTURE_2D,a._glTextures[d.id]),d.drawElements(d.TRIANGLES,6*b,d.UNSIGNED_SHORT,6*c*2),this.renderSession.drawCount++}},b.WebGLSpriteBatch.prototype.stop=function(){this.flush(),this.dirty=!0},b.WebGLSpriteBatch.prototype.start=function(){this.dirty=!0},b.WebGLSpriteBatch.prototype.destroy=function(){this.vertices=null,this.indices=null,this.gl.deleteBuffer(this.vertexBuffer),this.gl.deleteBuffer(this.indexBuffer),this.currentBaseTexture=null,this.gl=null},b.WebGLFastSpriteBatch=function(a){this.vertSize=10,this.maxSize=6e3,this.size=this.maxSize;var c=4*this.size*this.vertSize,d=6*this.maxSize;this.vertices=new b.Float32Array(c),this.indices=new b.Uint16Array(d),this.vertexBuffer=null,this.indexBuffer=null,this.lastIndexCount=0;for(var e=0,f=0;d>e;e+=6,f+=4)this.indices[e+0]=f+0,this.indices[e+1]=f+1,this.indices[e+2]=f+2,this.indices[e+3]=f+0,this.indices[e+4]=f+2,this.indices[e+5]=f+3;this.drawing=!1,this.currentBatchSize=0,this.currentBaseTexture=null,this.currentBlendMode=0,this.renderSession=null,this.shader=null,this.matrix=null,this.setContext(a)},b.WebGLFastSpriteBatch.prototype.constructor=b.WebGLFastSpriteBatch,b.WebGLFastSpriteBatch.prototype.setContext=function(a){this.gl=a,this.vertexBuffer=a.createBuffer(),this.indexBuffer=a.createBuffer(),a.bindBuffer(a.ELEMENT_ARRAY_BUFFER,this.indexBuffer),a.bufferData(a.ELEMENT_ARRAY_BUFFER,this.indices,a.STATIC_DRAW),a.bindBuffer(a.ARRAY_BUFFER,this.vertexBuffer),a.bufferData(a.ARRAY_BUFFER,this.vertices,a.DYNAMIC_DRAW)},b.WebGLFastSpriteBatch.prototype.begin=function(a,b){this.renderSession=b,this.shader=this.renderSession.shaderManager.fastShader,this.matrix=a.worldTransform.toArray(!0),this.start()},b.WebGLFastSpriteBatch.prototype.end=function(){this.flush()},b.WebGLFastSpriteBatch.prototype.render=function(a){var b=a.children,c=b[0];if(c.texture._uvs){this.currentBaseTexture=c.texture.baseTexture,c.blendMode!==this.renderSession.blendModeManager.currentBlendMode&&(this.flush(),this.renderSession.blendModeManager.setBlendMode(c.blendMode));for(var d=0,e=b.length;e>d;d++)this.renderSprite(b[d]);this.flush()}},b.WebGLFastSpriteBatch.prototype.renderSprite=function(a){if(a.visible&&(a.texture.baseTexture===this.currentBaseTexture||(this.flush(),this.currentBaseTexture=a.texture.baseTexture,a.texture._uvs))){var b,c,d,e,f,g,h,i,j=this.vertices;if(b=a.texture._uvs,c=a.texture.frame.width,d=a.texture.frame.height,a.texture.trim){var k=a.texture.trim;f=k.x-a.anchor.x*k.width,e=f+a.texture.crop.width,h=k.y-a.anchor.y*k.height,g=h+a.texture.crop.height}else e=a.texture.frame.width*(1-a.anchor.x),f=a.texture.frame.width*-a.anchor.x,g=a.texture.frame.height*(1-a.anchor.y),h=a.texture.frame.height*-a.anchor.y;i=4*this.currentBatchSize*this.vertSize,j[i++]=f,j[i++]=h,j[i++]=a.position.x,j[i++]=a.position.y,j[i++]=a.scale.x,j[i++]=a.scale.y,j[i++]=a.rotation,j[i++]=b.x0,j[i++]=b.y1,j[i++]=a.alpha,j[i++]=e,j[i++]=h,j[i++]=a.position.x,j[i++]=a.position.y,j[i++]=a.scale.x,j[i++]=a.scale.y,j[i++]=a.rotation,j[i++]=b.x1,j[i++]=b.y1,j[i++]=a.alpha,j[i++]=e,j[i++]=g,j[i++]=a.position.x,j[i++]=a.position.y,j[i++]=a.scale.x,j[i++]=a.scale.y,j[i++]=a.rotation,j[i++]=b.x2,j[i++]=b.y2,j[i++]=a.alpha,j[i++]=f,j[i++]=g,j[i++]=a.position.x,j[i++]=a.position.y,j[i++]=a.scale.x,j[i++]=a.scale.y,j[i++]=a.rotation,j[i++]=b.x3,j[i++]=b.y3,j[i++]=a.alpha,this.currentBatchSize++,this.currentBatchSize>=this.size&&this.flush()}},b.WebGLFastSpriteBatch.prototype.flush=function(){if(0!==this.currentBatchSize){var a=this.gl;if(this.currentBaseTexture._glTextures[a.id]||this.renderSession.renderer.updateTexture(this.currentBaseTexture,a),a.bindTexture(a.TEXTURE_2D,this.currentBaseTexture._glTextures[a.id]),this.currentBatchSize>.5*this.size)a.bufferSubData(a.ARRAY_BUFFER,0,this.vertices);else{var b=this.vertices.subarray(0,4*this.currentBatchSize*this.vertSize);a.bufferSubData(a.ARRAY_BUFFER,0,b)}a.drawElements(a.TRIANGLES,6*this.currentBatchSize,a.UNSIGNED_SHORT,0),this.currentBatchSize=0,this.renderSession.drawCount++}},b.WebGLFastSpriteBatch.prototype.stop=function(){this.flush()},b.WebGLFastSpriteBatch.prototype.start=function(){var a=this.gl;a.activeTexture(a.TEXTURE0),a.bindBuffer(a.ARRAY_BUFFER,this.vertexBuffer),a.bindBuffer(a.ELEMENT_ARRAY_BUFFER,this.indexBuffer);var b=this.renderSession.projection;a.uniform2f(this.shader.projectionVector,b.x,b.y),a.uniformMatrix3fv(this.shader.uMatrix,!1,this.matrix);var c=4*this.vertSize;a.vertexAttribPointer(this.shader.aVertexPosition,2,a.FLOAT,!1,c,0),a.vertexAttribPointer(this.shader.aPositionCoord,2,a.FLOAT,!1,c,8),a.vertexAttribPointer(this.shader.aScale,2,a.FLOAT,!1,c,16),a.vertexAttribPointer(this.shader.aRotation,1,a.FLOAT,!1,c,24),a.vertexAttribPointer(this.shader.aTextureCoord,2,a.FLOAT,!1,c,28),a.vertexAttribPointer(this.shader.colorAttribute,1,a.FLOAT,!1,c,36)},b.WebGLFilterManager=function(){this.filterStack=[],this.offsetX=0,this.offsetY=0},b.WebGLFilterManager.prototype.constructor=b.WebGLFilterManager,b.WebGLFilterManager.prototype.setContext=function(a){this.gl=a,this.texturePool=[],this.initShaderBuffers()},b.WebGLFilterManager.prototype.begin=function(a,b){this.renderSession=a,this.defaultShader=a.shaderManager.defaultShader;var c=this.renderSession.projection;this.width=2*c.x,this.height=2*-c.y,this.buffer=b},b.WebGLFilterManager.prototype.pushFilter=function(a){var c=this.gl,d=this.renderSession.projection,e=this.renderSession.offset;a._filterArea=a.target.filterArea||a.target.getBounds(),this.filterStack.push(a);var f=a.filterPasses[0];this.offsetX+=a._filterArea.x,this.offsetY+=a._filterArea.y;var g=this.texturePool.pop();g?g.resize(this.width,this.height):g=new b.FilterTexture(this.gl,this.width,this.height),c.bindTexture(c.TEXTURE_2D,g.texture);var h=a._filterArea,i=f.padding;h.x-=i,h.y-=i,h.width+=2*i,h.height+=2*i,h.x<0&&(h.x=0),h.width>this.width&&(h.width=this.width),h.y<0&&(h.y=0),h.height>this.height&&(h.height=this.height),c.bindFramebuffer(c.FRAMEBUFFER,g.frameBuffer),c.viewport(0,0,h.width,h.height),d.x=h.width/2,d.y=-h.height/2,e.x=-h.x,e.y=-h.y,c.colorMask(!0,!0,!0,!0),c.clearColor(0,0,0,0),c.clear(c.COLOR_BUFFER_BIT),a._glFilterTexture=g},b.WebGLFilterManager.prototype.popFilter=function(){var a=this.gl,c=this.filterStack.pop(),d=c._filterArea,e=c._glFilterTexture,f=this.renderSession.projection,g=this.renderSession.offset;if(c.filterPasses.length>1){a.viewport(0,0,d.width,d.height),a.bindBuffer(a.ARRAY_BUFFER,this.vertexBuffer),this.vertexArray[0]=0,this.vertexArray[1]=d.height,this.vertexArray[2]=d.width,this.vertexArray[3]=d.height,this.vertexArray[4]=0,this.vertexArray[5]=0,this.vertexArray[6]=d.width,this.vertexArray[7]=0,a.bufferSubData(a.ARRAY_BUFFER,0,this.vertexArray),a.bindBuffer(a.ARRAY_BUFFER,this.uvBuffer),this.uvArray[2]=d.width/this.width,this.uvArray[5]=d.height/this.height,this.uvArray[6]=d.width/this.width,this.uvArray[7]=d.height/this.height,a.bufferSubData(a.ARRAY_BUFFER,0,this.uvArray);var h=e,i=this.texturePool.pop();i||(i=new b.FilterTexture(this.gl,this.width,this.height)),i.resize(this.width,this.height),a.bindFramebuffer(a.FRAMEBUFFER,i.frameBuffer),a.clear(a.COLOR_BUFFER_BIT),a.disable(a.BLEND);for(var j=0;j<c.filterPasses.length-1;j++){var k=c.filterPasses[j];a.bindFramebuffer(a.FRAMEBUFFER,i.frameBuffer),a.activeTexture(a.TEXTURE0),a.bindTexture(a.TEXTURE_2D,h.texture),this.applyFilterPass(k,d,d.width,d.height);var l=h;h=i,i=l}a.enable(a.BLEND),e=h,this.texturePool.push(i)}var m=c.filterPasses[c.filterPasses.length-1];this.offsetX-=d.x,this.offsetY-=d.y;var n=this.width,o=this.height,p=0,q=0,r=this.buffer;if(0===this.filterStack.length)a.colorMask(!0,!0,!0,!0);else{var s=this.filterStack[this.filterStack.length-1];d=s._filterArea,n=d.width,o=d.height,p=d.x,q=d.y,r=s._glFilterTexture.frameBuffer}f.x=n/2,f.y=-o/2,g.x=p,g.y=q,d=c._filterArea;var t=d.x-p,u=d.y-q;a.bindBuffer(a.ARRAY_BUFFER,this.vertexBuffer),this.vertexArray[0]=t,this.vertexArray[1]=u+d.height,this.vertexArray[2]=t+d.width,this.vertexArray[3]=u+d.height,this.vertexArray[4]=t,this.vertexArray[5]=u,this.vertexArray[6]=t+d.width,this.vertexArray[7]=u,a.bufferSubData(a.ARRAY_BUFFER,0,this.vertexArray),a.bindBuffer(a.ARRAY_BUFFER,this.uvBuffer),this.uvArray[2]=d.width/this.width,this.uvArray[5]=d.height/this.height,this.uvArray[6]=d.width/this.width,this.uvArray[7]=d.height/this.height,a.bufferSubData(a.ARRAY_BUFFER,0,this.uvArray),a.viewport(0,0,n,o),a.bindFramebuffer(a.FRAMEBUFFER,r),a.activeTexture(a.TEXTURE0),a.bindTexture(a.TEXTURE_2D,e.texture),this.applyFilterPass(m,d,n,o),this.texturePool.push(e),c._glFilterTexture=null},b.WebGLFilterManager.prototype.applyFilterPass=function(a,c,d,e){var f=this.gl,g=a.shaders[f.id];g||(g=new b.PixiShader(f),g.fragmentSrc=a.fragmentSrc,g.uniforms=a.uniforms,g.init(),a.shaders[f.id]=g),this.renderSession.shaderManager.setShader(g),f.uniform2f(g.projectionVector,d/2,-e/2),f.uniform2f(g.offsetVector,0,0),a.uniforms.dimensions&&(a.uniforms.dimensions.value[0]=this.width,a.uniforms.dimensions.value[1]=this.height,a.uniforms.dimensions.value[2]=this.vertexArray[0],a.uniforms.dimensions.value[3]=this.vertexArray[5]),g.syncUniforms(),f.bindBuffer(f.ARRAY_BUFFER,this.vertexBuffer),f.vertexAttribPointer(g.aVertexPosition,2,f.FLOAT,!1,0,0),f.bindBuffer(f.ARRAY_BUFFER,this.uvBuffer),f.vertexAttribPointer(g.aTextureCoord,2,f.FLOAT,!1,0,0),f.bindBuffer(f.ARRAY_BUFFER,this.colorBuffer),f.vertexAttribPointer(g.colorAttribute,2,f.FLOAT,!1,0,0),f.bindBuffer(f.ELEMENT_ARRAY_BUFFER,this.indexBuffer),f.drawElements(f.TRIANGLES,6,f.UNSIGNED_SHORT,0),this.renderSession.drawCount++},b.WebGLFilterManager.prototype.initShaderBuffers=function(){var a=this.gl;this.vertexBuffer=a.createBuffer(),this.uvBuffer=a.createBuffer(),this.colorBuffer=a.createBuffer(),this.indexBuffer=a.createBuffer(),this.vertexArray=new b.Float32Array([0,0,1,0,0,1,1,1]),a.bindBuffer(a.ARRAY_BUFFER,this.vertexBuffer),a.bufferData(a.ARRAY_BUFFER,this.vertexArray,a.STATIC_DRAW),this.uvArray=new b.Float32Array([0,0,1,0,0,1,1,1]),a.bindBuffer(a.ARRAY_BUFFER,this.uvBuffer),a.bufferData(a.ARRAY_BUFFER,this.uvArray,a.STATIC_DRAW),this.colorArray=new b.Float32Array([1,16777215,1,16777215,1,16777215,1,16777215]),a.bindBuffer(a.ARRAY_BUFFER,this.colorBuffer),a.bufferData(a.ARRAY_BUFFER,this.colorArray,a.STATIC_DRAW),a.bindBuffer(a.ELEMENT_ARRAY_BUFFER,this.indexBuffer),a.bufferData(a.ELEMENT_ARRAY_BUFFER,new Uint16Array([0,1,2,1,3,2]),a.STATIC_DRAW)},b.WebGLFilterManager.prototype.destroy=function(){var a=this.gl;this.filterStack=null,this.offsetX=0,this.offsetY=0;for(var b=0;b<this.texturePool.length;b++)this.texturePool[b].destroy();this.texturePool=null,a.deleteBuffer(this.vertexBuffer),a.deleteBuffer(this.uvBuffer),a.deleteBuffer(this.colorBuffer),a.deleteBuffer(this.indexBuffer)},b.FilterTexture=function(a,c,d,e){this.gl=a,this.frameBuffer=a.createFramebuffer(),this.texture=a.createTexture(),e=e||b.scaleModes.DEFAULT,a.bindTexture(a.TEXTURE_2D,this.texture),a.texParameteri(a.TEXTURE_2D,a.TEXTURE_MAG_FILTER,e===b.scaleModes.LINEAR?a.LINEAR:a.NEAREST),a.texParameteri(a.TEXTURE_2D,a.TEXTURE_MIN_FILTER,e===b.scaleModes.LINEAR?a.LINEAR:a.NEAREST),a.texParameteri(a.TEXTURE_2D,a.TEXTURE_WRAP_S,a.CLAMP_TO_EDGE),a.texParameteri(a.TEXTURE_2D,a.TEXTURE_WRAP_T,a.CLAMP_TO_EDGE),a.bindFramebuffer(a.FRAMEBUFFER,this.frameBuffer),a.bindFramebuffer(a.FRAMEBUFFER,this.frameBuffer),a.framebufferTexture2D(a.FRAMEBUFFER,a.COLOR_ATTACHMENT0,a.TEXTURE_2D,this.texture,0),this.renderBuffer=a.createRenderbuffer(),a.bindRenderbuffer(a.RENDERBUFFER,this.renderBuffer),a.framebufferRenderbuffer(a.FRAMEBUFFER,a.DEPTH_STENCIL_ATTACHMENT,a.RENDERBUFFER,this.renderBuffer),this.resize(c,d)},b.FilterTexture.prototype.constructor=b.FilterTexture,b.FilterTexture.prototype.clear=function(){var a=this.gl;a.clearColor(0,0,0,0),a.clear(a.COLOR_BUFFER_BIT)},b.FilterTexture.prototype.resize=function(a,b){if(this.width!==a||this.height!==b){this.width=a,this.height=b;var c=this.gl;c.bindTexture(c.TEXTURE_2D,this.texture),c.texImage2D(c.TEXTURE_2D,0,c.RGBA,a,b,0,c.RGBA,c.UNSIGNED_BYTE,null),c.bindRenderbuffer(c.RENDERBUFFER,this.renderBuffer),c.renderbufferStorage(c.RENDERBUFFER,c.DEPTH_STENCIL,a,b)
}},b.FilterTexture.prototype.destroy=function(){var a=this.gl;a.deleteFramebuffer(this.frameBuffer),a.deleteTexture(this.texture),this.frameBuffer=null,this.texture=null},b.CanvasBuffer=function(a,b){this.width=a,this.height=b,this.canvas=document.createElement("canvas"),this.context=this.canvas.getContext("2d"),this.canvas.width=a,this.canvas.height=b},b.CanvasBuffer.prototype.constructor=b.CanvasBuffer,b.CanvasBuffer.prototype.clear=function(){this.context.setTransform(1,0,0,1,0,0),this.context.clearRect(0,0,this.width,this.height)},b.CanvasBuffer.prototype.resize=function(a,b){this.width=this.canvas.width=a,this.height=this.canvas.height=b},b.CanvasMaskManager=function(){},b.CanvasMaskManager.prototype.constructor=b.CanvasMaskManager,b.CanvasMaskManager.prototype.pushMask=function(a,c){var d=c.context;d.save();var e=a.alpha,f=a.worldTransform,g=c.resolution;d.setTransform(f.a*g,f.b*g,f.c*g,f.d*g,f.tx*g,f.ty*g),b.CanvasGraphics.renderGraphicsMask(a,d),d.clip(),a.worldAlpha=e},b.CanvasMaskManager.prototype.popMask=function(a){a.context.restore()},b.CanvasTinter=function(){},b.CanvasTinter.getTintedTexture=function(a,c){var d=a.texture;c=b.CanvasTinter.roundColor(c);var e="#"+("00000"+(0|c).toString(16)).substr(-6);if(d.tintCache=d.tintCache||{},d.tintCache[e])return d.tintCache[e];var f=b.CanvasTinter.canvas||document.createElement("canvas");if(b.CanvasTinter.tintMethod(d,c,f),b.CanvasTinter.convertTintToImage){var g=new Image;g.src=f.toDataURL(),d.tintCache[e]=g}else d.tintCache[e]=f,b.CanvasTinter.canvas=null;return f},b.CanvasTinter.tintWithMultiply=function(a,b,c){var d=c.getContext("2d"),e=a.crop;c.width=e.width,c.height=e.height,d.fillStyle="#"+("00000"+(0|b).toString(16)).substr(-6),d.fillRect(0,0,e.width,e.height),d.globalCompositeOperation="multiply",d.drawImage(a.baseTexture.source,e.x,e.y,e.width,e.height,0,0,e.width,e.height),d.globalCompositeOperation="destination-atop",d.drawImage(a.baseTexture.source,e.x,e.y,e.width,e.height,0,0,e.width,e.height)},b.CanvasTinter.tintWithOverlay=function(a,b,c){var d=c.getContext("2d"),e=a.crop;c.width=e.width,c.height=e.height,d.globalCompositeOperation="copy",d.fillStyle="#"+("00000"+(0|b).toString(16)).substr(-6),d.fillRect(0,0,e.width,e.height),d.globalCompositeOperation="destination-atop",d.drawImage(a.baseTexture.source,e.x,e.y,e.width,e.height,0,0,e.width,e.height)},b.CanvasTinter.tintWithPerPixel=function(a,c,d){var e=d.getContext("2d"),f=a.crop;d.width=f.width,d.height=f.height,e.globalCompositeOperation="copy",e.drawImage(a.baseTexture.source,f.x,f.y,f.width,f.height,0,0,f.width,f.height);for(var g=b.hex2rgb(c),h=g[0],i=g[1],j=g[2],k=e.getImageData(0,0,f.width,f.height),l=k.data,m=0;m<l.length;m+=4)l[m+0]*=h,l[m+1]*=i,l[m+2]*=j;e.putImageData(k,0,0)},b.CanvasTinter.roundColor=function(a){var c=b.CanvasTinter.cacheStepsPerColorChannel,d=b.hex2rgb(a);return d[0]=Math.min(255,d[0]/c*c),d[1]=Math.min(255,d[1]/c*c),d[2]=Math.min(255,d[2]/c*c),b.rgb2hex(d)},b.CanvasTinter.cacheStepsPerColorChannel=8,b.CanvasTinter.convertTintToImage=!1,b.CanvasTinter.canUseMultiply=b.canUseNewCanvasBlendModes(),b.CanvasTinter.tintMethod=b.CanvasTinter.canUseMultiply?b.CanvasTinter.tintWithMultiply:b.CanvasTinter.tintWithPerPixel,b.CanvasRenderer=function(a,c,d){if(d)for(var e in b.defaultRenderOptions)"undefined"==typeof d[e]&&(d[e]=b.defaultRenderOptions[e]);else d=b.defaultRenderOptions;b.defaultRenderer||(b.sayHello("Canvas"),b.defaultRenderer=this),this.type=b.CANVAS_RENDERER,this.resolution=d.resolution,this.clearBeforeRender=d.clearBeforeRender,this.transparent=d.transparent,this.autoResize=d.autoResize||!1,this.width=a||800,this.height=c||600,this.width*=this.resolution,this.height*=this.resolution,this.view=d.view||document.createElement("canvas"),this.context=this.view.getContext("2d",{alpha:this.transparent}),this.refresh=!0,this.view.width=this.width*this.resolution,this.view.height=this.height*this.resolution,this.count=0,this.maskManager=new b.CanvasMaskManager,this.renderSession={context:this.context,maskManager:this.maskManager,scaleMode:null,smoothProperty:null,roundPixels:!1},this.mapBlendModes(),this.resize(a,c),"imageSmoothingEnabled"in this.context?this.renderSession.smoothProperty="imageSmoothingEnabled":"webkitImageSmoothingEnabled"in this.context?this.renderSession.smoothProperty="webkitImageSmoothingEnabled":"mozImageSmoothingEnabled"in this.context?this.renderSession.smoothProperty="mozImageSmoothingEnabled":"oImageSmoothingEnabled"in this.context?this.renderSession.smoothProperty="oImageSmoothingEnabled":"msImageSmoothingEnabled"in this.context&&(this.renderSession.smoothProperty="msImageSmoothingEnabled")},b.CanvasRenderer.prototype.constructor=b.CanvasRenderer,b.CanvasRenderer.prototype.render=function(a){a.updateTransform(),this.context.setTransform(1,0,0,1,0,0),this.context.globalAlpha=1,this.renderSession.currentBlendMode=b.blendModes.NORMAL,this.context.globalCompositeOperation=b.blendModesCanvas[b.blendModes.NORMAL],navigator.isCocoonJS&&this.view.screencanvas&&(this.context.fillStyle="black",this.context.clear()),this.clearBeforeRender&&(this.transparent?this.context.clearRect(0,0,this.width,this.height):(this.context.fillStyle=a.backgroundColorString,this.context.fillRect(0,0,this.width,this.height))),this.renderDisplayObject(a),a.interactive&&(a._interactiveEventsAdded||(a._interactiveEventsAdded=!0,a.interactionManager.setTarget(this)))},b.CanvasRenderer.prototype.destroy=function(a){"undefined"==typeof a&&(a=!0),a&&this.view.parent&&this.view.parent.removeChild(this.view),this.view=null,this.context=null,this.maskManager=null,this.renderSession=null},b.CanvasRenderer.prototype.resize=function(a,b){this.width=a*this.resolution,this.height=b*this.resolution,this.view.width=this.width,this.view.height=this.height,this.autoResize&&(this.view.style.width=this.width/this.resolution+"px",this.view.style.height=this.height/this.resolution+"px")},b.CanvasRenderer.prototype.renderDisplayObject=function(a,b){this.renderSession.context=b||this.context,this.renderSession.resolution=this.resolution,a._renderCanvas(this.renderSession)},b.CanvasRenderer.prototype.mapBlendModes=function(){b.blendModesCanvas||(b.blendModesCanvas=[],b.canUseNewCanvasBlendModes()?(b.blendModesCanvas[b.blendModes.NORMAL]="source-over",b.blendModesCanvas[b.blendModes.ADD]="lighter",b.blendModesCanvas[b.blendModes.MULTIPLY]="multiply",b.blendModesCanvas[b.blendModes.SCREEN]="screen",b.blendModesCanvas[b.blendModes.OVERLAY]="overlay",b.blendModesCanvas[b.blendModes.DARKEN]="darken",b.blendModesCanvas[b.blendModes.LIGHTEN]="lighten",b.blendModesCanvas[b.blendModes.COLOR_DODGE]="color-dodge",b.blendModesCanvas[b.blendModes.COLOR_BURN]="color-burn",b.blendModesCanvas[b.blendModes.HARD_LIGHT]="hard-light",b.blendModesCanvas[b.blendModes.SOFT_LIGHT]="soft-light",b.blendModesCanvas[b.blendModes.DIFFERENCE]="difference",b.blendModesCanvas[b.blendModes.EXCLUSION]="exclusion",b.blendModesCanvas[b.blendModes.HUE]="hue",b.blendModesCanvas[b.blendModes.SATURATION]="saturation",b.blendModesCanvas[b.blendModes.COLOR]="color",b.blendModesCanvas[b.blendModes.LUMINOSITY]="luminosity"):(b.blendModesCanvas[b.blendModes.NORMAL]="source-over",b.blendModesCanvas[b.blendModes.ADD]="lighter",b.blendModesCanvas[b.blendModes.MULTIPLY]="source-over",b.blendModesCanvas[b.blendModes.SCREEN]="source-over",b.blendModesCanvas[b.blendModes.OVERLAY]="source-over",b.blendModesCanvas[b.blendModes.DARKEN]="source-over",b.blendModesCanvas[b.blendModes.LIGHTEN]="source-over",b.blendModesCanvas[b.blendModes.COLOR_DODGE]="source-over",b.blendModesCanvas[b.blendModes.COLOR_BURN]="source-over",b.blendModesCanvas[b.blendModes.HARD_LIGHT]="source-over",b.blendModesCanvas[b.blendModes.SOFT_LIGHT]="source-over",b.blendModesCanvas[b.blendModes.DIFFERENCE]="source-over",b.blendModesCanvas[b.blendModes.EXCLUSION]="source-over",b.blendModesCanvas[b.blendModes.HUE]="source-over",b.blendModesCanvas[b.blendModes.SATURATION]="source-over",b.blendModesCanvas[b.blendModes.COLOR]="source-over",b.blendModesCanvas[b.blendModes.LUMINOSITY]="source-over"))},b.CanvasGraphics=function(){},b.CanvasGraphics.renderGraphics=function(a,c){for(var d=a.worldAlpha,e="",f=0;f<a.graphicsData.length;f++){var g=a.graphicsData[f],h=g.shape;if(c.strokeStyle=e="#"+("00000"+(0|g.lineColor).toString(16)).substr(-6),c.lineWidth=g.lineWidth,g.type===b.Graphics.POLY){c.beginPath();var i=h.points;c.moveTo(i[0],i[1]);for(var j=1;j<i.length/2;j++)c.lineTo(i[2*j],i[2*j+1]);h.closed&&c.lineTo(i[0],i[1]),i[0]===i[i.length-2]&&i[1]===i[i.length-1]&&c.closePath(),g.fill&&(c.globalAlpha=g.fillAlpha*d,c.fillStyle=e="#"+("00000"+(0|g.fillColor).toString(16)).substr(-6),c.fill()),g.lineWidth&&(c.globalAlpha=g.lineAlpha*d,c.stroke())}else if(g.type===b.Graphics.RECT)(g.fillColor||0===g.fillColor)&&(c.globalAlpha=g.fillAlpha*d,c.fillStyle=e="#"+("00000"+(0|g.fillColor).toString(16)).substr(-6),c.fillRect(h.x,h.y,h.width,h.height)),g.lineWidth&&(c.globalAlpha=g.lineAlpha*d,c.strokeRect(h.x,h.y,h.width,h.height));else if(g.type===b.Graphics.CIRC)c.beginPath(),c.arc(h.x,h.y,h.radius,0,2*Math.PI),c.closePath(),g.fill&&(c.globalAlpha=g.fillAlpha*d,c.fillStyle=e="#"+("00000"+(0|g.fillColor).toString(16)).substr(-6),c.fill()),g.lineWidth&&(c.globalAlpha=g.lineAlpha*d,c.stroke());else if(g.type===b.Graphics.ELIP){var k=2*h.width,l=2*h.height,m=h.x-k/2,n=h.y-l/2;c.beginPath();var o=.5522848,p=k/2*o,q=l/2*o,r=m+k,s=n+l,t=m+k/2,u=n+l/2;c.moveTo(m,u),c.bezierCurveTo(m,u-q,t-p,n,t,n),c.bezierCurveTo(t+p,n,r,u-q,r,u),c.bezierCurveTo(r,u+q,t+p,s,t,s),c.bezierCurveTo(t-p,s,m,u+q,m,u),c.closePath(),g.fill&&(c.globalAlpha=g.fillAlpha*d,c.fillStyle=e="#"+("00000"+(0|g.fillColor).toString(16)).substr(-6),c.fill()),g.lineWidth&&(c.globalAlpha=g.lineAlpha*d,c.stroke())}else if(g.type===b.Graphics.RREC){var v=h.x,w=h.y,x=h.width,y=h.height,z=h.radius,A=Math.min(x,y)/2|0;z=z>A?A:z,c.beginPath(),c.moveTo(v,w+z),c.lineTo(v,w+y-z),c.quadraticCurveTo(v,w+y,v+z,w+y),c.lineTo(v+x-z,w+y),c.quadraticCurveTo(v+x,w+y,v+x,w+y-z),c.lineTo(v+x,w+z),c.quadraticCurveTo(v+x,w,v+x-z,w),c.lineTo(v+z,w),c.quadraticCurveTo(v,w,v,w+z),c.closePath(),(g.fillColor||0===g.fillColor)&&(c.globalAlpha=g.fillAlpha*d,c.fillStyle=e="#"+("00000"+(0|g.fillColor).toString(16)).substr(-6),c.fill()),g.lineWidth&&(c.globalAlpha=g.lineAlpha*d,c.stroke())}}},b.CanvasGraphics.renderGraphicsMask=function(a,c){var d=a.graphicsData.length;if(0!==d){d>1&&(d=1,window.console.log("Pixi.js warning: masks in canvas can only mask using the first path in the graphics object"));for(var e=0;1>e;e++){var f=a.graphicsData[e],g=f.shape;if(f.type===b.Graphics.POLY){c.beginPath();var h=g.points;c.moveTo(h[0],h[1]);for(var i=1;i<h.length/2;i++)c.lineTo(h[2*i],h[2*i+1]);h[0]===h[h.length-2]&&h[1]===h[h.length-1]&&c.closePath()}else if(f.type===b.Graphics.RECT)c.beginPath(),c.rect(g.x,g.y,g.width,g.height),c.closePath();else if(f.type===b.Graphics.CIRC)c.beginPath(),c.arc(g.x,g.y,g.radius,0,2*Math.PI),c.closePath();else if(f.type===b.Graphics.ELIP){var j=2*g.width,k=2*g.height,l=g.x-j/2,m=g.y-k/2;c.beginPath();var n=.5522848,o=j/2*n,p=k/2*n,q=l+j,r=m+k,s=l+j/2,t=m+k/2;c.moveTo(l,t),c.bezierCurveTo(l,t-p,s-o,m,s,m),c.bezierCurveTo(s+o,m,q,t-p,q,t),c.bezierCurveTo(q,t+p,s+o,r,s,r),c.bezierCurveTo(s-o,r,l,t+p,l,t),c.closePath()}else if(f.type===b.Graphics.RREC){var u=g.points,v=u[0],w=u[1],x=u[2],y=u[3],z=u[4],A=Math.min(x,y)/2|0;z=z>A?A:z,c.beginPath(),c.moveTo(v,w+z),c.lineTo(v,w+y-z),c.quadraticCurveTo(v,w+y,v+z,w+y),c.lineTo(v+x-z,w+y),c.quadraticCurveTo(v+x,w+y,v+x,w+y-z),c.lineTo(v+x,w+z),c.quadraticCurveTo(v+x,w,v+x-z,w),c.lineTo(v+z,w),c.quadraticCurveTo(v,w,v,w+z),c.closePath()}}}},b.Graphics=function(){b.DisplayObjectContainer.call(this),this.renderable=!0,this.fillAlpha=1,this.lineWidth=0,this.lineColor=0,this.graphicsData=[],this.tint=16777215,this.blendMode=b.blendModes.NORMAL,this.currentPath=null,this._webGL=[],this.isMask=!1,this.boundsPadding=0,this._localBounds=new b.Rectangle(0,0,1,1),this.dirty=!0,this.webGLDirty=!1,this.cachedSpriteDirty=!1},b.Graphics.prototype=Object.create(b.DisplayObjectContainer.prototype),b.Graphics.prototype.constructor=b.Graphics,Object.defineProperty(b.Graphics.prototype,"cacheAsBitmap",{get:function(){return this._cacheAsBitmap},set:function(a){this._cacheAsBitmap=a,this._cacheAsBitmap?this._generateCachedSprite():(this.destroyCachedSprite(),this.dirty=!0)}}),b.Graphics.prototype.lineStyle=function(a,c,d){if(this.lineWidth=a||0,this.lineColor=c||0,this.lineAlpha=arguments.length<3?1:d,this.currentPath){if(this.currentPath.shape.points.length)return this.drawShape(new b.Polygon(this.currentPath.shape.points.slice(-2))),this;this.currentPath.lineWidth=this.lineWidth,this.currentPath.lineColor=this.lineColor,this.currentPath.lineAlpha=this.lineAlpha}return this},b.Graphics.prototype.moveTo=function(a,c){return this.drawShape(new b.Polygon([a,c])),this},b.Graphics.prototype.lineTo=function(a,b){return this.currentPath.shape.points.push(a,b),this.dirty=!0,this},b.Graphics.prototype.quadraticCurveTo=function(a,b,c,d){this.currentPath?0===this.currentPath.shape.points.length&&(this.currentPath.shape.points=[0,0]):this.moveTo(0,0);var e,f,g=20,h=this.currentPath.shape.points;0===h.length&&this.moveTo(0,0);for(var i=h[h.length-2],j=h[h.length-1],k=0,l=1;g>=l;l++)k=l/g,e=i+(a-i)*k,f=j+(b-j)*k,h.push(e+(a+(c-a)*k-e)*k,f+(b+(d-b)*k-f)*k);return this.dirty=!0,this},b.Graphics.prototype.bezierCurveTo=function(a,b,c,d,e,f){this.currentPath?0===this.currentPath.shape.points.length&&(this.currentPath.shape.points=[0,0]):this.moveTo(0,0);for(var g,h,i,j,k,l=20,m=this.currentPath.shape.points,n=m[m.length-2],o=m[m.length-1],p=0,q=1;l>=q;q++)p=q/l,g=1-p,h=g*g,i=h*g,j=p*p,k=j*p,m.push(i*n+3*h*p*a+3*g*j*c+k*e,i*o+3*h*p*b+3*g*j*d+k*f);return this.dirty=!0,this},b.Graphics.prototype.arcTo=function(a,b,c,d,e){this.currentPath?0===this.currentPath.shape.points.length&&this.currentPath.shape.points.push(a,b):this.moveTo(a,b);var f=this.currentPath.shape.points,g=f[f.length-2],h=f[f.length-1],i=h-b,j=g-a,k=d-b,l=c-a,m=Math.abs(i*l-j*k);if(1e-8>m||0===e)(f[f.length-2]!==a||f[f.length-1]!==b)&&f.push(a,b);else{var n=i*i+j*j,o=k*k+l*l,p=i*k+j*l,q=e*Math.sqrt(n)/m,r=e*Math.sqrt(o)/m,s=q*p/n,t=r*p/o,u=q*l+r*j,v=q*k+r*i,w=j*(r+s),x=i*(r+s),y=l*(q+t),z=k*(q+t),A=Math.atan2(x-v,w-u),B=Math.atan2(z-v,y-u);this.arc(u+a,v+b,e,A,B,j*k>l*i)}return this.dirty=!0,this},b.Graphics.prototype.arc=function(a,b,c,d,e,f){var g=a+Math.cos(d)*c,h=b+Math.sin(d)*c,i=this.currentPath.shape.points;if(0===i.length?(this.moveTo(g,h),i=this.currentPath.shape.points):(i[i.length-2]!==g||i[i.length-1]!==h)&&i.push(g,h),d===e)return this;!f&&d>=e?e+=2*Math.PI:f&&e>=d&&(d+=2*Math.PI);var j=f?-1*(d-e):e-d,k=Math.abs(j)/(2*Math.PI)*40;if(0===j)return this;for(var l=j/(2*k),m=2*l,n=Math.cos(l),o=Math.sin(l),p=k-1,q=p%1/p,r=0;p>=r;r++){var s=r+q*r,t=l+d+m*s,u=Math.cos(t),v=-Math.sin(t);i.push((n*u+o*v)*c+a,(n*-v+o*u)*c+b)}return this.dirty=!0,this},b.Graphics.prototype.beginFill=function(a,b){return this.filling=!0,this.fillColor=a||0,this.fillAlpha=void 0===b?1:b,this.currentPath&&this.currentPath.shape.points.length<=2&&(this.currentPath.fill=this.filling,this.currentPath.fillColor=this.fillColor,this.currentPath.fillAlpha=this.fillAlpha),this},b.Graphics.prototype.endFill=function(){return this.filling=!1,this.fillColor=null,this.fillAlpha=1,this},b.Graphics.prototype.drawRect=function(a,c,d,e){return this.drawShape(new b.Rectangle(a,c,d,e)),this},b.Graphics.prototype.drawRoundedRect=function(a,c,d,e,f){return this.drawShape(new b.RoundedRectangle(a,c,d,e,f)),this},b.Graphics.prototype.drawCircle=function(a,c,d){return this.drawShape(new b.Circle(a,c,d)),this},b.Graphics.prototype.drawEllipse=function(a,c,d,e){return this.drawShape(new b.Ellipse(a,c,d,e)),this},b.Graphics.prototype.drawPolygon=function(a){return a instanceof Array||(a=Array.prototype.slice.call(arguments)),this.drawShape(new b.Polygon(a)),this},b.Graphics.prototype.clear=function(){return this.lineWidth=0,this.filling=!1,this.dirty=!0,this.clearDirty=!0,this.graphicsData=[],this},b.Graphics.prototype.generateTexture=function(a,c){a=a||1;var d=this.getBounds(),e=new b.CanvasBuffer(d.width*a,d.height*a),f=b.Texture.fromCanvas(e.canvas,c);return f.baseTexture.resolution=a,e.context.scale(a,a),e.context.translate(-d.x,-d.y),b.CanvasGraphics.renderGraphics(this,e.context),f},b.Graphics.prototype._renderWebGL=function(a){if(this.visible!==!1&&0!==this.alpha&&this.isMask!==!0){if(this._cacheAsBitmap)return(this.dirty||this.cachedSpriteDirty)&&(this._generateCachedSprite(),this.updateCachedSpriteTexture(),this.cachedSpriteDirty=!1,this.dirty=!1),this._cachedSprite.worldAlpha=this.worldAlpha,b.Sprite.prototype._renderWebGL.call(this._cachedSprite,a),void 0;if(a.spriteBatch.stop(),a.blendModeManager.setBlendMode(this.blendMode),this._mask&&a.maskManager.pushMask(this._mask,a),this._filters&&a.filterManager.pushFilter(this._filterBlock),this.blendMode!==a.spriteBatch.currentBlendMode){a.spriteBatch.currentBlendMode=this.blendMode;var c=b.blendModesWebGL[a.spriteBatch.currentBlendMode];a.spriteBatch.gl.blendFunc(c[0],c[1])}if(this.webGLDirty&&(this.dirty=!0,this.webGLDirty=!1),b.WebGLGraphics.renderGraphics(this,a),this.children.length){a.spriteBatch.start();for(var d=0,e=this.children.length;e>d;d++)this.children[d]._renderWebGL(a);a.spriteBatch.stop()}this._filters&&a.filterManager.popFilter(),this._mask&&a.maskManager.popMask(this.mask,a),a.drawCount++,a.spriteBatch.start()}},b.Graphics.prototype._renderCanvas=function(a){if(this.visible!==!1&&0!==this.alpha&&this.isMask!==!0){if(this._cacheAsBitmap)return(this.dirty||this.cachedSpriteDirty)&&(this._generateCachedSprite(),this.updateCachedSpriteTexture(),this.cachedSpriteDirty=!1,this.dirty=!1),this._cachedSprite.alpha=this.alpha,b.Sprite.prototype._renderCanvas.call(this._cachedSprite,a),void 0;var c=a.context,d=this.worldTransform;this.blendMode!==a.currentBlendMode&&(a.currentBlendMode=this.blendMode,c.globalCompositeOperation=b.blendModesCanvas[a.currentBlendMode]),this._mask&&a.maskManager.pushMask(this._mask,a);var e=a.resolution;c.setTransform(d.a*e,d.b*e,d.c*e,d.d*e,d.tx*e,d.ty*e),b.CanvasGraphics.renderGraphics(this,c);for(var f=0,g=this.children.length;g>f;f++)this.children[f]._renderCanvas(a);this._mask&&a.maskManager.popMask(a)}},b.Graphics.prototype.getBounds=function(a){if(this.isMask)return b.EmptyRectangle;this.dirty&&(this.updateLocalBounds(),this.webGLDirty=!0,this.cachedSpriteDirty=!0,this.dirty=!1);var c=this._localBounds,d=c.x,e=c.width+c.x,f=c.y,g=c.height+c.y,h=a||this.worldTransform,i=h.a,j=h.b,k=h.c,l=h.d,m=h.tx,n=h.ty,o=i*e+k*g+m,p=l*g+j*e+n,q=i*d+k*g+m,r=l*g+j*d+n,s=i*d+k*f+m,t=l*f+j*d+n,u=i*e+k*f+m,v=l*f+j*e+n,w=o,x=p,y=o,z=p;return y=y>q?q:y,y=y>s?s:y,y=y>u?u:y,z=z>r?r:z,z=z>t?t:z,z=z>v?v:z,w=q>w?q:w,w=s>w?s:w,w=u>w?u:w,x=r>x?r:x,x=t>x?t:x,x=v>x?v:x,this._bounds.x=y,this._bounds.width=w-y,this._bounds.y=z,this._bounds.height=x-z,this._bounds},b.Graphics.prototype.updateLocalBounds=function(){var a=1/0,c=-1/0,d=1/0,e=-1/0;if(this.graphicsData.length)for(var f,g,h,i,j,k,l=0;l<this.graphicsData.length;l++){var m=this.graphicsData[l],n=m.type,o=m.lineWidth;if(f=m.shape,n===b.Graphics.RECT||n===b.Graphics.RREC)h=f.x-o/2,i=f.y-o/2,j=f.width+o,k=f.height+o,a=a>h?h:a,c=h+j>c?h+j:c,d=d>i?i:d,e=i+k>e?i+k:e;else if(n===b.Graphics.CIRC)h=f.x,i=f.y,j=f.radius+o/2,k=f.radius+o/2,a=a>h-j?h-j:a,c=h+j>c?h+j:c,d=d>i-k?i-k:d,e=i+k>e?i+k:e;else if(n===b.Graphics.ELIP)h=f.x,i=f.y,j=f.width+o/2,k=f.height+o/2,a=a>h-j?h-j:a,c=h+j>c?h+j:c,d=d>i-k?i-k:d,e=i+k>e?i+k:e;else{g=f.points;for(var p=0;p<g.length;p+=2)h=g[p],i=g[p+1],a=a>h-o?h-o:a,c=h+o>c?h+o:c,d=d>i-o?i-o:d,e=i+o>e?i+o:e}}else a=0,c=0,d=0,e=0;var q=this.boundsPadding;this._localBounds.x=a-q,this._localBounds.width=c-a+2*q,this._localBounds.y=d-q,this._localBounds.height=e-d+2*q},b.Graphics.prototype._generateCachedSprite=function(){var a=this.getLocalBounds();if(this._cachedSprite)this._cachedSprite.buffer.resize(a.width,a.height);else{var c=new b.CanvasBuffer(a.width,a.height),d=b.Texture.fromCanvas(c.canvas);this._cachedSprite=new b.Sprite(d),this._cachedSprite.buffer=c,this._cachedSprite.worldTransform=this.worldTransform}this._cachedSprite.anchor.x=-(a.x/a.width),this._cachedSprite.anchor.y=-(a.y/a.height),this._cachedSprite.buffer.context.translate(-a.x,-a.y),this.worldAlpha=1,b.CanvasGraphics.renderGraphics(this,this._cachedSprite.buffer.context),this._cachedSprite.alpha=this.alpha},b.Graphics.prototype.updateCachedSpriteTexture=function(){var a=this._cachedSprite,b=a.texture,c=a.buffer.canvas;b.baseTexture.width=c.width,b.baseTexture.height=c.height,b.crop.width=b.frame.width=c.width,b.crop.height=b.frame.height=c.height,a._width=c.width,a._height=c.height,b.baseTexture.dirty()},b.Graphics.prototype.destroyCachedSprite=function(){this._cachedSprite.texture.destroy(!0),this._cachedSprite=null},b.Graphics.prototype.drawShape=function(a){this.currentPath&&this.currentPath.shape.points.length<=2&&this.graphicsData.pop(),this.currentPath=null;var c=new b.GraphicsData(this.lineWidth,this.lineColor,this.lineAlpha,this.fillColor,this.fillAlpha,this.filling,a);return this.graphicsData.push(c),c.type===b.Graphics.POLY&&(c.shape.closed=this.filling,this.currentPath=c),this.dirty=!0,c},b.GraphicsData=function(a,b,c,d,e,f,g){this.lineWidth=a,this.lineColor=b,this.lineAlpha=c,this.fillColor=d,this.fillAlpha=e,this.fill=f,this.shape=g,this.type=g.type},b.Graphics.POLY=0,b.Graphics.RECT=1,b.Graphics.CIRC=2,b.Graphics.ELIP=3,b.Graphics.RREC=4,b.Polygon.prototype.type=b.Graphics.POLY,b.Rectangle.prototype.type=b.Graphics.RECT,b.Circle.prototype.type=b.Graphics.CIRC,b.Ellipse.prototype.type=b.Graphics.ELIP,b.RoundedRectangle.prototype.type=b.Graphics.RREC,b.Strip=function(a){b.DisplayObjectContainer.call(this),this.texture=a,this.uvs=new b.Float32Array([0,1,1,1,1,0,0,1]),this.verticies=new b.Float32Array([0,0,100,0,100,100,0,100]),this.colors=new b.Float32Array([1,1,1,1]),this.indices=new b.Uint16Array([0,1,2,3]),this.dirty=!0,this.blendMode=b.blendModes.NORMAL,this.padding=0},b.Strip.prototype=Object.create(b.DisplayObjectContainer.prototype),b.Strip.prototype.constructor=b.Strip,b.Strip.prototype._renderWebGL=function(a){!this.visible||this.alpha<=0||(a.spriteBatch.stop(),this._vertexBuffer||this._initWebGL(a),a.shaderManager.setShader(a.shaderManager.stripShader),this._renderStrip(a),a.spriteBatch.start())},b.Strip.prototype._initWebGL=function(a){var b=a.gl;this._vertexBuffer=b.createBuffer(),this._indexBuffer=b.createBuffer(),this._uvBuffer=b.createBuffer(),this._colorBuffer=b.createBuffer(),b.bindBuffer(b.ARRAY_BUFFER,this._vertexBuffer),b.bufferData(b.ARRAY_BUFFER,this.verticies,b.DYNAMIC_DRAW),b.bindBuffer(b.ARRAY_BUFFER,this._uvBuffer),b.bufferData(b.ARRAY_BUFFER,this.uvs,b.STATIC_DRAW),b.bindBuffer(b.ARRAY_BUFFER,this._colorBuffer),b.bufferData(b.ARRAY_BUFFER,this.colors,b.STATIC_DRAW),b.bindBuffer(b.ELEMENT_ARRAY_BUFFER,this._indexBuffer),b.bufferData(b.ELEMENT_ARRAY_BUFFER,this.indices,b.STATIC_DRAW)},b.Strip.prototype._renderStrip=function(a){var b=a.gl,c=a.projection,d=a.offset,e=a.shaderManager.stripShader;a.blendModeManager.setBlendMode(this.blendMode),b.uniformMatrix3fv(e.translationMatrix,!1,this.worldTransform.toArray(!0)),b.uniform2f(e.projectionVector,c.x,-c.y),b.uniform2f(e.offsetVector,-d.x,-d.y),b.uniform1f(e.alpha,this.worldAlpha),this.dirty?(this.dirty=!1,b.bindBuffer(b.ARRAY_BUFFER,this._vertexBuffer),b.bufferData(b.ARRAY_BUFFER,this.verticies,b.STATIC_DRAW),b.vertexAttribPointer(e.aVertexPosition,2,b.FLOAT,!1,0,0),b.bindBuffer(b.ARRAY_BUFFER,this._uvBuffer),b.bufferData(b.ARRAY_BUFFER,this.uvs,b.STATIC_DRAW),b.vertexAttribPointer(e.aTextureCoord,2,b.FLOAT,!1,0,0),b.activeTexture(b.TEXTURE0),this.texture.baseTexture._dirty[b.id]?a.renderer.updateTexture(this.texture.baseTexture):b.bindTexture(b.TEXTURE_2D,this.texture.baseTexture._glTextures[b.id]),b.bindBuffer(b.ELEMENT_ARRAY_BUFFER,this._indexBuffer),b.bufferData(b.ELEMENT_ARRAY_BUFFER,this.indices,b.STATIC_DRAW)):(b.bindBuffer(b.ARRAY_BUFFER,this._vertexBuffer),b.bufferSubData(b.ARRAY_BUFFER,0,this.verticies),b.vertexAttribPointer(e.aVertexPosition,2,b.FLOAT,!1,0,0),b.bindBuffer(b.ARRAY_BUFFER,this._uvBuffer),b.vertexAttribPointer(e.aTextureCoord,2,b.FLOAT,!1,0,0),b.activeTexture(b.TEXTURE0),this.texture.baseTexture._dirty[b.id]?a.renderer.updateTexture(this.texture.baseTexture):b.bindTexture(b.TEXTURE_2D,this.texture.baseTexture._glTextures[b.id]),b.bindBuffer(b.ELEMENT_ARRAY_BUFFER,this._indexBuffer)),b.drawElements(b.TRIANGLE_STRIP,this.indices.length,b.UNSIGNED_SHORT,0)},b.Strip.prototype._renderCanvas=function(a){var b=a.context,c=this.worldTransform;a.roundPixels?b.setTransform(c.a,c.b,c.c,c.d,0|c.tx,0|c.ty):b.setTransform(c.a,c.b,c.c,c.d,c.tx,c.ty);var d=this,e=d.verticies,f=d.uvs,g=e.length/2;this.count++;for(var h=0;g-2>h;h++){var i=2*h,j=e[i],k=e[i+2],l=e[i+4],m=e[i+1],n=e[i+3],o=e[i+5];if(this.padding>0){var p=(j+k+l)/3,q=(m+n+o)/3,r=j-p,s=m-q,t=Math.sqrt(r*r+s*s);j=p+r/t*(t+3),m=q+s/t*(t+3),r=k-p,s=n-q,t=Math.sqrt(r*r+s*s),k=p+r/t*(t+3),n=q+s/t*(t+3),r=l-p,s=o-q,t=Math.sqrt(r*r+s*s),l=p+r/t*(t+3),o=q+s/t*(t+3)}var u=f[i]*d.texture.width,v=f[i+2]*d.texture.width,w=f[i+4]*d.texture.width,x=f[i+1]*d.texture.height,y=f[i+3]*d.texture.height,z=f[i+5]*d.texture.height;b.save(),b.beginPath(),b.moveTo(j,m),b.lineTo(k,n),b.lineTo(l,o),b.closePath(),b.clip();var A=u*y+x*w+v*z-y*w-x*v-u*z,B=j*y+x*l+k*z-y*l-x*k-j*z,C=u*k+j*w+v*l-k*w-j*v-u*l,D=u*y*l+x*k*w+j*v*z-j*y*w-x*v*l-u*k*z,E=m*y+x*o+n*z-y*o-x*n-m*z,F=u*n+m*w+v*o-n*w-m*v-u*o,G=u*y*o+x*n*w+m*v*z-m*y*w-x*v*o-u*n*z;b.transform(B/A,E/A,C/A,F/A,D/A,G/A),b.drawImage(d.texture.baseTexture.source,0,0),b.restore()}},b.Strip.prototype.renderStripFlat=function(a){var b=this.context,c=a.verticies,d=c.length/2;this.count++,b.beginPath();for(var e=1;d-2>e;e++){var f=2*e,g=c[f],h=c[f+2],i=c[f+4],j=c[f+1],k=c[f+3],l=c[f+5];b.moveTo(g,j),b.lineTo(h,k),b.lineTo(i,l)}b.fillStyle="#FF0000",b.fill(),b.closePath()},b.Strip.prototype.onTextureUpdate=function(){this.updateFrame=!0},b.Rope=function(a,c){b.Strip.call(this,a),this.points=c,this.verticies=new b.Float32Array(4*c.length),this.uvs=new b.Float32Array(4*c.length),this.colors=new b.Float32Array(2*c.length),this.indices=new b.Uint16Array(2*c.length),this.refresh()},b.Rope.prototype=Object.create(b.Strip.prototype),b.Rope.prototype.constructor=b.Rope,b.Rope.prototype.refresh=function(){var a=this.points;if(!(a.length<1)){var b=this.uvs,c=a[0],d=this.indices,e=this.colors;this.count-=.2,b[0]=0,b[1]=0,b[2]=0,b[3]=1,e[0]=1,e[1]=1,d[0]=0,d[1]=1;for(var f,g,h,i=a.length,j=1;i>j;j++)f=a[j],g=4*j,h=j/(i-1),j%2?(b[g]=h,b[g+1]=0,b[g+2]=h,b[g+3]=1):(b[g]=h,b[g+1]=0,b[g+2]=h,b[g+3]=1),g=2*j,e[g]=1,e[g+1]=1,g=2*j,d[g]=g,d[g+1]=g+1,c=f}},b.Rope.prototype.updateTransform=function(){var a=this.points;if(!(a.length<1)){var c,d=a[0],e={x:0,y:0};this.count-=.2;for(var f,g,h,i,j,k=this.verticies,l=a.length,m=0;l>m;m++)f=a[m],g=4*m,c=m<a.length-1?a[m+1]:f,e.y=-(c.x-d.x),e.x=c.y-d.y,h=10*(1-m/(l-1)),h>1&&(h=1),i=Math.sqrt(e.x*e.x+e.y*e.y),j=this.texture.height/2,e.x/=i,e.y/=i,e.x*=j,e.y*=j,k[g]=f.x+e.x,k[g+1]=f.y+e.y,k[g+2]=f.x-e.x,k[g+3]=f.y-e.y,d=f;b.DisplayObjectContainer.prototype.updateTransform.call(this)}},b.Rope.prototype.setTexture=function(a){this.texture=a},b.TilingSprite=function(a,c,d){b.Sprite.call(this,a),this._width=c||100,this._height=d||100,this.tileScale=new b.Point(1,1),this.tileScaleOffset=new b.Point(1,1),this.tilePosition=new b.Point(0,0),this.renderable=!0,this.tint=16777215,this.blendMode=b.blendModes.NORMAL},b.TilingSprite.prototype=Object.create(b.Sprite.prototype),b.TilingSprite.prototype.constructor=b.TilingSprite,Object.defineProperty(b.TilingSprite.prototype,"width",{get:function(){return this._width},set:function(a){this._width=a}}),Object.defineProperty(b.TilingSprite.prototype,"height",{get:function(){return this._height},set:function(a){this._height=a}}),b.TilingSprite.prototype.setTexture=function(a){this.texture!==a&&(this.texture=a,this.refreshTexture=!0,this.cachedTint=16777215)},b.TilingSprite.prototype._renderWebGL=function(a){if(this.visible!==!1&&0!==this.alpha){var c,d;for(this._mask&&(a.spriteBatch.stop(),a.maskManager.pushMask(this.mask,a),a.spriteBatch.start()),this._filters&&(a.spriteBatch.flush(),a.filterManager.pushFilter(this._filterBlock)),!this.tilingTexture||this.refreshTexture?(this.generateTilingTexture(!0),this.tilingTexture&&this.tilingTexture.needsUpdate&&(b.updateWebGLTexture(this.tilingTexture.baseTexture,a.gl),this.tilingTexture.needsUpdate=!1)):a.spriteBatch.renderTilingSprite(this),c=0,d=this.children.length;d>c;c++)this.children[c]._renderWebGL(a);a.spriteBatch.stop(),this._filters&&a.filterManager.popFilter(),this._mask&&a.maskManager.popMask(this._mask,a),a.spriteBatch.start()}},b.TilingSprite.prototype._renderCanvas=function(a){if(this.visible!==!1&&0!==this.alpha){var c=a.context;this._mask&&a.maskManager.pushMask(this._mask,c),c.globalAlpha=this.worldAlpha;var d,e,f=this.worldTransform,g=a.resolution;if(c.setTransform(f.a*g,f.c*g,f.b*g,f.d*g,f.tx*g,f.ty*g),!this.__tilePattern||this.refreshTexture){if(this.generateTilingTexture(!1),!this.tilingTexture)return;this.__tilePattern=c.createPattern(this.tilingTexture.baseTexture.source,"repeat")}this.blendMode!==a.currentBlendMode&&(a.currentBlendMode=this.blendMode,c.globalCompositeOperation=b.blendModesCanvas[a.currentBlendMode]);var h=this.tilePosition,i=this.tileScale;for(h.x%=this.tilingTexture.baseTexture.width,h.y%=this.tilingTexture.baseTexture.height,c.scale(i.x,i.y),c.translate(h.x+this.anchor.x*-this._width,h.y+this.anchor.y*-this._height),c.fillStyle=this.__tilePattern,c.fillRect(-h.x,-h.y,this._width/i.x,this._height/i.y),c.scale(1/i.x,1/i.y),c.translate(-h.x+this.anchor.x*this._width,-h.y+this.anchor.y*this._height),this._mask&&a.maskManager.popMask(a.context),d=0,e=this.children.length;e>d;d++)this.children[d]._renderCanvas(a)}},b.TilingSprite.prototype.getBounds=function(){var a=this._width,b=this._height,c=a*(1-this.anchor.x),d=a*-this.anchor.x,e=b*(1-this.anchor.y),f=b*-this.anchor.y,g=this.worldTransform,h=g.a,i=g.b,j=g.c,k=g.d,l=g.tx,m=g.ty,n=h*d+j*f+l,o=k*f+i*d+m,p=h*c+j*f+l,q=k*f+i*c+m,r=h*c+j*e+l,s=k*e+i*c+m,t=h*d+j*e+l,u=k*e+i*d+m,v=-1/0,w=-1/0,x=1/0,y=1/0;x=x>n?n:x,x=x>p?p:x,x=x>r?r:x,x=x>t?t:x,y=y>o?o:y,y=y>q?q:y,y=y>s?s:y,y=y>u?u:y,v=n>v?n:v,v=p>v?p:v,v=r>v?r:v,v=t>v?t:v,w=o>w?o:w,w=q>w?q:w,w=s>w?s:w,w=u>w?u:w;var z=this._bounds;return z.x=x,z.width=v-x,z.y=y,z.height=w-y,this._currentBounds=z,z},b.TilingSprite.prototype.onTextureUpdate=function(){},b.TilingSprite.prototype.generateTilingTexture=function(a){if(this.texture.baseTexture.hasLoaded){var c,d,e=this.originalTexture||this.texture,f=e.frame,g=f.width!==e.baseTexture.width||f.height!==e.baseTexture.height,h=!1;if(a?(c=b.getNextPowerOfTwo(f.width),d=b.getNextPowerOfTwo(f.height),(f.width!==c||f.height!==d)&&(h=!0)):g&&(c=f.width,d=f.height,h=!0),h){var i;this.tilingTexture&&this.tilingTexture.isTiling?(i=this.tilingTexture.canvasBuffer,i.resize(c,d),this.tilingTexture.baseTexture.width=c,this.tilingTexture.baseTexture.height=d,this.tilingTexture.needsUpdate=!0):(i=new b.CanvasBuffer(c,d),this.tilingTexture=b.Texture.fromCanvas(i.canvas),this.tilingTexture.canvasBuffer=i,this.tilingTexture.isTiling=!0),i.context.drawImage(e.baseTexture.source,e.crop.x,e.crop.y,e.crop.width,e.crop.height,0,0,c,d),this.tileScaleOffset.x=f.width/c,this.tileScaleOffset.y=f.height/d}else this.tilingTexture&&this.tilingTexture.isTiling&&this.tilingTexture.destroy(!0),this.tileScaleOffset.x=1,this.tileScaleOffset.y=1,this.tilingTexture=e;this.refreshTexture=!1,this.originalTexture=this.texture,this.texture=this.tilingTexture,this.tilingTexture.baseTexture._powerOf2=!0}};var c={};c.BoneData=function(a,b){this.name=a,this.parent=b},c.BoneData.prototype={length:0,x:0,y:0,rotation:0,scaleX:1,scaleY:1},c.SlotData=function(a,b){this.name=a,this.boneData=b},c.SlotData.prototype={r:1,g:1,b:1,a:1,attachmentName:null},c.Bone=function(a,b){this.data=a,this.parent=b,this.setToSetupPose()
},c.Bone.yDown=!1,c.Bone.prototype={x:0,y:0,rotation:0,scaleX:1,scaleY:1,m00:0,m01:0,worldX:0,m10:0,m11:0,worldY:0,worldRotation:0,worldScaleX:1,worldScaleY:1,updateWorldTransform:function(a,b){var d=this.parent;null!=d?(this.worldX=this.x*d.m00+this.y*d.m01+d.worldX,this.worldY=this.x*d.m10+this.y*d.m11+d.worldY,this.worldScaleX=d.worldScaleX*this.scaleX,this.worldScaleY=d.worldScaleY*this.scaleY,this.worldRotation=d.worldRotation+this.rotation):(this.worldX=this.x,this.worldY=this.y,this.worldScaleX=this.scaleX,this.worldScaleY=this.scaleY,this.worldRotation=this.rotation);var e=this.worldRotation*Math.PI/180,f=Math.cos(e),g=Math.sin(e);this.m00=f*this.worldScaleX,this.m10=g*this.worldScaleX,this.m01=-g*this.worldScaleY,this.m11=f*this.worldScaleY,a&&(this.m00=-this.m00,this.m01=-this.m01),b&&(this.m10=-this.m10,this.m11=-this.m11),c.Bone.yDown&&(this.m10=-this.m10,this.m11=-this.m11)},setToSetupPose:function(){var a=this.data;this.x=a.x,this.y=a.y,this.rotation=a.rotation,this.scaleX=a.scaleX,this.scaleY=a.scaleY}},c.Slot=function(a,b,c){this.data=a,this.skeleton=b,this.bone=c,this.setToSetupPose()},c.Slot.prototype={r:1,g:1,b:1,a:1,_attachmentTime:0,attachment:null,setAttachment:function(a){this.attachment=a,this._attachmentTime=this.skeleton.time},setAttachmentTime:function(a){this._attachmentTime=this.skeleton.time-a},getAttachmentTime:function(){return this.skeleton.time-this._attachmentTime},setToSetupPose:function(){var a=this.data;this.r=a.r,this.g=a.g,this.b=a.b,this.a=a.a;for(var b=this.skeleton.data.slots,c=0,d=b.length;d>c;c++)if(b[c]==a){this.setAttachment(a.attachmentName?this.skeleton.getAttachmentBySlotIndex(c,a.attachmentName):null);break}}},c.Skin=function(a){this.name=a,this.attachments={}},c.Skin.prototype={addAttachment:function(a,b,c){this.attachments[a+":"+b]=c},getAttachment:function(a,b){return this.attachments[a+":"+b]},_attachAll:function(a,b){for(var c in b.attachments){var d=c.indexOf(":"),e=parseInt(c.substring(0,d),10),f=c.substring(d+1),g=a.slots[e];if(g.attachment&&g.attachment.name==f){var h=this.getAttachment(e,f);h&&g.setAttachment(h)}}}},c.Animation=function(a,b,c){this.name=a,this.timelines=b,this.duration=c},c.Animation.prototype={apply:function(a,b,c){c&&this.duration&&(b%=this.duration);for(var d=this.timelines,e=0,f=d.length;f>e;e++)d[e].apply(a,b,1)},mix:function(a,b,c,d){c&&this.duration&&(b%=this.duration);for(var e=this.timelines,f=0,g=e.length;g>f;f++)e[f].apply(a,b,d)}},c.binarySearch=function(a,b,c){var d=0,e=Math.floor(a.length/c)-2;if(!e)return c;for(var f=e>>>1;;){if(a[(f+1)*c]<=b?d=f+1:e=f,d==e)return(d+1)*c;f=d+e>>>1}},c.linearSearch=function(a,b,c){for(var d=0,e=a.length-c;e>=d;d+=c)if(a[d]>b)return d;return-1},c.Curves=function(a){this.curves=[],this.curves.length=6*(a-1)},c.Curves.prototype={setLinear:function(a){this.curves[6*a]=0},setStepped:function(a){this.curves[6*a]=-1},setCurve:function(a,b,c,d,e){var f=.1,g=f*f,h=g*f,i=3*f,j=3*g,k=6*g,l=6*h,m=2*-b+d,n=2*-c+e,o=3*(b-d)+1,p=3*(c-e)+1,q=6*a,r=this.curves;r[q]=b*i+m*j+o*h,r[q+1]=c*i+n*j+p*h,r[q+2]=m*k+o*l,r[q+3]=n*k+p*l,r[q+4]=o*l,r[q+5]=p*l},getCurvePercent:function(a,b){b=0>b?0:b>1?1:b;var c=6*a,d=this.curves,e=d[c];if(!e)return b;if(-1==e)return 0;for(var f=d[c+1],g=d[c+2],h=d[c+3],i=d[c+4],j=d[c+5],k=e,l=f,m=8;;){if(k>=b){var n=k-e,o=l-f;return o+(l-o)*(b-n)/(k-n)}if(!m)break;m--,e+=g,f+=h,g+=i,h+=j,k+=e,l+=f}return l+(1-l)*(b-k)/(1-k)}},c.RotateTimeline=function(a){this.curves=new c.Curves(a),this.frames=[],this.frames.length=2*a},c.RotateTimeline.prototype={boneIndex:0,getFrameCount:function(){return this.frames.length/2},setFrame:function(a,b,c){a*=2,this.frames[a]=b,this.frames[a+1]=c},apply:function(a,b,d){var e,f=this.frames;if(!(b<f[0])){var g=a.bones[this.boneIndex];if(b>=f[f.length-2]){for(e=g.data.rotation+f[f.length-1]-g.rotation;e>180;)e-=360;for(;-180>e;)e+=360;return g.rotation+=e*d,void 0}var h=c.binarySearch(f,b,2),i=f[h-1],j=f[h],k=1-(b-j)/(f[h-2]-j);for(k=this.curves.getCurvePercent(h/2-1,k),e=f[h+1]-i;e>180;)e-=360;for(;-180>e;)e+=360;for(e=g.data.rotation+(i+e*k)-g.rotation;e>180;)e-=360;for(;-180>e;)e+=360;g.rotation+=e*d}}},c.TranslateTimeline=function(a){this.curves=new c.Curves(a),this.frames=[],this.frames.length=3*a},c.TranslateTimeline.prototype={boneIndex:0,getFrameCount:function(){return this.frames.length/3},setFrame:function(a,b,c,d){a*=3,this.frames[a]=b,this.frames[a+1]=c,this.frames[a+2]=d},apply:function(a,b,d){var e=this.frames;if(!(b<e[0])){var f=a.bones[this.boneIndex];if(b>=e[e.length-3])return f.x+=(f.data.x+e[e.length-2]-f.x)*d,f.y+=(f.data.y+e[e.length-1]-f.y)*d,void 0;var g=c.binarySearch(e,b,3),h=e[g-2],i=e[g-1],j=e[g],k=1-(b-j)/(e[g+-3]-j);k=this.curves.getCurvePercent(g/3-1,k),f.x+=(f.data.x+h+(e[g+1]-h)*k-f.x)*d,f.y+=(f.data.y+i+(e[g+2]-i)*k-f.y)*d}}},c.ScaleTimeline=function(a){this.curves=new c.Curves(a),this.frames=[],this.frames.length=3*a},c.ScaleTimeline.prototype={boneIndex:0,getFrameCount:function(){return this.frames.length/3},setFrame:function(a,b,c,d){a*=3,this.frames[a]=b,this.frames[a+1]=c,this.frames[a+2]=d},apply:function(a,b,d){var e=this.frames;if(!(b<e[0])){var f=a.bones[this.boneIndex];if(b>=e[e.length-3])return f.scaleX+=(f.data.scaleX-1+e[e.length-2]-f.scaleX)*d,f.scaleY+=(f.data.scaleY-1+e[e.length-1]-f.scaleY)*d,void 0;var g=c.binarySearch(e,b,3),h=e[g-2],i=e[g-1],j=e[g],k=1-(b-j)/(e[g+-3]-j);k=this.curves.getCurvePercent(g/3-1,k),f.scaleX+=(f.data.scaleX-1+h+(e[g+1]-h)*k-f.scaleX)*d,f.scaleY+=(f.data.scaleY-1+i+(e[g+2]-i)*k-f.scaleY)*d}}},c.ColorTimeline=function(a){this.curves=new c.Curves(a),this.frames=[],this.frames.length=5*a},c.ColorTimeline.prototype={slotIndex:0,getFrameCount:function(){return this.frames.length/5},setFrame:function(a,b,c,d,e,f){a*=5,this.frames[a]=b,this.frames[a+1]=c,this.frames[a+2]=d,this.frames[a+3]=e,this.frames[a+4]=f},apply:function(a,b,d){var e=this.frames;if(!(b<e[0])){var f=a.slots[this.slotIndex];if(b>=e[e.length-5]){var g=e.length-1;return f.r=e[g-3],f.g=e[g-2],f.b=e[g-1],f.a=e[g],void 0}var h=c.binarySearch(e,b,5),i=e[h-4],j=e[h-3],k=e[h-2],l=e[h-1],m=e[h],n=1-(b-m)/(e[h-5]-m);n=this.curves.getCurvePercent(h/5-1,n);var o=i+(e[h+1]-i)*n,p=j+(e[h+2]-j)*n,q=k+(e[h+3]-k)*n,r=l+(e[h+4]-l)*n;1>d?(f.r+=(o-f.r)*d,f.g+=(p-f.g)*d,f.b+=(q-f.b)*d,f.a+=(r-f.a)*d):(f.r=o,f.g=p,f.b=q,f.a=r)}}},c.AttachmentTimeline=function(a){this.curves=new c.Curves(a),this.frames=[],this.frames.length=a,this.attachmentNames=[],this.attachmentNames.length=a},c.AttachmentTimeline.prototype={slotIndex:0,getFrameCount:function(){return this.frames.length},setFrame:function(a,b,c){this.frames[a]=b,this.attachmentNames[a]=c},apply:function(a,b){var d=this.frames;if(!(b<d[0])){var e;e=b>=d[d.length-1]?d.length-1:c.binarySearch(d,b,1)-1;var f=this.attachmentNames[e];a.slots[this.slotIndex].setAttachment(f?a.getAttachmentBySlotIndex(this.slotIndex,f):null)}}},c.SkeletonData=function(){this.bones=[],this.slots=[],this.skins=[],this.animations=[]},c.SkeletonData.prototype={defaultSkin:null,findBone:function(a){for(var b=this.bones,c=0,d=b.length;d>c;c++)if(b[c].name==a)return b[c];return null},findBoneIndex:function(a){for(var b=this.bones,c=0,d=b.length;d>c;c++)if(b[c].name==a)return c;return-1},findSlot:function(a){for(var b=this.slots,c=0,d=b.length;d>c;c++)if(b[c].name==a)return slot[c];return null},findSlotIndex:function(a){for(var b=this.slots,c=0,d=b.length;d>c;c++)if(b[c].name==a)return c;return-1},findSkin:function(a){for(var b=this.skins,c=0,d=b.length;d>c;c++)if(b[c].name==a)return b[c];return null},findAnimation:function(a){for(var b=this.animations,c=0,d=b.length;d>c;c++)if(b[c].name==a)return b[c];return null}},c.Skeleton=function(a){this.data=a,this.bones=[];for(var b=0,d=a.bones.length;d>b;b++){var e=a.bones[b],f=e.parent?this.bones[a.bones.indexOf(e.parent)]:null;this.bones.push(new c.Bone(e,f))}for(this.slots=[],this.drawOrder=[],b=0,d=a.slots.length;d>b;b++){var g=a.slots[b],h=this.bones[a.bones.indexOf(g.boneData)],i=new c.Slot(g,this,h);this.slots.push(i),this.drawOrder.push(i)}},c.Skeleton.prototype={x:0,y:0,skin:null,r:1,g:1,b:1,a:1,time:0,flipX:!1,flipY:!1,updateWorldTransform:function(){for(var a=this.flipX,b=this.flipY,c=this.bones,d=0,e=c.length;e>d;d++)c[d].updateWorldTransform(a,b)},setToSetupPose:function(){this.setBonesToSetupPose(),this.setSlotsToSetupPose()},setBonesToSetupPose:function(){for(var a=this.bones,b=0,c=a.length;c>b;b++)a[b].setToSetupPose()},setSlotsToSetupPose:function(){for(var a=this.slots,b=0,c=a.length;c>b;b++)a[b].setToSetupPose(b)},getRootBone:function(){return this.bones.length?this.bones[0]:null},findBone:function(a){for(var b=this.bones,c=0,d=b.length;d>c;c++)if(b[c].data.name==a)return b[c];return null},findBoneIndex:function(a){for(var b=this.bones,c=0,d=b.length;d>c;c++)if(b[c].data.name==a)return c;return-1},findSlot:function(a){for(var b=this.slots,c=0,d=b.length;d>c;c++)if(b[c].data.name==a)return b[c];return null},findSlotIndex:function(a){for(var b=this.slots,c=0,d=b.length;d>c;c++)if(b[c].data.name==a)return c;return-1},setSkinByName:function(a){var b=this.data.findSkin(a);if(!b)throw"Skin not found: "+a;this.setSkin(b)},setSkin:function(a){this.skin&&a&&a._attachAll(this,this.skin),this.skin=a},getAttachmentBySlotName:function(a,b){return this.getAttachmentBySlotIndex(this.data.findSlotIndex(a),b)},getAttachmentBySlotIndex:function(a,b){if(this.skin){var c=this.skin.getAttachment(a,b);if(c)return c}return this.data.defaultSkin?this.data.defaultSkin.getAttachment(a,b):null},setAttachment:function(a,b){for(var c=this.slots,d=0,e=c.size;e>d;d++){var f=c[d];if(f.data.name==a){var g=null;if(b&&(g=this.getAttachment(d,b),null==g))throw"Attachment not found: "+b+", for slot: "+a;return f.setAttachment(g),void 0}}throw"Slot not found: "+a},update:function(a){time+=a}},c.AttachmentType={region:0},c.RegionAttachment=function(){this.offset=[],this.offset.length=8,this.uvs=[],this.uvs.length=8},c.RegionAttachment.prototype={x:0,y:0,rotation:0,scaleX:1,scaleY:1,width:0,height:0,rendererObject:null,regionOffsetX:0,regionOffsetY:0,regionWidth:0,regionHeight:0,regionOriginalWidth:0,regionOriginalHeight:0,setUVs:function(a,b,c,d,e){var f=this.uvs;e?(f[2]=a,f[3]=d,f[4]=a,f[5]=b,f[6]=c,f[7]=b,f[0]=c,f[1]=d):(f[0]=a,f[1]=d,f[2]=a,f[3]=b,f[4]=c,f[5]=b,f[6]=c,f[7]=d)},updateOffset:function(){var a=this.width/this.regionOriginalWidth*this.scaleX,b=this.height/this.regionOriginalHeight*this.scaleY,c=-this.width/2*this.scaleX+this.regionOffsetX*a,d=-this.height/2*this.scaleY+this.regionOffsetY*b,e=c+this.regionWidth*a,f=d+this.regionHeight*b,g=this.rotation*Math.PI/180,h=Math.cos(g),i=Math.sin(g),j=c*h+this.x,k=c*i,l=d*h+this.y,m=d*i,n=e*h+this.x,o=e*i,p=f*h+this.y,q=f*i,r=this.offset;r[0]=j-m,r[1]=l+k,r[2]=j-q,r[3]=p+k,r[4]=n-q,r[5]=p+o,r[6]=n-m,r[7]=l+o},computeVertices:function(a,b,c,d){a+=c.worldX,b+=c.worldY;var e=c.m00,f=c.m01,g=c.m10,h=c.m11,i=this.offset;d[0]=i[0]*e+i[1]*f+a,d[1]=i[0]*g+i[1]*h+b,d[2]=i[2]*e+i[3]*f+a,d[3]=i[2]*g+i[3]*h+b,d[4]=i[4]*e+i[5]*f+a,d[5]=i[4]*g+i[5]*h+b,d[6]=i[6]*e+i[7]*f+a,d[7]=i[6]*g+i[7]*h+b}},c.AnimationStateData=function(a){this.skeletonData=a,this.animationToMixTime={}},c.AnimationStateData.prototype={defaultMix:0,setMixByName:function(a,b,c){var d=this.skeletonData.findAnimation(a);if(!d)throw"Animation not found: "+a;var e=this.skeletonData.findAnimation(b);if(!e)throw"Animation not found: "+b;this.setMix(d,e,c)},setMix:function(a,b,c){this.animationToMixTime[a.name+":"+b.name]=c},getMix:function(a,b){var c=this.animationToMixTime[a.name+":"+b.name];return c?c:this.defaultMix}},c.AnimationState=function(a){this.data=a,this.queue=[]},c.AnimationState.prototype={animationSpeed:1,current:null,previous:null,currentTime:0,previousTime:0,currentLoop:!1,previousLoop:!1,mixTime:0,mixDuration:0,update:function(a){if(this.currentTime+=a*this.animationSpeed,this.previousTime+=a,this.mixTime+=a,this.queue.length>0){var b=this.queue[0];this.currentTime>=b.delay&&(this._setAnimation(b.animation,b.loop),this.queue.shift())}},apply:function(a){if(this.current)if(this.previous){this.previous.apply(a,this.previousTime,this.previousLoop);var b=this.mixTime/this.mixDuration;b>=1&&(b=1,this.previous=null),this.current.mix(a,this.currentTime,this.currentLoop,b)}else this.current.apply(a,this.currentTime,this.currentLoop)},clearAnimation:function(){this.previous=null,this.current=null,this.queue.length=0},_setAnimation:function(a,b){this.previous=null,a&&this.current&&(this.mixDuration=this.data.getMix(this.current,a),this.mixDuration>0&&(this.mixTime=0,this.previous=this.current,this.previousTime=this.currentTime,this.previousLoop=this.currentLoop)),this.current=a,this.currentLoop=b,this.currentTime=0},setAnimationByName:function(a,b){var c=this.data.skeletonData.findAnimation(a);if(!c)throw"Animation not found: "+a;this.setAnimation(c,b)},setAnimation:function(a,b){this.queue.length=0,this._setAnimation(a,b)},addAnimationByName:function(a,b,c){var d=this.data.skeletonData.findAnimation(a);if(!d)throw"Animation not found: "+a;this.addAnimation(d,b,c)},addAnimation:function(a,b,c){var d={};if(d.animation=a,d.loop=b,!c||0>=c){var e=this.queue.length?this.queue[this.queue.length-1].animation:this.current;c=null!=e?e.duration-this.data.getMix(e,a)+(c||0):0}d.delay=c,this.queue.push(d)},isComplete:function(){return!this.current||this.currentTime>=this.current.duration}},c.SkeletonJson=function(a){this.attachmentLoader=a},c.SkeletonJson.prototype={scale:1,readSkeletonData:function(a){for(var b,d=new c.SkeletonData,e=a.bones,f=0,g=e.length;g>f;f++){var h=e[f],i=null;if(h.parent&&(i=d.findBone(h.parent),!i))throw"Parent bone not found: "+h.parent;b=new c.BoneData(h.name,i),b.length=(h.length||0)*this.scale,b.x=(h.x||0)*this.scale,b.y=(h.y||0)*this.scale,b.rotation=h.rotation||0,b.scaleX=h.scaleX||1,b.scaleY=h.scaleY||1,d.bones.push(b)}var j=a.slots;for(f=0,g=j.length;g>f;f++){var k=j[f];if(b=d.findBone(k.bone),!b)throw"Slot bone not found: "+k.bone;var l=new c.SlotData(k.name,b),m=k.color;m&&(l.r=c.SkeletonJson.toColor(m,0),l.g=c.SkeletonJson.toColor(m,1),l.b=c.SkeletonJson.toColor(m,2),l.a=c.SkeletonJson.toColor(m,3)),l.attachmentName=k.attachment,d.slots.push(l)}var n=a.skins;for(var o in n)if(n.hasOwnProperty(o)){var p=n[o],q=new c.Skin(o);for(var r in p)if(p.hasOwnProperty(r)){var s=d.findSlotIndex(r),t=p[r];for(var u in t)if(t.hasOwnProperty(u)){var v=this.readAttachment(q,u,t[u]);null!=v&&q.addAttachment(s,u,v)}}d.skins.push(q),"default"==q.name&&(d.defaultSkin=q)}var w=a.animations;for(var x in w)w.hasOwnProperty(x)&&this.readAnimation(x,w[x],d);return d},readAttachment:function(a,b,d){b=d.name||b;var e=c.AttachmentType[d.type||"region"];if(e==c.AttachmentType.region){var f=new c.RegionAttachment;return f.x=(d.x||0)*this.scale,f.y=(d.y||0)*this.scale,f.scaleX=d.scaleX||1,f.scaleY=d.scaleY||1,f.rotation=d.rotation||0,f.width=(d.width||32)*this.scale,f.height=(d.height||32)*this.scale,f.updateOffset(),f.rendererObject={},f.rendererObject.name=b,f.rendererObject.scale={},f.rendererObject.scale.x=f.scaleX,f.rendererObject.scale.y=f.scaleY,f.rendererObject.rotation=-f.rotation*Math.PI/180,f}throw"Unknown attachment type: "+e},readAnimation:function(a,b,d){var e,f,g,h,i,j,k,l=[],m=0,n=b.bones;for(var o in n)if(n.hasOwnProperty(o)){var p=d.findBoneIndex(o);if(-1==p)throw"Bone not found: "+o;var q=n[o];for(g in q)if(q.hasOwnProperty(g))if(i=q[g],"rotate"==g){for(f=new c.RotateTimeline(i.length),f.boneIndex=p,e=0,j=0,k=i.length;k>j;j++)h=i[j],f.setFrame(e,h.time,h.angle),c.SkeletonJson.readCurve(f,e,h),e++;l.push(f),m=Math.max(m,f.frames[2*f.getFrameCount()-2])}else{if("translate"!=g&&"scale"!=g)throw"Invalid timeline type for a bone: "+g+" ("+o+")";var r=1;for("scale"==g?f=new c.ScaleTimeline(i.length):(f=new c.TranslateTimeline(i.length),r=this.scale),f.boneIndex=p,e=0,j=0,k=i.length;k>j;j++){h=i[j];var s=(h.x||0)*r,t=(h.y||0)*r;f.setFrame(e,h.time,s,t),c.SkeletonJson.readCurve(f,e,h),e++}l.push(f),m=Math.max(m,f.frames[3*f.getFrameCount()-3])}}var u=b.slots;for(var v in u)if(u.hasOwnProperty(v)){var w=u[v],x=d.findSlotIndex(v);for(g in w)if(w.hasOwnProperty(g))if(i=w[g],"color"==g){for(f=new c.ColorTimeline(i.length),f.slotIndex=x,e=0,j=0,k=i.length;k>j;j++){h=i[j];var y=h.color,z=c.SkeletonJson.toColor(y,0),A=c.SkeletonJson.toColor(y,1),B=c.SkeletonJson.toColor(y,2),C=c.SkeletonJson.toColor(y,3);f.setFrame(e,h.time,z,A,B,C),c.SkeletonJson.readCurve(f,e,h),e++}l.push(f),m=Math.max(m,f.frames[5*f.getFrameCount()-5])}else{if("attachment"!=g)throw"Invalid timeline type for a slot: "+g+" ("+v+")";for(f=new c.AttachmentTimeline(i.length),f.slotIndex=x,e=0,j=0,k=i.length;k>j;j++)h=i[j],f.setFrame(e++,h.time,h.name);l.push(f),m=Math.max(m,f.frames[f.getFrameCount()-1])}}d.animations.push(new c.Animation(a,l,m))}},c.SkeletonJson.readCurve=function(a,b,c){var d=c.curve;d&&("stepped"==d?a.curves.setStepped(b):d instanceof Array&&a.curves.setCurve(b,d[0],d[1],d[2],d[3]))},c.SkeletonJson.toColor=function(a,b){if(8!=a.length)throw"Color hexidecimal length must be 8, recieved: "+a;return parseInt(a.substr(2*b,2),16)/255},c.Atlas=function(a,b){this.textureLoader=b,this.pages=[],this.regions=[];var d=new c.AtlasReader(a),e=[];e.length=4;for(var f=null;;){var g=d.readLine();if(null==g)break;if(g=d.trim(g),g.length)if(f){var h=new c.AtlasRegion;h.name=g,h.page=f,h.rotate="true"==d.readValue(),d.readTuple(e);var i=parseInt(e[0],10),j=parseInt(e[1],10);d.readTuple(e);var k=parseInt(e[0],10),l=parseInt(e[1],10);h.u=i/f.width,h.v=j/f.height,h.rotate?(h.u2=(i+l)/f.width,h.v2=(j+k)/f.height):(h.u2=(i+k)/f.width,h.v2=(j+l)/f.height),h.x=i,h.y=j,h.width=Math.abs(k),h.height=Math.abs(l),4==d.readTuple(e)&&(h.splits=[parseInt(e[0],10),parseInt(e[1],10),parseInt(e[2],10),parseInt(e[3],10)],4==d.readTuple(e)&&(h.pads=[parseInt(e[0],10),parseInt(e[1],10),parseInt(e[2],10),parseInt(e[3],10)],d.readTuple(e))),h.originalWidth=parseInt(e[0],10),h.originalHeight=parseInt(e[1],10),d.readTuple(e),h.offsetX=parseInt(e[0],10),h.offsetY=parseInt(e[1],10),h.index=parseInt(d.readValue(),10),this.regions.push(h)}else{f=new c.AtlasPage,f.name=g,f.format=c.Atlas.Format[d.readValue()],d.readTuple(e),f.minFilter=c.Atlas.TextureFilter[e[0]],f.magFilter=c.Atlas.TextureFilter[e[1]];var m=d.readValue();f.uWrap=c.Atlas.TextureWrap.clampToEdge,f.vWrap=c.Atlas.TextureWrap.clampToEdge,"x"==m?f.uWrap=c.Atlas.TextureWrap.repeat:"y"==m?f.vWrap=c.Atlas.TextureWrap.repeat:"xy"==m&&(f.uWrap=f.vWrap=c.Atlas.TextureWrap.repeat),b.load(f,g),this.pages.push(f)}else f=null}},c.Atlas.prototype={findRegion:function(a){for(var b=this.regions,c=0,d=b.length;d>c;c++)if(b[c].name==a)return b[c];return null},dispose:function(){for(var a=this.pages,b=0,c=a.length;c>b;b++)this.textureLoader.unload(a[b].rendererObject)},updateUVs:function(a){for(var b=this.regions,c=0,d=b.length;d>c;c++){var e=b[c];e.page==a&&(e.u=e.x/a.width,e.v=e.y/a.height,e.rotate?(e.u2=(e.x+e.height)/a.width,e.v2=(e.y+e.width)/a.height):(e.u2=(e.x+e.width)/a.width,e.v2=(e.y+e.height)/a.height))}}},c.Atlas.Format={alpha:0,intensity:1,luminanceAlpha:2,rgb565:3,rgba4444:4,rgb888:5,rgba8888:6},c.Atlas.TextureFilter={nearest:0,linear:1,mipMap:2,mipMapNearestNearest:3,mipMapLinearNearest:4,mipMapNearestLinear:5,mipMapLinearLinear:6},c.Atlas.TextureWrap={mirroredRepeat:0,clampToEdge:1,repeat:2},c.AtlasPage=function(){},c.AtlasPage.prototype={name:null,format:null,minFilter:null,magFilter:null,uWrap:null,vWrap:null,rendererObject:null,width:0,height:0},c.AtlasRegion=function(){},c.AtlasRegion.prototype={page:null,name:null,x:0,y:0,width:0,height:0,u:0,v:0,u2:0,v2:0,offsetX:0,offsetY:0,originalWidth:0,originalHeight:0,index:0,rotate:!1,splits:null,pads:null},c.AtlasReader=function(a){this.lines=a.split(/\r\n|\r|\n/)},c.AtlasReader.prototype={index:0,trim:function(a){return a.replace(/^\s+|\s+$/g,"")},readLine:function(){return this.index>=this.lines.length?null:this.lines[this.index++]},readValue:function(){var a=this.readLine(),b=a.indexOf(":");if(-1==b)throw"Invalid line: "+a;return this.trim(a.substring(b+1))},readTuple:function(a){var b=this.readLine(),c=b.indexOf(":");if(-1==c)throw"Invalid line: "+b;for(var d=0,e=c+1;3>d;d++){var f=b.indexOf(",",e);if(-1==f){if(!d)throw"Invalid line: "+b;break}a[d]=this.trim(b.substr(e,f-e)),e=f+1}return a[d]=this.trim(b.substring(e)),d+1}},c.AtlasAttachmentLoader=function(a){this.atlas=a},c.AtlasAttachmentLoader.prototype={newAttachment:function(a,b,d){switch(b){case c.AttachmentType.region:var e=this.atlas.findRegion(d);if(!e)throw"Region not found in atlas: "+d+" ("+b+")";var f=new c.RegionAttachment(d);return f.rendererObject=e,f.setUVs(e.u,e.v,e.u2,e.v2,e.rotate),f.regionOffsetX=e.offsetX,f.regionOffsetY=e.offsetY,f.regionWidth=e.width,f.regionHeight=e.height,f.regionOriginalWidth=e.originalWidth,f.regionOriginalHeight=e.originalHeight,f}throw"Unknown attachment type: "+b}},c.Bone.yDown=!0,b.AnimCache={},b.Spine=function(a){if(b.DisplayObjectContainer.call(this),this.spineData=b.AnimCache[a],!this.spineData)throw new Error("Spine data must be preloaded using PIXI.SpineLoader or PIXI.AssetLoader: "+a);this.skeleton=new c.Skeleton(this.spineData),this.skeleton.updateWorldTransform(),this.stateData=new c.AnimationStateData(this.spineData),this.state=new c.AnimationState(this.stateData),this.slotContainers=[];for(var d=0,e=this.skeleton.drawOrder.length;e>d;d++){var f=this.skeleton.drawOrder[d],g=f.attachment,h=new b.DisplayObjectContainer;if(this.slotContainers.push(h),this.addChild(h),g instanceof c.RegionAttachment){var i=g.rendererObject.name,j=this.createSprite(f,g.rendererObject);f.currentSprite=j,f.currentSpriteName=i,h.addChild(j)}}},b.Spine.prototype=Object.create(b.DisplayObjectContainer.prototype),b.Spine.prototype.constructor=b.Spine,b.Spine.prototype.updateTransform=function(){this.lastTime=this.lastTime||Date.now();var a=.001*(Date.now()-this.lastTime);this.lastTime=Date.now(),this.state.update(a),this.state.apply(this.skeleton),this.skeleton.updateWorldTransform();for(var d=this.skeleton.drawOrder,e=0,f=d.length;f>e;e++){var g=d[e],h=g.attachment,i=this.slotContainers[e];if(h instanceof c.RegionAttachment){if(h.rendererObject&&(!g.currentSpriteName||g.currentSpriteName!=h.name)){var j=h.rendererObject.name;if(void 0!==g.currentSprite&&(g.currentSprite.visible=!1),g.sprites=g.sprites||{},void 0!==g.sprites[j])g.sprites[j].visible=!0;else{var k=this.createSprite(g,h.rendererObject);i.addChild(k)}g.currentSprite=g.sprites[j],g.currentSpriteName=j}i.visible=!0;var l=g.bone;i.position.x=l.worldX+h.x*l.m00+h.y*l.m01,i.position.y=l.worldY+h.x*l.m10+h.y*l.m11,i.scale.x=l.worldScaleX,i.scale.y=l.worldScaleY,i.rotation=-(g.bone.worldRotation*Math.PI/180),i.alpha=g.a,g.currentSprite.tint=b.rgb2hex([g.r,g.g,g.b])}else i.visible=!1}b.DisplayObjectContainer.prototype.updateTransform.call(this)},b.Spine.prototype.createSprite=function(a,c){var d=b.TextureCache[c.name]?c.name:c.name+".png",e=new b.Sprite(b.Texture.fromFrame(d));return e.scale=c.scale,e.rotation=c.rotation,e.anchor.x=e.anchor.y=.5,a.sprites=a.sprites||{},a.sprites[c.name]=e,e},b.BaseTextureCache={},b.BaseTextureCacheIdGenerator=0,b.BaseTexture=function(a,c){if(this.resolution=1,this.width=100,this.height=100,this.scaleMode=c||b.scaleModes.DEFAULT,this.hasLoaded=!1,this.source=a,this._UID=b._UID++,this.premultipliedAlpha=!0,this._glTextures=[],this._dirty=[!0,!0,!0,!0],a){if((this.source.complete||this.source.getContext)&&this.source.width&&this.source.height)this.hasLoaded=!0,this.width=this.source.naturalWidth||this.source.width,this.height=this.source.naturalHeight||this.source.height,this.dirty();else{var d=this;this.source.onload=function(){d.hasLoaded=!0,d.width=d.source.naturalWidth||d.source.width,d.height=d.source.naturalHeight||d.source.height,d.dirty(),d.dispatchEvent({type:"loaded",content:d})},this.source.onerror=function(){d.dispatchEvent({type:"error",content:d})}}this.imageUrl=null,this._powerOf2=!1}},b.BaseTexture.prototype.constructor=b.BaseTexture,b.EventTarget.mixin(b.BaseTexture.prototype),b.BaseTexture.prototype.destroy=function(){this.imageUrl?(delete b.BaseTextureCache[this.imageUrl],delete b.TextureCache[this.imageUrl],this.imageUrl=null,navigator.isCocoonJS||(this.source.src="")):this.source&&this.source._pixiId&&delete b.BaseTextureCache[this.source._pixiId],this.source=null,this.unloadFromGPU()},b.BaseTexture.prototype.updateSourceImage=function(a){this.hasLoaded=!1,this.source.src=null,this.source.src=a},b.BaseTexture.prototype.dirty=function(){for(var a=0;a<this._glTextures.length;a++)this._dirty[a]=!0},b.BaseTexture.prototype.unloadFromGPU=function(){this.dirty();for(var a=this._glTextures.length-1;a>=0;a--){var c=this._glTextures[a],d=b.glContexts[a];d&&c&&d.deleteTexture(c)}this._glTextures.length=0,this.dirty()},b.BaseTexture.fromImage=function(a,c,d){var e=b.BaseTextureCache[a];if(void 0===c&&-1===a.indexOf("data:")&&(c=!0),!e){var f=new Image;c&&(f.crossOrigin=""),f.src=a,e=new b.BaseTexture(f,d),e.imageUrl=a,b.BaseTextureCache[a]=e,-1!==a.indexOf(b.RETINA_PREFIX+".")&&(e.resolution=2)}return e},b.BaseTexture.fromCanvas=function(a,c){a._pixiId||(a._pixiId="canvas_"+b.TextureCacheIdGenerator++);var d=b.BaseTextureCache[a._pixiId];return d||(d=new b.BaseTexture(a,c),b.BaseTextureCache[a._pixiId]=d),d},b.TextureCache={},b.FrameCache={},b.TextureCacheIdGenerator=0,b.Texture=function(a,c,d,e){this.noFrame=!1,c||(this.noFrame=!0,c=new b.Rectangle(0,0,1,1)),a instanceof b.Texture&&(a=a.baseTexture),this.baseTexture=a,this.frame=c,this.trim=e,this.valid=!1,this.requiresUpdate=!1,this._uvs=null,this.width=0,this.height=0,this.crop=d||new b.Rectangle(0,0,1,1),a.hasLoaded?(this.noFrame&&(c=new b.Rectangle(0,0,a.width,a.height)),this.setFrame(c)):a.addEventListener("loaded",this.onBaseTextureLoaded.bind(this))},b.Texture.prototype.constructor=b.Texture,b.EventTarget.mixin(b.Texture.prototype),b.Texture.prototype.onBaseTextureLoaded=function(){var a=this.baseTexture;a.removeEventListener("loaded",this.onLoaded),this.noFrame&&(this.frame=new b.Rectangle(0,0,a.width,a.height)),this.setFrame(this.frame),this.dispatchEvent({type:"update",content:this})},b.Texture.prototype.destroy=function(a){a&&this.baseTexture.destroy(),this.valid=!1},b.Texture.prototype.setFrame=function(a){if(this.noFrame=!1,this.frame=a,this.width=a.width,this.height=a.height,this.crop.x=a.x,this.crop.y=a.y,this.crop.width=a.width,this.crop.height=a.height,!this.trim&&(a.x+a.width>this.baseTexture.width||a.y+a.height>this.baseTexture.height))throw new Error("Texture Error: frame does not fit inside the base Texture dimensions "+this);this.valid=a&&a.width&&a.height&&this.baseTexture.source&&this.baseTexture.hasLoaded,this.trim&&(this.width=this.trim.width,this.height=this.trim.height,this.frame.width=this.trim.width,this.frame.height=this.trim.height),this.valid&&this._updateUvs()},b.Texture.prototype._updateUvs=function(){this._uvs||(this._uvs=new b.TextureUvs);var a=this.crop,c=this.baseTexture.width,d=this.baseTexture.height;this._uvs.x0=a.x/c,this._uvs.y0=a.y/d,this._uvs.x1=(a.x+a.width)/c,this._uvs.y1=a.y/d,this._uvs.x2=(a.x+a.width)/c,this._uvs.y2=(a.y+a.height)/d,this._uvs.x3=a.x/c,this._uvs.y3=(a.y+a.height)/d},b.Texture.fromImage=function(a,c,d){var e=b.TextureCache[a];return e||(e=new b.Texture(b.BaseTexture.fromImage(a,c,d)),b.TextureCache[a]=e),e},b.Texture.fromFrame=function(a){var c=b.TextureCache[a];if(!c)throw new Error('The frameId "'+a+'" does not exist in the texture cache ');return c},b.Texture.fromCanvas=function(a,c){var d=b.BaseTexture.fromCanvas(a,c);return new b.Texture(d)},b.Texture.addTextureToCache=function(a,c){b.TextureCache[c]=a},b.Texture.removeTextureFromCache=function(a){var c=b.TextureCache[a];return delete b.TextureCache[a],delete b.BaseTextureCache[a],c},b.TextureUvs=function(){this.x0=0,this.y0=0,this.x1=0,this.y1=0,this.x2=0,this.y2=0,this.x3=0,this.y3=0},b.Texture.emptyTexture=new b.Texture(new b.BaseTexture),b.RenderTexture=function(a,c,d,e,f){if(this.width=a||100,this.height=c||100,this.resolution=f||1,this.frame=new b.Rectangle(0,0,this.width*this.resolution,this.height*this.resolution),this.crop=new b.Rectangle(0,0,this.width*this.resolution,this.height*this.resolution),this.baseTexture=new b.BaseTexture,this.baseTexture.width=this.width*this.resolution,this.baseTexture.height=this.height*this.resolution,this.baseTexture._glTextures=[],this.baseTexture.resolution=this.resolution,this.baseTexture.scaleMode=e||b.scaleModes.DEFAULT,this.baseTexture.hasLoaded=!0,b.Texture.call(this,this.baseTexture,new b.Rectangle(0,0,this.width,this.height)),this.renderer=d||b.defaultRenderer,this.renderer.type===b.WEBGL_RENDERER){var g=this.renderer.gl;this.baseTexture._dirty[g.id]=!1,this.textureBuffer=new b.FilterTexture(g,this.width*this.resolution,this.height*this.resolution,this.baseTexture.scaleMode),this.baseTexture._glTextures[g.id]=this.textureBuffer.texture,this.render=this.renderWebGL,this.projection=new b.Point(.5*this.width,.5*-this.height)}else this.render=this.renderCanvas,this.textureBuffer=new b.CanvasBuffer(this.width*this.resolution,this.height*this.resolution),this.baseTexture.source=this.textureBuffer.canvas;this.valid=!0,this._updateUvs()},b.RenderTexture.prototype=Object.create(b.Texture.prototype),b.RenderTexture.prototype.constructor=b.RenderTexture,b.RenderTexture.prototype.resize=function(a,c,d){(a!==this.width||c!==this.height)&&(this.valid=a>0&&c>0,this.width=this.frame.width=this.crop.width=a,this.height=this.frame.height=this.crop.height=c,d&&(this.baseTexture.width=this.width,this.baseTexture.height=this.height),this.renderer.type===b.WEBGL_RENDERER&&(this.projection.x=this.width/2,this.projection.y=-this.height/2),this.valid&&this.textureBuffer.resize(this.width*this.resolution,this.height*this.resolution))},b.RenderTexture.prototype.clear=function(){this.valid&&(this.renderer.type===b.WEBGL_RENDERER&&this.renderer.gl.bindFramebuffer(this.renderer.gl.FRAMEBUFFER,this.textureBuffer.frameBuffer),this.textureBuffer.clear())},b.RenderTexture.prototype.renderWebGL=function(a,b,c){if(this.valid){var d=a.worldTransform;d.identity(),d.translate(0,2*this.projection.y),b&&d.append(b),d.scale(1,-1),a.worldAlpha=1;for(var e=a.children,f=0,g=e.length;g>f;f++)e[f].updateTransform();var h=this.renderer.gl;h.viewport(0,0,this.width*this.resolution,this.height*this.resolution),h.bindFramebuffer(h.FRAMEBUFFER,this.textureBuffer.frameBuffer),c&&this.textureBuffer.clear(),this.renderer.spriteBatch.dirty=!0,this.renderer.renderDisplayObject(a,this.projection,this.textureBuffer.frameBuffer),this.renderer.spriteBatch.dirty=!0}},b.RenderTexture.prototype.renderCanvas=function(a,b,c){if(this.valid){var d=a.worldTransform;d.identity(),b&&d.append(b),a.worldAlpha=1;for(var e=a.children,f=0,g=e.length;g>f;f++)e[f].updateTransform();c&&this.textureBuffer.clear();var h=this.textureBuffer.context,i=this.renderer.resolution;this.renderer.resolution=this.resolution,this.renderer.renderDisplayObject(a,h),this.renderer.resolution=i}},b.RenderTexture.prototype.getImage=function(){var a=new Image;return a.src=this.getBase64(),a},b.RenderTexture.prototype.getBase64=function(){return this.getCanvas().toDataURL()},b.RenderTexture.prototype.getCanvas=function(){if(this.renderer.type===b.WEBGL_RENDERER){var a=this.renderer.gl,c=this.textureBuffer.width,d=this.textureBuffer.height,e=new Uint8Array(4*c*d);a.bindFramebuffer(a.FRAMEBUFFER,this.textureBuffer.frameBuffer),a.readPixels(0,0,c,d,a.RGBA,a.UNSIGNED_BYTE,e),a.bindFramebuffer(a.FRAMEBUFFER,null);var f=new b.CanvasBuffer(c,d),g=f.context.getImageData(0,0,c,d);return g.data.set(e),f.context.putImageData(g,0,0),f.canvas}return this.textureBuffer.canvas},b.RenderTexture.tempMatrix=new b.Matrix,b.VideoTexture=function(a,c){if(!a)throw new Error("No video source element specified.");(a.readyState===a.HAVE_ENOUGH_DATA||a.readyState===a.HAVE_FUTURE_DATA)&&a.width&&a.height&&(a.complete=!0),b.BaseTexture.call(this,a,c),this.autoUpdate=!1,this.updateBound=this._onUpdate.bind(this),a.complete||(this._onCanPlay=this.onCanPlay.bind(this),a.addEventListener("canplay",this._onCanPlay),a.addEventListener("canplaythrough",this._onCanPlay),a.addEventListener("play",this.onPlayStart.bind(this)),a.addEventListener("pause",this.onPlayStop.bind(this)))
},b.VideoTexture.prototype=Object.create(b.BaseTexture.prototype),b.VideoTexture.constructor=b.VideoTexture,b.VideoTexture.prototype._onUpdate=function(){this.autoUpdate&&(window.requestAnimationFrame(this.updateBound),this.dirty())},b.VideoTexture.prototype.onPlayStart=function(){this.autoUpdate||(window.requestAnimationFrame(this.updateBound),this.autoUpdate=!0)},b.VideoTexture.prototype.onPlayStop=function(){this.autoUpdate=!1},b.VideoTexture.prototype.onCanPlay=function(){"canplaythrough"===event.type&&(this.hasLoaded=!0,this.source&&(this.source.removeEventListener("canplay",this._onCanPlay),this.source.removeEventListener("canplaythrough",this._onCanPlay),this.width=this.source.videoWidth,this.height=this.source.videoHeight,this.__loaded||(this.__loaded=!0,this.dispatchEvent({type:"loaded",content:this}))))},b.VideoTexture.baseTextureFromVideo=function(a,c){a._pixiId||(a._pixiId="video_"+b.TextureCacheIdGenerator++);var d=b.BaseTextureCache[a._pixiId];return d||(d=new b.VideoTexture(a,c),b.BaseTextureCache[a._pixiId]=d),d},b.VideoTexture.prototype.destroy=function(){this.source&&this.source._pixiId&&(b.BaseTextureCache[this.source._pixiId]=null,delete b.BaseTextureCache[this.source._pixiId],this.source._pixiId=null,delete this.source._pixiId),b.BaseTexture.prototype.destroy.call(this)},b.VideoTexture.textureFromVideo=function(a,c){var d=b.VideoTexture.baseTextureFromVideo(a,c);return new b.Texture(d)},b.VideoTexture.fromUrl=function(a,c){var d=document.createElement("video");return d.src=a,d.autoPlay=!0,d.play(),b.VideoTexture.textureFromVideo(d,c)},b.AssetLoader=function(a,c){this.assetURLs=a,this.crossorigin=c,this.loadersByType={jpg:b.ImageLoader,jpeg:b.ImageLoader,png:b.ImageLoader,gif:b.ImageLoader,webp:b.ImageLoader,json:b.JsonLoader,atlas:b.AtlasLoader,anim:b.SpineLoader,xml:b.BitmapFontLoader,fnt:b.BitmapFontLoader}},b.EventTarget.mixin(b.AssetLoader.prototype),b.AssetLoader.prototype.constructor=b.AssetLoader,b.AssetLoader.prototype._getDataType=function(a){var b="data:",c=a.slice(0,b.length).toLowerCase();if(c===b){var d=a.slice(b.length),e=d.indexOf(",");if(-1===e)return null;var f=d.slice(0,e).split(";")[0];return f&&"text/plain"!==f.toLowerCase()?f.split("/").pop().toLowerCase():"txt"}return null},b.AssetLoader.prototype.load=function(){function a(a){b.onAssetLoaded(a.data.content)}var b=this;this.loadCount=this.assetURLs.length;for(var c=0;c<this.assetURLs.length;c++){var d=this.assetURLs[c],e=this._getDataType(d);e||(e=d.split("?").shift().split(".").pop().toLowerCase());var f=this.loadersByType[e];if(!f)throw new Error(e+" is an unsupported file type");var g=new f(d,this.crossorigin);g.on("loaded",a),g.load()}},b.AssetLoader.prototype.onAssetLoaded=function(a){this.loadCount--,this.emit("onProgress",{content:this,loader:a}),this.onProgress&&this.onProgress(a),this.loadCount||(this.emit("onComplete",{content:this}),this.onComplete&&this.onComplete())},b.JsonLoader=function(a,b){this.url=a,this.crossorigin=b,this.baseUrl=a.replace(/[^\/]*$/,""),this.loaded=!1},b.JsonLoader.prototype.constructor=b.JsonLoader,b.EventTarget.mixin(b.JsonLoader.prototype),b.JsonLoader.prototype.load=function(){window.XDomainRequest&&this.crossorigin?(this.ajaxRequest=new window.XDomainRequest,this.ajaxRequest.timeout=3e3,this.ajaxRequest.onerror=this.onError.bind(this),this.ajaxRequest.ontimeout=this.onError.bind(this),this.ajaxRequest.onprogress=function(){}):this.ajaxRequest=window.XMLHttpRequest?new window.XMLHttpRequest:new window.ActiveXObject("Microsoft.XMLHTTP"),this.ajaxRequest.onload=this.onJSONLoaded.bind(this),this.ajaxRequest.open("GET",this.url,!0),this.ajaxRequest.send()},b.JsonLoader.prototype.onJSONLoaded=function(){if(!this.ajaxRequest.responseText)return this.onError(),void 0;if(this.json=JSON.parse(this.ajaxRequest.responseText),this.json.frames){var a=this.baseUrl+this.json.meta.image,d=new b.ImageLoader(a,this.crossorigin),e=this.json.frames;this.texture=d.texture.baseTexture,d.addEventListener("loaded",this.onLoaded.bind(this));for(var f in e){var g=e[f].frame;if(g){var h=new b.Rectangle(g.x,g.y,g.w,g.h),i=h.clone(),j=null;if(e[f].trimmed){var k=e[f].sourceSize,l=e[f].spriteSourceSize;j=new b.Rectangle(l.x,l.y,k.w,k.h)}b.TextureCache[f]=new b.Texture(this.texture,h,i,j)}}d.load()}else if(this.json.bones){var m=new c.SkeletonJson,n=m.readSkeletonData(this.json);b.AnimCache[this.url]=n,this.onLoaded()}else this.onLoaded()},b.JsonLoader.prototype.onLoaded=function(){this.loaded=!0,this.dispatchEvent({type:"loaded",content:this})},b.JsonLoader.prototype.onError=function(){this.dispatchEvent({type:"error",content:this})},b.AtlasLoader=function(a,b){this.url=a,this.baseUrl=a.replace(/[^\/]*$/,""),this.crossorigin=b,this.loaded=!1},b.AtlasLoader.constructor=b.AtlasLoader,b.EventTarget.mixin(b.AtlasLoader.prototype),b.AtlasLoader.prototype.load=function(){this.ajaxRequest=new b.AjaxRequest,this.ajaxRequest.onreadystatechange=this.onAtlasLoaded.bind(this),this.ajaxRequest.open("GET",this.url,!0),this.ajaxRequest.overrideMimeType&&this.ajaxRequest.overrideMimeType("application/json"),this.ajaxRequest.send(null)},b.AtlasLoader.prototype.onAtlasLoaded=function(){if(4===this.ajaxRequest.readyState)if(200===this.ajaxRequest.status||-1===window.location.href.indexOf("http")){this.atlas={meta:{image:[]},frames:[]};var a=this.ajaxRequest.responseText.split(/\r?\n/),c=-3,d=0,e=null,f=!1,g=0,h=0,i=this.onLoaded.bind(this);for(g=0;g<a.length;g++)if(a[g]=a[g].replace(/^\s+|\s+$/g,""),""===a[g]&&(f=g+1),a[g].length>0){if(f===g)this.atlas.meta.image.push(a[g]),d=this.atlas.meta.image.length-1,this.atlas.frames.push({}),c=-3;else if(c>0)if(c%7===1)null!=e&&(this.atlas.frames[d][e.name]=e),e={name:a[g],frame:{}};else{var j=a[g].split(" ");if(c%7===3)e.frame.x=Number(j[1].replace(",","")),e.frame.y=Number(j[2]);else if(c%7===4)e.frame.w=Number(j[1].replace(",","")),e.frame.h=Number(j[2]);else if(c%7===5){var k={x:0,y:0,w:Number(j[1].replace(",","")),h:Number(j[2])};k.w>e.frame.w||k.h>e.frame.h?(e.trimmed=!0,e.realSize=k):e.trimmed=!1}}c++}if(null!=e&&(this.atlas.frames[d][e.name]=e),this.atlas.meta.image.length>0){for(this.images=[],h=0;h<this.atlas.meta.image.length;h++){var l=this.baseUrl+this.atlas.meta.image[h],m=this.atlas.frames[h];this.images.push(new b.ImageLoader(l,this.crossorigin));for(g in m){var n=m[g].frame;n&&(b.TextureCache[g]=new b.Texture(this.images[h].texture.baseTexture,{x:n.x,y:n.y,width:n.w,height:n.h}),m[g].trimmed&&(b.TextureCache[g].realSize=m[g].realSize,b.TextureCache[g].trim.x=0,b.TextureCache[g].trim.y=0))}}for(this.currentImageId=0,h=0;h<this.images.length;h++)this.images[h].on("loaded",i);this.images[this.currentImageId].load()}else this.onLoaded()}else this.onError()},b.AtlasLoader.prototype.onLoaded=function(){this.images.length-1>this.currentImageId?(this.currentImageId++,this.images[this.currentImageId].load()):(this.loaded=!0,this.emit("loaded",{content:this}))},b.AtlasLoader.prototype.onError=function(){this.emit("error",{content:this})},b.SpriteSheetLoader=function(a,b){this.url=a,this.crossorigin=b,this.baseUrl=a.replace(/[^\/]*$/,""),this.texture=null,this.frames={}},b.SpriteSheetLoader.prototype.constructor=b.SpriteSheetLoader,b.EventTarget.mixin(b.SpriteSheetLoader.prototype),b.SpriteSheetLoader.prototype.load=function(){var a=this,c=new b.JsonLoader(this.url,this.crossorigin);c.on("loaded",function(b){a.json=b.data.content.json,a.onLoaded()}),c.load()},b.SpriteSheetLoader.prototype.onLoaded=function(){this.emit("loaded",{content:this})},b.ImageLoader=function(a,c){this.texture=b.Texture.fromImage(a,c),this.frames=[]},b.ImageLoader.prototype.constructor=b.ImageLoader,b.EventTarget.mixin(b.ImageLoader.prototype),b.ImageLoader.prototype.load=function(){this.texture.baseTexture.hasLoaded?this.onLoaded():this.texture.baseTexture.on("loaded",this.onLoaded.bind(this))},b.ImageLoader.prototype.onLoaded=function(){this.emit("loaded",{content:this})},b.ImageLoader.prototype.loadFramedSpriteSheet=function(a,c,d){this.frames=[];for(var e=Math.floor(this.texture.width/a),f=Math.floor(this.texture.height/c),g=0,h=0;f>h;h++)for(var i=0;e>i;i++,g++){var j=new b.Texture(this.texture.baseTexture,{x:i*a,y:h*c,width:a,height:c});this.frames.push(j),d&&(b.TextureCache[d+"-"+g]=j)}this.load()},b.BitmapFontLoader=function(a,b){this.url=a,this.crossorigin=b,this.baseUrl=a.replace(/[^\/]*$/,""),this.texture=null},b.BitmapFontLoader.prototype.constructor=b.BitmapFontLoader,b.EventTarget.mixin(b.BitmapFontLoader.prototype),b.BitmapFontLoader.prototype.load=function(){this.ajaxRequest=new b.AjaxRequest,this.ajaxRequest.onreadystatechange=this.onXMLLoaded.bind(this),this.ajaxRequest.open("GET",this.url,!0),this.ajaxRequest.overrideMimeType&&this.ajaxRequest.overrideMimeType("application/xml"),this.ajaxRequest.send(null)},b.BitmapFontLoader.prototype.onXMLLoaded=function(){if(4===this.ajaxRequest.readyState&&(200===this.ajaxRequest.status||-1===window.location.protocol.indexOf("http"))){var a=this.ajaxRequest.responseXML;if(!a||/MSIE 9/i.test(navigator.userAgent)||navigator.isCocoonJS)if("function"==typeof window.DOMParser){var c=new DOMParser;a=c.parseFromString(this.ajaxRequest.responseText,"text/xml")}else{var d=document.createElement("div");d.innerHTML=this.ajaxRequest.responseText,a=d}var e=this.baseUrl+a.getElementsByTagName("page")[0].getAttribute("file"),f=new b.ImageLoader(e,this.crossorigin);this.texture=f.texture.baseTexture;var g={},h=a.getElementsByTagName("info")[0],i=a.getElementsByTagName("common")[0];g.font=h.getAttribute("face"),g.size=parseInt(h.getAttribute("size"),10),g.lineHeight=parseInt(i.getAttribute("lineHeight"),10),g.chars={};for(var j=a.getElementsByTagName("char"),k=0;k<j.length;k++){var l=parseInt(j[k].getAttribute("id"),10),m=new b.Rectangle(parseInt(j[k].getAttribute("x"),10),parseInt(j[k].getAttribute("y"),10),parseInt(j[k].getAttribute("width"),10),parseInt(j[k].getAttribute("height"),10));g.chars[l]={xOffset:parseInt(j[k].getAttribute("xoffset"),10),yOffset:parseInt(j[k].getAttribute("yoffset"),10),xAdvance:parseInt(j[k].getAttribute("xadvance"),10),kerning:{},texture:b.TextureCache[l]=new b.Texture(this.texture,m)}}var n=a.getElementsByTagName("kerning");for(k=0;k<n.length;k++){var o=parseInt(n[k].getAttribute("first"),10),p=parseInt(n[k].getAttribute("second"),10),q=parseInt(n[k].getAttribute("amount"),10);g.chars[p].kerning[o]=q}b.BitmapText.fonts[g.font]=g,f.addEventListener("loaded",this.onLoaded.bind(this)),f.load()}},b.BitmapFontLoader.prototype.onLoaded=function(){this.emit("loaded",{content:this})},b.SpineLoader=function(a,b){this.url=a,this.crossorigin=b,this.loaded=!1},b.SpineLoader.prototype.constructor=b.SpineLoader,b.EventTarget.mixin(b.SpineLoader.prototype),b.SpineLoader.prototype.load=function(){var a=this,c=new b.JsonLoader(this.url,this.crossorigin);c.on("loaded",function(b){a.json=b.data.content.json,a.onLoaded()}),c.load()},b.SpineLoader.prototype.onLoaded=function(){this.loaded=!0,this.emit("loaded",{content:this})},b.AbstractFilter=function(a,b){this.passes=[this],this.shaders=[],this.dirty=!0,this.padding=0,this.uniforms=b||{},this.fragmentSrc=a||[]},b.AbstractFilter.prototype.constructor=b.AbstractFilter,b.AbstractFilter.prototype.syncUniforms=function(){for(var a=0,b=this.shaders.length;b>a;a++)this.shaders[a].dirty=!0},b.AlphaMaskFilter=function(a){b.AbstractFilter.call(this),this.passes=[this],a.baseTexture._powerOf2=!0,this.uniforms={mask:{type:"sampler2D",value:a},mapDimensions:{type:"2f",value:{x:1,y:5112}},dimensions:{type:"4fv",value:[0,0,0,0]}},a.baseTexture.hasLoaded?(this.uniforms.mask.value.x=a.width,this.uniforms.mask.value.y=a.height):(this.boundLoadedFunction=this.onTextureLoaded.bind(this),a.baseTexture.on("loaded",this.boundLoadedFunction)),this.fragmentSrc=["precision mediump float;","varying vec2 vTextureCoord;","varying vec4 vColor;","uniform sampler2D mask;","uniform sampler2D uSampler;","uniform vec2 offset;","uniform vec4 dimensions;","uniform vec2 mapDimensions;","void main(void) {","   vec2 mapCords = vTextureCoord.xy;","   mapCords += (dimensions.zw + offset)/ dimensions.xy ;","   mapCords.y *= -1.0;","   mapCords.y += 1.0;","   mapCords *= dimensions.xy / mapDimensions;","   vec4 original =  texture2D(uSampler, vTextureCoord);","   float maskAlpha =  texture2D(mask, mapCords).r;","   original *= maskAlpha;","   gl_FragColor =  original;","}"]},b.AlphaMaskFilter.prototype=Object.create(b.AbstractFilter.prototype),b.AlphaMaskFilter.prototype.constructor=b.AlphaMaskFilter,b.AlphaMaskFilter.prototype.onTextureLoaded=function(){this.uniforms.mapDimensions.value.x=this.uniforms.mask.value.width,this.uniforms.mapDimensions.value.y=this.uniforms.mask.value.height,this.uniforms.mask.value.baseTexture.off("loaded",this.boundLoadedFunction)},Object.defineProperty(b.AlphaMaskFilter.prototype,"map",{get:function(){return this.uniforms.mask.value},set:function(a){this.uniforms.mask.value=a}}),b.ColorMatrixFilter=function(){b.AbstractFilter.call(this),this.passes=[this],this.uniforms={matrix:{type:"mat4",value:[1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1]}},this.fragmentSrc=["precision mediump float;","varying vec2 vTextureCoord;","varying vec4 vColor;","uniform float invert;","uniform mat4 matrix;","uniform sampler2D uSampler;","void main(void) {","   gl_FragColor = texture2D(uSampler, vTextureCoord) * matrix;","}"]},b.ColorMatrixFilter.prototype=Object.create(b.AbstractFilter.prototype),b.ColorMatrixFilter.prototype.constructor=b.ColorMatrixFilter,Object.defineProperty(b.ColorMatrixFilter.prototype,"matrix",{get:function(){return this.uniforms.matrix.value},set:function(a){this.uniforms.matrix.value=a}}),b.GrayFilter=function(){b.AbstractFilter.call(this),this.passes=[this],this.uniforms={gray:{type:"1f",value:1}},this.fragmentSrc=["precision mediump float;","varying vec2 vTextureCoord;","varying vec4 vColor;","uniform sampler2D uSampler;","uniform float gray;","void main(void) {","   gl_FragColor = texture2D(uSampler, vTextureCoord);","   gl_FragColor.rgb = mix(gl_FragColor.rgb, vec3(0.2126*gl_FragColor.r + 0.7152*gl_FragColor.g + 0.0722*gl_FragColor.b), gray);","}"]},b.GrayFilter.prototype=Object.create(b.AbstractFilter.prototype),b.GrayFilter.prototype.constructor=b.GrayFilter,Object.defineProperty(b.GrayFilter.prototype,"gray",{get:function(){return this.uniforms.gray.value},set:function(a){this.uniforms.gray.value=a}}),b.DisplacementFilter=function(a){b.AbstractFilter.call(this),this.passes=[this],a.baseTexture._powerOf2=!0,this.uniforms={displacementMap:{type:"sampler2D",value:a},scale:{type:"2f",value:{x:30,y:30}},offset:{type:"2f",value:{x:0,y:0}},mapDimensions:{type:"2f",value:{x:1,y:5112}},dimensions:{type:"4fv",value:[0,0,0,0]}},a.baseTexture.hasLoaded?(this.uniforms.mapDimensions.value.x=a.width,this.uniforms.mapDimensions.value.y=a.height):(this.boundLoadedFunction=this.onTextureLoaded.bind(this),a.baseTexture.on("loaded",this.boundLoadedFunction)),this.fragmentSrc=["precision mediump float;","varying vec2 vTextureCoord;","varying vec4 vColor;","uniform sampler2D displacementMap;","uniform sampler2D uSampler;","uniform vec2 scale;","uniform vec2 offset;","uniform vec4 dimensions;","uniform vec2 mapDimensions;","void main(void) {","   vec2 mapCords = vTextureCoord.xy;","   mapCords += (dimensions.zw + offset)/ dimensions.xy ;","   mapCords.y *= -1.0;","   mapCords.y += 1.0;","   vec2 matSample = texture2D(displacementMap, mapCords).xy;","   matSample -= 0.5;","   matSample *= scale;","   matSample /= mapDimensions;","   gl_FragColor = texture2D(uSampler, vec2(vTextureCoord.x + matSample.x, vTextureCoord.y + matSample.y));","   gl_FragColor.rgb = mix( gl_FragColor.rgb, gl_FragColor.rgb, 1.0);","   vec2 cord = vTextureCoord;","}"]},b.DisplacementFilter.prototype=Object.create(b.AbstractFilter.prototype),b.DisplacementFilter.prototype.constructor=b.DisplacementFilter,b.DisplacementFilter.prototype.onTextureLoaded=function(){this.uniforms.mapDimensions.value.x=this.uniforms.displacementMap.value.width,this.uniforms.mapDimensions.value.y=this.uniforms.displacementMap.value.height,this.uniforms.displacementMap.value.baseTexture.off("loaded",this.boundLoadedFunction)},Object.defineProperty(b.DisplacementFilter.prototype,"map",{get:function(){return this.uniforms.displacementMap.value},set:function(a){this.uniforms.displacementMap.value=a}}),Object.defineProperty(b.DisplacementFilter.prototype,"scale",{get:function(){return this.uniforms.scale.value},set:function(a){this.uniforms.scale.value=a}}),Object.defineProperty(b.DisplacementFilter.prototype,"offset",{get:function(){return this.uniforms.offset.value},set:function(a){this.uniforms.offset.value=a}}),b.PixelateFilter=function(){b.AbstractFilter.call(this),this.passes=[this],this.uniforms={invert:{type:"1f",value:0},dimensions:{type:"4fv",value:new b.Float32Array([1e4,100,10,10])},pixelSize:{type:"2f",value:{x:10,y:10}}},this.fragmentSrc=["precision mediump float;","varying vec2 vTextureCoord;","varying vec4 vColor;","uniform vec2 testDim;","uniform vec4 dimensions;","uniform vec2 pixelSize;","uniform sampler2D uSampler;","void main(void) {","   vec2 coord = vTextureCoord;","   vec2 size = dimensions.xy/pixelSize;","   vec2 color = floor( ( vTextureCoord * size ) ) / size + pixelSize/dimensions.xy * 0.5;","   gl_FragColor = texture2D(uSampler, color);","}"]},b.PixelateFilter.prototype=Object.create(b.AbstractFilter.prototype),b.PixelateFilter.prototype.constructor=b.PixelateFilter,Object.defineProperty(b.PixelateFilter.prototype,"size",{get:function(){return this.uniforms.pixelSize.value},set:function(a){this.dirty=!0,this.uniforms.pixelSize.value=a}}),b.BlurXFilter=function(){b.AbstractFilter.call(this),this.passes=[this],this.uniforms={blur:{type:"1f",value:1/512}},this.fragmentSrc=["precision mediump float;","varying vec2 vTextureCoord;","varying vec4 vColor;","uniform float blur;","uniform sampler2D uSampler;","void main(void) {","   vec4 sum = vec4(0.0);","   sum += texture2D(uSampler, vec2(vTextureCoord.x - 4.0*blur, vTextureCoord.y)) * 0.05;","   sum += texture2D(uSampler, vec2(vTextureCoord.x - 3.0*blur, vTextureCoord.y)) * 0.09;","   sum += texture2D(uSampler, vec2(vTextureCoord.x - 2.0*blur, vTextureCoord.y)) * 0.12;","   sum += texture2D(uSampler, vec2(vTextureCoord.x - blur, vTextureCoord.y)) * 0.15;","   sum += texture2D(uSampler, vec2(vTextureCoord.x, vTextureCoord.y)) * 0.16;","   sum += texture2D(uSampler, vec2(vTextureCoord.x + blur, vTextureCoord.y)) * 0.15;","   sum += texture2D(uSampler, vec2(vTextureCoord.x + 2.0*blur, vTextureCoord.y)) * 0.12;","   sum += texture2D(uSampler, vec2(vTextureCoord.x + 3.0*blur, vTextureCoord.y)) * 0.09;","   sum += texture2D(uSampler, vec2(vTextureCoord.x + 4.0*blur, vTextureCoord.y)) * 0.05;","   gl_FragColor = sum;","}"]},b.BlurXFilter.prototype=Object.create(b.AbstractFilter.prototype),b.BlurXFilter.prototype.constructor=b.BlurXFilter,Object.defineProperty(b.BlurXFilter.prototype,"blur",{get:function(){return this.uniforms.blur.value/(1/7e3)},set:function(a){this.dirty=!0,this.uniforms.blur.value=1/7e3*a}}),b.BlurYFilter=function(){b.AbstractFilter.call(this),this.passes=[this],this.uniforms={blur:{type:"1f",value:1/512}},this.fragmentSrc=["precision mediump float;","varying vec2 vTextureCoord;","varying vec4 vColor;","uniform float blur;","uniform sampler2D uSampler;","void main(void) {","   vec4 sum = vec4(0.0);","   sum += texture2D(uSampler, vec2(vTextureCoord.x, vTextureCoord.y - 4.0*blur)) * 0.05;","   sum += texture2D(uSampler, vec2(vTextureCoord.x, vTextureCoord.y - 3.0*blur)) * 0.09;","   sum += texture2D(uSampler, vec2(vTextureCoord.x, vTextureCoord.y - 2.0*blur)) * 0.12;","   sum += texture2D(uSampler, vec2(vTextureCoord.x, vTextureCoord.y - blur)) * 0.15;","   sum += texture2D(uSampler, vec2(vTextureCoord.x, vTextureCoord.y)) * 0.16;","   sum += texture2D(uSampler, vec2(vTextureCoord.x, vTextureCoord.y + blur)) * 0.15;","   sum += texture2D(uSampler, vec2(vTextureCoord.x, vTextureCoord.y + 2.0*blur)) * 0.12;","   sum += texture2D(uSampler, vec2(vTextureCoord.x, vTextureCoord.y + 3.0*blur)) * 0.09;","   sum += texture2D(uSampler, vec2(vTextureCoord.x, vTextureCoord.y + 4.0*blur)) * 0.05;","   gl_FragColor = sum;","}"]},b.BlurYFilter.prototype=Object.create(b.AbstractFilter.prototype),b.BlurYFilter.prototype.constructor=b.BlurYFilter,Object.defineProperty(b.BlurYFilter.prototype,"blur",{get:function(){return this.uniforms.blur.value/(1/7e3)},set:function(a){this.uniforms.blur.value=1/7e3*a}}),b.BlurFilter=function(){this.blurXFilter=new b.BlurXFilter,this.blurYFilter=new b.BlurYFilter,this.passes=[this.blurXFilter,this.blurYFilter]},b.BlurFilter.prototype=Object.create(b.AbstractFilter.prototype),b.BlurFilter.prototype.constructor=b.BlurFilter,Object.defineProperty(b.BlurFilter.prototype,"blur",{get:function(){return this.blurXFilter.blur},set:function(a){this.blurXFilter.blur=this.blurYFilter.blur=a}}),Object.defineProperty(b.BlurFilter.prototype,"blurX",{get:function(){return this.blurXFilter.blur},set:function(a){this.blurXFilter.blur=a}}),Object.defineProperty(b.BlurFilter.prototype,"blurY",{get:function(){return this.blurYFilter.blur},set:function(a){this.blurYFilter.blur=a}}),b.InvertFilter=function(){b.AbstractFilter.call(this),this.passes=[this],this.uniforms={invert:{type:"1f",value:1}},this.fragmentSrc=["precision mediump float;","varying vec2 vTextureCoord;","varying vec4 vColor;","uniform float invert;","uniform sampler2D uSampler;","void main(void) {","   gl_FragColor = texture2D(uSampler, vTextureCoord);","   gl_FragColor.rgb = mix( (vec3(1)-gl_FragColor.rgb) * gl_FragColor.a, gl_FragColor.rgb, 1.0 - invert);","}"]},b.InvertFilter.prototype=Object.create(b.AbstractFilter.prototype),b.InvertFilter.prototype.constructor=b.InvertFilter,Object.defineProperty(b.InvertFilter.prototype,"invert",{get:function(){return this.uniforms.invert.value},set:function(a){this.uniforms.invert.value=a}}),b.SepiaFilter=function(){b.AbstractFilter.call(this),this.passes=[this],this.uniforms={sepia:{type:"1f",value:1}},this.fragmentSrc=["precision mediump float;","varying vec2 vTextureCoord;","varying vec4 vColor;","uniform float sepia;","uniform sampler2D uSampler;","const mat3 sepiaMatrix = mat3(0.3588, 0.7044, 0.1368, 0.2990, 0.5870, 0.1140, 0.2392, 0.4696, 0.0912);","void main(void) {","   gl_FragColor = texture2D(uSampler, vTextureCoord);","   gl_FragColor.rgb = mix( gl_FragColor.rgb, gl_FragColor.rgb * sepiaMatrix, sepia);","}"]},b.SepiaFilter.prototype=Object.create(b.AbstractFilter.prototype),b.SepiaFilter.prototype.constructor=b.SepiaFilter,Object.defineProperty(b.SepiaFilter.prototype,"sepia",{get:function(){return this.uniforms.sepia.value},set:function(a){this.uniforms.sepia.value=a}}),b.TwistFilter=function(){b.AbstractFilter.call(this),this.passes=[this],this.uniforms={radius:{type:"1f",value:.5},angle:{type:"1f",value:5},offset:{type:"2f",value:{x:.5,y:.5}}},this.fragmentSrc=["precision mediump float;","varying vec2 vTextureCoord;","varying vec4 vColor;","uniform vec4 dimensions;","uniform sampler2D uSampler;","uniform float radius;","uniform float angle;","uniform vec2 offset;","void main(void) {","   vec2 coord = vTextureCoord - offset;","   float distance = length(coord);","   if (distance < radius) {","       float ratio = (radius - distance) / radius;","       float angleMod = ratio * ratio * angle;","       float s = sin(angleMod);","       float c = cos(angleMod);","       coord = vec2(coord.x * c - coord.y * s, coord.x * s + coord.y * c);","   }","   gl_FragColor = texture2D(uSampler, coord+offset);","}"]},b.TwistFilter.prototype=Object.create(b.AbstractFilter.prototype),b.TwistFilter.prototype.constructor=b.TwistFilter,Object.defineProperty(b.TwistFilter.prototype,"offset",{get:function(){return this.uniforms.offset.value},set:function(a){this.dirty=!0,this.uniforms.offset.value=a}}),Object.defineProperty(b.TwistFilter.prototype,"radius",{get:function(){return this.uniforms.radius.value},set:function(a){this.dirty=!0,this.uniforms.radius.value=a}}),Object.defineProperty(b.TwistFilter.prototype,"angle",{get:function(){return this.uniforms.angle.value},set:function(a){this.dirty=!0,this.uniforms.angle.value=a}}),b.ColorStepFilter=function(){b.AbstractFilter.call(this),this.passes=[this],this.uniforms={step:{type:"1f",value:5}},this.fragmentSrc=["precision mediump float;","varying vec2 vTextureCoord;","varying vec4 vColor;","uniform sampler2D uSampler;","uniform float step;","void main(void) {","   vec4 color = texture2D(uSampler, vTextureCoord);","   color = floor(color * step) / step;","   gl_FragColor = color;","}"]},b.ColorStepFilter.prototype=Object.create(b.AbstractFilter.prototype),b.ColorStepFilter.prototype.constructor=b.ColorStepFilter,Object.defineProperty(b.ColorStepFilter.prototype,"step",{get:function(){return this.uniforms.step.value},set:function(a){this.uniforms.step.value=a}}),b.DotScreenFilter=function(){b.AbstractFilter.call(this),this.passes=[this],this.uniforms={scale:{type:"1f",value:1},angle:{type:"1f",value:5},dimensions:{type:"4fv",value:[0,0,0,0]}},this.fragmentSrc=["precision mediump float;","varying vec2 vTextureCoord;","varying vec4 vColor;","uniform vec4 dimensions;","uniform sampler2D uSampler;","uniform float angle;","uniform float scale;","float pattern() {","   float s = sin(angle), c = cos(angle);","   vec2 tex = vTextureCoord * dimensions.xy;","   vec2 point = vec2(","       c * tex.x - s * tex.y,","       s * tex.x + c * tex.y","   ) * scale;","   return (sin(point.x) * sin(point.y)) * 4.0;","}","void main() {","   vec4 color = texture2D(uSampler, vTextureCoord);","   float average = (color.r + color.g + color.b) / 3.0;","   gl_FragColor = vec4(vec3(average * 10.0 - 5.0 + pattern()), color.a);","}"]},b.DotScreenFilter.prototype=Object.create(b.AbstractFilter.prototype),b.DotScreenFilter.prototype.constructor=b.DotScreenFilter,Object.defineProperty(b.DotScreenFilter.prototype,"scale",{get:function(){return this.uniforms.scale.value},set:function(a){this.dirty=!0,this.uniforms.scale.value=a}}),Object.defineProperty(b.DotScreenFilter.prototype,"angle",{get:function(){return this.uniforms.angle.value},set:function(a){this.dirty=!0,this.uniforms.angle.value=a}}),b.CrossHatchFilter=function(){b.AbstractFilter.call(this),this.passes=[this],this.uniforms={blur:{type:"1f",value:1/512}},this.fragmentSrc=["precision mediump float;","varying vec2 vTextureCoord;","varying vec4 vColor;","uniform float blur;","uniform sampler2D uSampler;","void main(void) {","    float lum = length(texture2D(uSampler, vTextureCoord.xy).rgb);","    gl_FragColor = vec4(1.0, 1.0, 1.0, 1.0);","    if (lum < 1.00) {","        if (mod(gl_FragCoord.x + gl_FragCoord.y, 10.0) == 0.0) {","            gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0);","        }","    }","    if (lum < 0.75) {","        if (mod(gl_FragCoord.x - gl_FragCoord.y, 10.0) == 0.0) {","            gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0);","        }","    }","    if (lum < 0.50) {","        if (mod(gl_FragCoord.x + gl_FragCoord.y - 5.0, 10.0) == 0.0) {","            gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0);","        }","    }","    if (lum < 0.3) {","        if (mod(gl_FragCoord.x - gl_FragCoord.y - 5.0, 10.0) == 0.0) {","            gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0);","        }","    }","}"]},b.CrossHatchFilter.prototype=Object.create(b.AbstractFilter.prototype),b.CrossHatchFilter.prototype.constructor=b.CrossHatchFilter,Object.defineProperty(b.CrossHatchFilter.prototype,"blur",{get:function(){return this.uniforms.blur.value/(1/7e3)},set:function(a){this.uniforms.blur.value=1/7e3*a}}),b.RGBSplitFilter=function(){b.AbstractFilter.call(this),this.passes=[this],this.uniforms={red:{type:"2f",value:{x:20,y:20}},green:{type:"2f",value:{x:-20,y:20}},blue:{type:"2f",value:{x:20,y:-20}},dimensions:{type:"4fv",value:[0,0,0,0]}},this.fragmentSrc=["precision mediump float;","varying vec2 vTextureCoord;","varying vec4 vColor;","uniform vec2 red;","uniform vec2 green;","uniform vec2 blue;","uniform vec4 dimensions;","uniform sampler2D uSampler;","void main(void) {","   gl_FragColor.r = texture2D(uSampler, vTextureCoord + red/dimensions.xy).r;","   gl_FragColor.g = texture2D(uSampler, vTextureCoord + green/dimensions.xy).g;","   gl_FragColor.b = texture2D(uSampler, vTextureCoord + blue/dimensions.xy).b;","   gl_FragColor.a = texture2D(uSampler, vTextureCoord).a;","}"]},b.RGBSplitFilter.prototype=Object.create(b.AbstractFilter.prototype),b.RGBSplitFilter.prototype.constructor=b.RGBSplitFilter,Object.defineProperty(b.RGBSplitFilter.prototype,"red",{get:function(){return this.uniforms.red.value},set:function(a){this.uniforms.red.value=a}}),Object.defineProperty(b.RGBSplitFilter.prototype,"green",{get:function(){return this.uniforms.green.value},set:function(a){this.uniforms.green.value=a}}),Object.defineProperty(b.RGBSplitFilter.prototype,"blue",{get:function(){return this.uniforms.blue.value},set:function(a){this.uniforms.blue.value=a}}),window.PIXI = b}).call(this);
/**
 *  Main entry point for Rice engine
 *  @copyright (C) 2014 1HandGaming
 *  @author Hernan Zhou
 */
(function () {
    'use strict';
    var bento = {
        require: window.require,
        define: window.define
    };
    window.bento = window.bento || bento;
}());
/**
 *  @copyright (C) 1HandGaming
 */
bento.define('bento/director', [
    'bento/sugar',
    'bento',
    'bento/screen'
], function (Sugar, Bento, Screen) {
    'use strict';
    var screens = {},
        currentScreen = null,
        getScreen = function (name) {
            return screens[name];
        },
        module = {
            addScreen: function (screen) {
                if (!screen.getName()) {
                    throw 'Add name property to screen';
                }
                screens[screen.getName()] = screen;
            },
            showScreen: function (name, callback) {
                if (currentScreen !== null) {
                    this.hideScreen();
                }
                currentScreen = screens[name];
                if (currentScreen) {
                    currentScreen.onShow();
                } else {
                    throw 'Could not find screen';
                }
            },
            hideScreen: function () {
                if (!currentScreen) {
                    return;
                }
                currentScreen.onHide();
                currentScreen = null;
            },
            getCurrentScreen: function () {
                return currentScreen;
            }
        };

    return module;
});
/*
 * A base object to hold components
 * @copyright (C) 1HandGaming
 */
bento.define('bento/entity', [
    'bento/sugar',
    'bento/math/vector2',
    'bento/math/rectangle'
], function (Sugar, Vector2, Rectangle) {
    'use strict';
    var globalId = 0;
    return function (settings) {
        var i,
            name,
            visible = true,
            position = Vector2(0, 0),
            origin = Vector2(0, 0),
            dimension = Rectangle(0, 0, 0, 0),
            rectangle,
            components = [],
            family = [],
            removedComponents = [],
            parent = null,
            uniqueId = ++globalId,
            cleanComponents = function () {
                var i, component;
                while (removedComponents.length) {
                    component = removedComponents.pop();
                    // should destroy be called?
                    /*if (component.destroy) {
                        component.destroy();
                    }*/
                    Sugar.removeObject(components, component);
                }
            },
            entity = {
                z: 0,
                timer: 0,
                global: false,
                updateWhenPaused: false,
                name: '',
                destroy: function (data) {
                    var i,
                        l,
                        component;
                    // update components
                    for (i = 0, l = components.length; i < l; ++i) {
                        component = components[i];
                        if (component && component.destroy) {
                            component.destroy(data);
                        }
                    }
                },
                update: function (data) {
                    var i,
                        l,
                        component;
                    // update components
                    for (i = 0, l = components.length; i < l; ++i) {
                        component = components[i];
                        if (component && component.update) {
                            component.update(data);
                        }
                    }
                    ++entity.timer;

                    // clean up
                    cleanComponents();
                },
                draw: function (data) {
                    var i,
                        l,
                        component;
                    if (!visible) {
                        return;
                    }
                    // call components
                    for (i = 0, l = components.length; i < l; ++i) {
                        component = components[i];
                        if (component && component.draw) {
                            component.draw(data);
                        }
                    }
                    // post draw
                    for (i = components.length - 1; i >= 0; i--) {
                        component = components[i];
                        if (component && component.postDraw) {
                            component.postDraw(data);
                        }
                    }
                },
                addToFamily: function (name) {
                    family.push(name);
                },
                getFamily: function () {
                    return family;
                },
                add: function (object) {
                    return Sugar.combine(entity, object);
                },
                getPosition: function () {
                    return position;
                },
                setPosition: function (value) {
                    position.x = value.x;
                    position.y = value.y;
                },
                getDimension: function () {
                    return dimension;
                },
                setDimension: function (value) {
                    if (Sugar.isDimension(value)) {
                        dimension = value;
                    }
                },
                getBoundingBox: function () {
                    var scale, x1, x2, y1, y2, box;
                    if (!rectangle) {
                        scale = entity.scale ? entity.scale.getScale() : Vector2(1, 1);
                        x1 = position.x - origin.x * scale.x;
                        y1 = position.y - origin.y * scale.y;
                        x2 = position.x + (dimension.width - origin.x) * scale.x;
                        y2 = position.y + (dimension.height - origin.y) * scale.y;
                        // swap variables if scale is negative
                        if (scale.x < 0) {
                            x2 = [x1, x1 = x2][0];
                        }
                        if (scale.y < 0) {
                            y2 = [y1, y1 = y2][0];
                        }
                        return Rectangle(x1, y1, x2 - x1, y2 - y1);
                    } else {
                        box = rectangle.clone();
                        scale = entity.scale ? entity.scale.getScale() : Vector2(1, 1);
                        box.x *= Math.abs(scale.x);
                        box.y *= Math.abs(scale.y);
                        box.width *= Math.abs(scale.x);
                        box.height *= Math.abs(scale.y);
                        box.x += position.x;
                        box.y += position.y;
                        return box;
                    }
                },
                setBoundingBox: function (value) {
                    rectangle = value;
                },
                getRectangle: function () {
                    return rectangle;
                },
                setOrigin: function (value) {
                    origin.x = value.x;
                    origin.y = value.y;
                },
                setOriginRelative: function (value) {
                    origin.x = value.x * dimension.width;
                    origin.y = value.y * dimension.height;
                },
                getOrigin: function () {
                    return origin;
                },
                isVisible: function () {
                    return visible;
                },
                setVisible: function (value) {
                    visible = value;
                },
                attach: function (component, name) {
                    var mixin = {};
                    components.push(component);
                    if (component.setParent) {
                        component.setParent(entity);
                    }
                    if (component.init) {
                        component.init();
                    }
                    if (name) {
                        mixin[name] = component;
                        Sugar.combine(entity, mixin);
                    }
                    return entity;
                },
                remove: function (component) {
                    var i, type, index;
                    if (!component) {
                        return;
                    }
                    index = components.indexOf(component);
                    if (index >= 0) {
                        components[index] = null;
                    }
                    return entity;
                },
                getComponents: function () {
                    return components;
                },
                getComponentByName: function (name) {
                    var i, l, component;
                    for (i = 0, i = components.length; i < l; ++i) {
                        component = components[i];
                        if (component.name === name) {
                            return component;
                        }
                    }
                },
                setParent: function (obj) {
                    parent = obj;
                },
                getParent: function () {
                    return parent;
                },
                getId: function () {
                    return uniqueId;
                },
                collidesWith: function (other, offset) {
                    if (!Sugar.isDefined(offset)) {
                        offset = Vector2(0, 0);
                    }
                    return entity.getBoundingBox().offset(offset).intersect(other.getBoundingBox());
                },
                collidesWithGroup: function (array, offset) {
                    var i,
                        obj,
                        box;
                    if (!Sugar.isDefined(offset)) {
                        offset = Vector2(0, 0);
                    }
                    if (!Sugar.isArray(array)) {
                        // throw 'Collision check must be with an Array of object';
                        console.log('Collision check must be with an Array of object');
                        return;
                    }
                    if (!array.length) {
                        return null;
                    }
                    box = entity.getBoundingBox().offset(offset);
                    for (i = 0; i < array.length; ++i) {
                        obj = array[i];
                        if (obj === entity) {
                            continue;
                        }
                        if (obj.getBoundingBox && box.intersect(obj.getBoundingBox())) {
                            return obj;
                        }
                    }
                    return null;
                }
            };

        // read settings
        if (settings) {
            if (settings.components) {
                if (!Sugar.isArray(settings.components)) {
                    settings.components = [settings.components];
                }
                for (i = 0; i < settings.components.length; ++i) {
                    settings.components[i](entity, settings);
                }
            }
            if (settings.position) {
                entity.setPosition(settings.position);
            }
            if (settings.origin) {
                entity.setOrigin(settings.origin);
            }
            if (settings.originRelative) {
                entity.setOriginRelative(settings.originRelative);
            }
            if (settings.name) {
                entity.setName(settings.name);
            }
            if (settings.family) {
                if (!Sugar.isArray(settings.family)) {
                    settings.family = [settings.family];
                }
                for (i = 0; i < settings.family.length; ++i) {
                    entity.addToFamily(settings.family[i]);
                }
            }
            if (settings.init) {
                settings.init.apply(entity);
            }

            entity.updateWhenPaused = settings.updateWhenPaused || false;
            entity.global = settings.global || false;
        }
        return entity;
    };
});
bento.define('bento/eventsystem', [
    'bento/sugar'
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
/**
 *  Rice game instance, controls managers and game loop
 *  @copyright (C) 2014 1HandGaming
 *  @author Hernan Zhou
 */
bento.define('bento', [
    'bento/sugar',
    'bento/lib/domready',
    'bento/lib/requestanimationframe',
    'bento/managers/asset',
    'bento/managers/input',
    'bento/managers/object',
    'bento/math/vector2',
    'bento/math/rectangle',
    'bento/renderer'
], function (
    Sugar,
    DomReady,
    RequestAnimationFrame,
    AssetManager,
    InputManager,
    ObjectManager,
    Vector2,
    Rectangle,
    Renderer
) {
    'use strict';
    var lastTime = new Date().getTime(),
        cumulativeTime = 1000 / 60,
        canvas,
        context,
        renderer,
        styleScaling = true,
        canvasRatio = 0,
        windowRatio,
        canvasScale = {
            x: 1,
            y: 1
        },
        debug = {
            debugBar: null,
            fps: 0,
            fpsAccumulator: 0,
            fpsTicks: 0,
            fpsMaxAverage: 600,
            avg: 0,
            lastTime: 0
        },
        gameData = {},
        viewport = Rectangle(0, 0, 640, 480),
        setupDebug = function () {
            debug.debugBar = document.createElement('div');
            debug.debugBar.style['font-family'] = 'Arial';
            debug.debugBar.style.padding = '8px';
            debug.debugBar.style.position = 'absolute';
            debug.debugBar.style.right = '0px';
            debug.debugBar.style.top = '0px';
            debug.debugBar.innerHTML = 'fps: 0';
            document.body.appendChild(debug.debugBar);
        },
        setupCanvas = function (settings, callback) {
            canvas = document.getElementById(settings.canvasId);

            if (canvas) {
                canvas.width = viewport.width;
                canvas.height = viewport.height;
                canvasRatio = viewport.height / viewport.width;

                // setup canvas 2d
                if (!settings.renderer || settings.renderer === 'canvas2d') {
                    context = canvas.getContext('2d');
                    if (!settings.smoothing) {
                        if (context.imageSmoothingEnabled) {
                            context.imageSmoothingEnabled = false;
                        }
                        if (context.webkitImageSmoothingEnabled) {
                            context.webkitImageSmoothingEnabled = false;
                        }
                        if (context.mozImageSmoothingEnabled) {
                            context.mozImageSmoothingEnabled = false;
                        }
                    }
                    Renderer('canvas2d', canvas, context, function (renderer) {
                        gameData = {
                            canvas: canvas,
                            renderer: renderer,
                            canvasScale: canvasScale,
                            viewport: viewport
                        };
                        callback();
                    });
                } else if (settings.renderer === 'pixi') {
                    Renderer('pixi', canvas, context, function (renderer) {
                        gameData = {
                            canvas: canvas,
                            renderer: renderer,
                            canvasScale: canvasScale,
                            viewport: viewport
                        };
                        callback();
                    });
                }
            } else {
                // no canvas, create it?
                throw 'No canvas found';
            }
        },
        onResize = function () {
            var width,
                height,
                innerWidth = window.innerWidth,
                innerHeight = window.innerHeight;

            windowRatio = innerHeight / innerWidth;
            // resize to fill screen
            if (windowRatio < canvasRatio) {
                width = innerHeight / canvasRatio;
                height = innerHeight;
            } else {
                width = innerWidth;
                height = innerWidth * canvasRatio;
            }
            if (styleScaling) {
                canvas.style.width = width + 'px';
                canvas.style.height = height + 'px';
            } else {
                canvas.width = width;
                canvas.height = height;
            }
            canvasScale.x = width / viewport.width;
            canvasScale.y = height / viewport.height;
        },
        game = {
            setup: function (settings, callback) {
                DomReady(function () {
                    var runGame = function () {
                        ObjectManager.run();
                        if (callback) {
                            callback();
                        }
                    };
                    if (settings.debug) {
                        setupDebug();
                    }
                    if (settings.canvasDimension) {
                        if (settings.canvasDimension.isRectangle) {
                            viewport = settings.canvasDimension || viewport;
                        } else {
                            throw 'settings.canvasDimension must be a rectangle';
                        }
                    }
                    setupCanvas(settings, function () {
                        // window resize listeners
                        window.addEventListener('resize', onResize, false);
                        window.addEventListener('orientationchange', onResize, false);
                        onResize();

                        InputManager.init(gameData);
                        ObjectManager.init(gameData, debug);
                        if (settings.assetGroups) {
                            AssetManager.loadAssetGroups(settings.assetGroups, runGame);
                        } else {
                            runGame();
                        }

                    });
                });
            },
            getViewport: function () {
                return viewport;
            },
            Assets: AssetManager,
            Objects: ObjectManager
        };

    // mix functions
    Sugar.combine(game, ObjectManager);
    return game;
});
bento.define('bento/renderer', [
    'bento/sugar'
], function (Sugar, Canvas2D) {
    return function (type, canvas, context, callback) {
        var module = {
            save: function () {},
            restore: function () {},
            translate: function () {},
            scale: function (x, y) {},
            rotate: function (angle) {},
            fillRect: function (color, x, y, w, h) {},
            drawImage: function (texture, sx, sy, sw, sh, x, y, w, h) {},
            flush: function () {}
        };
        require(['bento/renderers/' + type], function (renderer) {
            Sugar.combine(module, renderer(canvas, context));
            callback(module);
        });
    };
});
/**
 *  @copyright (C) 1HandGaming
 */
bento.define('bento/screen', [
    'bento/sugar',
    'bento',
    'bento/math/rectangle'
], function (Sugar, Bento, Rectangle) {
    'use strict';
    return function (name) {
        var viewport = Bento.getViewport(),
            dimension = Rectangle(0, 0, 0, 0),
            isShown = false,
            module = {
                setDimension: function (rectangle) {
                    dimension.width = rectangle.width;
                    dimension.height = rectangle.height;
                },
                getDimension: function () {
                    return dimension;
                },
                add: function (object) {
                    return Sugar.combine(this, object);
                },
                /**
                 * Get the name of the screen
                 * @name getName
                 * @memberOf screen
                 * @function
                 * @return Screen name as string
                 */
                getName: function () {
                    return name;
                },
                /**
                 * Set a boolean that defines if the screen is shown
                 * @name setShown
                 * @memberOf screen
                 * @function
                 */
                setShown: function (bool) {
                    if (!Sugar.isBoolean(bool)) {
                        throw 'Argument is not a boolean';
                    } else {
                        isShown = bool;
                    }
                },
                onShow: function () {},
                onHide: function () {
                    // remove all objects
                    Bento.removeAll();
                    // reset viewport scroll when hiding screen
                    viewport.x = 0;
                    viewport.y = 0;

                }
            };

        return module;
    };
});
bento.define('bento/subimage', [
    'bento/math/rectangle'
], function (Rectangle) {
    return function (image, frame) {
        var rectangle = Rectangle(frame.x, frame.y, frame.w, frame.h);
        rectangle.image = image;
        return rectangle;
    };
});
bento.define('bento/sugar', [], function () {
    'use strict';
    var isString = function (value) {
            return typeof value === 'string' || value instanceof String;
        },
        isArray = Array.prototype.isArray || function (value) {
            return Object.prototype.toString.call(value) === '[object Array]';
        },
        isObject = function (value) {
            return Object.prototype.toString.call(value) === '[object Object]';
        },
        isFunction = function (value) {
            return Object.prototype.toString.call(value) === '[object Function]';
        },
        isNumber = function (obj) {
            return Object.prototype.toString.call(obj) === '[object Number]';
        },
        isBoolean = function (obj) {
            return obj === true || obj === false ||
                Object.prototype.toString.call(obj) === '[object Boolean]';
        },
        isInt = function (obj) {
            return parseFloat(obj) === parseInt(obj, 10) && !isNaN(obj);
        },
        isUndefined = function (obj) {
            return obj === void(0);
        },
        isDefined = function (obj) {
            return obj !== void(0);
        },
        removeObject = function (array, obj) {
            var i,
                l;
            for (i = 0, l = array.length; i < l; i += 1) {
                if (array[i] === obj) {
                    array.splice(i, 1);
                    break;
                }
            }
        },
        combine = function (obj1, obj2) {                        
            var prop, temp;
            for (prop in obj2) {
                if (obj2.hasOwnProperty(prop)) {
                    if (obj1.hasOwnProperty(prop)) {
                        // property already exists, move it up
                        obj1.base = obj1.base || {};
                        temp = {};
                        temp[prop] = obj1[prop];
                        combine(obj1.base, temp);
                    } 
                    if (isObject(obj2[prop])) {
                        obj1[prop] = combine({}, obj2[prop]);
                    } else {
                        obj1[prop] = obj2[prop];
                    }
                }
            }
            return obj1;
        },
        getKeyLength = function (obj) {
            return Object.keys(obj).length;
        },
        setAnimationFrameTimeout = function (callback, timeout) {
            var now = new Date().getTime(),
                rafID = null;
            
            if (timeout === undefined) timeout = 1;
            
            function animationFrame() {
                var later = new Date().getTime();
                
                if (later - now >= timeout) {
                    callback();
                } else {
                    rafID = requestAnimationFrame(animationFrame);
                }
            }

            animationFrame();
            return {
                /**
                 * On supported browsers cancel this timeout.
                 */
                cancel: function() {
                    if (typeof cancelAnimationFrame !== 'undefined') {
                        cancelAnimationFrame(rafID);
                    }
                }
            };
        },
        stableSort = (function () {
            // https://github.com/Two-Screen/stable
            // A stable array sort, because `Array#sort()` is not guaranteed stable.
            // This is an implementation of merge sort, without recursion.
            var stable = function (arr, comp) {
                    return exec(arr.slice(), comp);
                },
                // Execute the sort using the input array and a second buffer as work space.
                // Returns one of those two, containing the final result.
                exec = function (arr, comp) {
                    if (typeof (comp) !== 'function') {
                        comp = function (a, b) {
                            return String(a).localeCompare(b);
                        };
                    }

                    // Short-circuit when there's nothing to sort.
                    var len = arr.length;
                    if (len <= 1) {
                        return arr;
                    }

                    // Rather than dividing input, simply iterate chunks of 1, 2, 4, 8, etc.
                    // Chunks are the size of the left or right hand in merge sort.
                    // Stop when the left-hand covers all of the array.
                    var buffer = new Array(len);
                    for (var chk = 1; chk < len; chk *= 2) {
                        pass(arr, comp, chk, buffer);

                        var tmp = arr;
                        arr = buffer;
                        buffer = tmp;
                    }
                    return arr;
                },
                // Run a single pass with the given chunk size.
                pass = function (arr, comp, chk, result) {
                    var len = arr.length;
                    var i = 0;
                    // Step size / double chunk size.
                    var dbl = chk * 2;
                    // Bounds of the left and right chunks.
                    var l, r, e;
                    // Iterators over the left and right chunk.
                    var li, ri;

                    // Iterate over pairs of chunks.
                    for (l = 0; l < len; l += dbl) {
                        r = l + chk;
                        e = r + chk;
                        if (r > len) r = len;
                        if (e > len) e = len;

                        // Iterate both chunks in parallel.
                        li = l;
                        ri = r;
                        while (true) {
                            // Compare the chunks.
                            if (li < r && ri < e) {
                                // This works for a regular `sort()` compatible comparator,
                                // but also for a simple comparator like: `a > b`
                                if (comp(arr[li], arr[ri]) <= 0) {
                                    result[i++] = arr[li++];
                                } else {
                                    result[i++] = arr[ri++];
                                }
                            }
                            // Nothing to compare, just flush what's left.
                            else if (li < r) {
                                result[i++] = arr[li++];
                            } else if (ri < e) {
                                result[i++] = arr[ri++];
                            }
                            // Both iterators are at the chunk ends.
                            else {
                                break;
                            }
                        }
                    }
                };
            stable.inplace = function (arr, comp) {
                var result = exec(arr, comp);

                // This simply copies back if the result isn't in the original array,
                // which happens on an odd number of passes.
                if (result !== arr) {
                    pass(result, null, arr.length, arr);
                }

                return arr;
            };
            // return it instead and keep the method local to this scope
            return stable;
        })();


    return {
        isString: isString,
        isArray: isArray,
        isObject: isObject,
        isFunction: isFunction,
        isNumber: isNumber,
        isBoolean: isBoolean,
        isInt: isInt,
        isUndefined: isUndefined,
        isDefined: isDefined,
        removeObject: removeObject,
        combine: combine,
        getKeyLength: getKeyLength,
        stableSort: stableSort
    };

});
bento.define('bento/components/clickable', [
    'bento/sugar',
    'bento/math/vector2',
    'bento/eventsystem'
], function (Sugar, Vector2, EventSystem) {
    'use strict';
    return function (base, settings) {
        var mixin = {},
            component = {
                name: 'clickable',
                pointerDown: function (evt) {},
                pointerUp: function (evt) {},
                pointerMove: function (evt) {}
            };

        if (settings && settings[component.name]) {
            settings = settings[component.name];
            if (settings.pointerDown) {
                component.pointerDown = settings.pointerDown;
            }
            if (settings.pointerUp) {
                component.pointerUp = settings.pointerUp;
            }
            if (settings.pointerMove) {
                component.pointerMove = settings.pointerMove;
            }

        }
        EventSystem.addEventListener('pointerDown', component.pointerDown);
        EventSystem.addEventListener('pointerUp', component.pointerUp);
        EventSystem.addEventListener('pointerMove', component.pointerMove);

        base.attach(component);
        mixin[component.name] = component;
        Sugar.combine(base, mixin);
        return base;
    };
});
bento.define('bento/components/fill', [
    'bento/sugar',
    'bento'
], function (Sugar, Bento) {
    'use strict';
    return function (base, settings) {
        var viewport = Bento.getViewport(),
            mixin = {},
            component = {
                name: 'fill',
                draw: function (data) {
                    data.renderer.fillRect('#000', 0, 0, viewport.width, viewport.height);
                }
            };
        base.attach(component);
        mixin[component.name] = component;
        Sugar.combine(base, mixin);
        return base;
    };
});
bento.define('bento/components/pixisprite', [
    'bento/sugar',
], function (Sugar) {
    'use strict';
    return function (base, settings) {
        var image,
            animationSettings,
            animations = {},
            currentAnimation = {
                frames: [0]
            },
            currentFrame = 0,
            frameCountX = 1,
            frameCountY = 1,
            frameWidth = 0,
            frameHeight = 0,
            onCompleteCallback,
            origin = base.getOrigin(),
            mixin = {},
            component = {
                name: 'sprite',
                setup: function (settings) {
                    if (settings) {
                        animationSettings = settings;
                    } else {
                        // create default animation
                        animationSettings = {
                            frameCountX: 1,
                            frameCountY: 1
                        };
                    }
                    // add default animation
                    if (!animationSettings.animations) {
                        animationSettings.animations = {};
                    }
                    if (!animationSettings.animations['default']) {
                        animationSettings.animations['default'] = {
                            frames: [0]
                        };
                    }
                    image = settings.image;
                    // use frameWidth if specified (overrides frameCountX and frameCountY)
                    if (animationSettings.frameWidth && animationSettings.frameHeight) {
                        frameWidth = animationSettings.frameWidth;
                        frameHeight = animationSettings.frameHeight;
                        frameCountX = Math.floor(image.width / frameWidth);
                        frameCountY = Math.floor(image.height / frameHeight);
                    } else {
                        frameCountX = animationSettings.frameCountX || 1;
                        frameCountY = animationSettings.frameCountY || 1;
                        frameWidth = image.width / frameCountX;
                        frameHeight = image.height / frameCountY;
                    }
                    // set dimension of base object
                    base.getDimension().width = frameWidth;
                    base.getDimension().height = frameHeight;
                    // set to default
                    animations = animationSettings.animations;
                    currentAnimation = animations['default'];

                    // pixi
                    if (!image.pixiBaseTexture) {
                        image.pixiBaseTexture = new PIXI.BaseTexture(image);
                    }
                    base.pixiTexture = new PIXI.Texture(image.pixiBaseTexture);
                    if (!base.pixiSprite) {
                        base.pixiSprite = new PIXI.Sprite(base.pixiTexture);
                    }
                    base.pixiSprite.setTexture(base.pixiTexture);

                },
                setAnimation: function (name, callback, keepCurrentFrame) {
                    var anim = animations[name];
                    if (!anim) {
                        console.log('Warning: animation ' + name + ' does not exist.');
                        return;
                    }
                    if (anim && currentAnimation !== anim) {
                        if (!Sugar.isDefined(anim.loop)) {
                            anim.loop = true;
                        }
                        if (!Sugar.isDefined(anim.backTo)) {
                            anim.backTo = 0;
                        }
                        // set even if there is no callback
                        onCompleteCallback = callback;
                        currentAnimation = anim;
                        currentAnimation.name = name;
                        if (!keepCurrentFrame) {
                            currentFrame = 0;
                        }
                    }
                },
                getAnimation: function () {
                    return currentAnimation ? currentAnimation.name : null;
                },
                setFrame: function (frameNumber) {
                    currentFrame = frameNumber;
                },
                getCurrentFrame: function () {
                    return currentFrame;
                },
                getFrameWidth: function () {
                    return frameWidth;
                },
                update: function () {
                    var reachedEnd;
                    if (!currentAnimation) {
                        return;
                    }
                    reachedEnd = false;
                    currentFrame += currentAnimation.speed || 1;
                    if (currentAnimation.loop) {
                        while (currentFrame >= currentAnimation.frames.length) {
                            currentFrame -= currentAnimation.frames.length - currentAnimation.backTo;
                            reachedEnd = true;
                        }
                    } else {
                        if (currentFrame >= currentAnimation.frames.length) {
                            reachedEnd = true;
                        }
                    }
                    if (reachedEnd && onCompleteCallback) {
                        onCompleteCallback();
                    }
                },
                draw: function (data) {
                    var cf = Math.min(Math.floor(currentFrame), currentAnimation.frames.length - 1),
                        sx = (currentAnimation.frames[cf] % frameCountX) * frameWidth,
                        sy = Math.floor(currentAnimation.frames[cf] / frameCountX) * frameHeight;

                    data.renderer.translate(Math.round(-origin.x), Math.round(-origin.y));
                    data.renderer.drawImage(
                        image,
                        sx,
                        sy,
                        frameWidth,
                        frameHeight,
                        0,
                        0,
                        frameWidth,
                        frameHeight
                    );
                }
            };

        // call setup 
        if (settings && settings[component.name]) {
            component.setup(settings[component.name]);
        }

        base.attach(component);
        mixin[component.name] = component;
        Sugar.combine(base, mixin);
        return base;
    };
});
bento.define('bento/components/rotation', [
    'bento/sugar',
], function (Sugar) {
    'use strict';
    return function (base) {
        var angle,
            mixin = {},
            component = {
                name: 'rotation',
                draw: function (data) {
                    if (angle) {
                        data.renderer.rotate(angle);
                    }
                },
                postDraw: function (data) {
                },
                addAngleDegree: function (value) {
                    if (!angle) {
                        angle = 0;
                    }
                    angle += value * Math.PI / 180;
                },
                addAngleRadian: function (value) {
                    if (!angle) {
                        angle = 0;
                    }
                    angle += value;
                },
                setAngleDegree: function (value) {
                    angle = value * Math.PI / 180;
                },
                setAngleRadian: function (value) {
                    angle = value;
                },
                getAngleDegree: function () {
                    if (!angle) {
                        return 0;
                    }
                    return angle * 180 / Math.PI;
                },
                getAngleRadian: function () {
                    if (!angle) {
                        return 0;
                    }
                    return angle;
                }
            };
        base.attach(component);
        mixin[component.name] = component;
        Sugar.combine(base, mixin);
        return base;
    };
});
bento.define('bento/components/scale', [
    'bento/sugar',
    'bento/math/vector2'
], function (Sugar, Vector2) {
    'use strict';
    return function (base) {
        var set = false,
            scale = Vector2(1, 1),
            mixin = {},
            component = {
                name: 'scale',
                draw: function (data) {
                    if (set) {
                        data.renderer.scale(scale.x, scale.y);
                    }
                },
                setScale: function (vector) {
                    set = true;
                    scale = vector;
                },
                getScale: function () {
                    return scale;
                },
                setScaleX: function (value) {
                    set = true;
                    scale.x = value;
                },
                setScaleY: function (value) {
                    set = true;
                    scale.y = value;
                }
            };
        base.attach(component);
        mixin[component.name] = component;
        Sugar.combine(base, mixin);
        return base;
    };
});
bento.define('bento/components/sprite', [
    'bento/sugar',
], function (Sugar) {
    'use strict';
    return function (base, settings) {
        var image,
            animationSettings,
            animations = {},
            currentAnimation = {
                frames: [0]
            },
            mixin = {},
            currentFrame = 0,
            frameCountX = 1,
            frameCountY = 1,
            frameWidth = 0,
            frameHeight = 0,
            onCompleteCallback,
            origin = base.getOrigin(),
            component = {
                name: 'sprite',
                setup: function (settings) {
                    if (settings) {
                        animationSettings = settings;
                    } else {
                        // create default animation
                        animationSettings = {
                            frameCountX: 1,
                            frameCountY: 1
                        };
                    }
                    // add default animation
                    if (!animationSettings.animations) {
                        animationSettings.animations = {};
                    }
                    if (!animationSettings.animations['default']) {
                        animationSettings.animations['default'] = {
                            frames: [0]
                        };
                    }
                    image = settings.image;
                    // use frameWidth if specified (overrides frameCountX and frameCountY)
                    if (animationSettings.frameWidth && animationSettings.frameHeight) {
                        frameWidth = animationSettings.frameWidth;
                        frameHeight = animationSettings.frameHeight;
                        frameCountX = Math.floor(image.width / frameWidth);
                        frameCountY = Math.floor(image.height / frameHeight);
                    } else {
                        frameCountX = animationSettings.frameCountX || 1;
                        frameCountY = animationSettings.frameCountY || 1;
                        frameWidth = image.width / frameCountX;
                        frameHeight = image.height / frameCountY;
                    }
                    // set dimension of base object
                    base.getDimension().width = frameWidth;
                    base.getDimension().height = frameHeight;
                    // set to default
                    animations = animationSettings.animations;
                    currentAnimation = animations['default'];
                },
                setAnimation: function (name, callback, keepCurrentFrame) {
                    var anim = animations[name];
                    if (!anim) {
                        console.log('Warning: animation ' + name + ' does not exist.');
                        return;
                    }
                    if (anim && currentAnimation !== anim) {
                        if (!Sugar.isDefined(anim.loop)) {
                            anim.loop = true;
                        }
                        if (!Sugar.isDefined(anim.backTo)) {
                            anim.backTo = 0;
                        }
                        // set even if there is no callback
                        onCompleteCallback = callback;
                        currentAnimation = anim;
                        currentAnimation.name = name;
                        if (!keepCurrentFrame) {
                            currentFrame = 0;
                        }
                    }
                },
                getAnimation: function () {
                    return currentAnimation ? currentAnimation.name : null;
                },
                setFrame: function (frameNumber) {
                    currentFrame = frameNumber;
                },
                getCurrentFrame: function () {
                    return currentFrame;
                },
                getFrameWidth: function () {
                    return frameWidth;
                },
                update: function () {
                    var reachedEnd;
                    if (!currentAnimation) {
                        return;
                    }
                    reachedEnd = false;
                    currentFrame += currentAnimation.speed || 1;
                    if (currentAnimation.loop) {
                        while (currentFrame >= currentAnimation.frames.length) {
                            currentFrame -= currentAnimation.frames.length - currentAnimation.backTo;
                            reachedEnd = true;
                        }
                    } else {
                        if (currentFrame >= currentAnimation.frames.length) {
                            reachedEnd = true;
                        }
                    }
                    if (reachedEnd && onCompleteCallback) {
                        onCompleteCallback();
                    }
                },
                draw: function (data) {
                    var cf = Math.min(Math.floor(currentFrame), currentAnimation.frames.length - 1),
                        sx = (currentAnimation.frames[cf] % frameCountX) * frameWidth,
                        sy = Math.floor(currentAnimation.frames[cf] / frameCountX) * frameHeight;

                    data.renderer.translate(Math.round(-origin.x), Math.round(-origin.y));
                    data.renderer.drawImage(
                        image,
                        sx,
                        sy,
                        frameWidth,
                        frameHeight,
                        0,
                        0,
                        frameWidth,
                        frameHeight
                    );
                }
            };

        // call setup 
        if (settings && settings[component.name]) {
            component.setup(settings[component.name]);
        }

        base.attach(component);
        mixin[component.name] = component;
        Sugar.combine(base, mixin);
        return base;
    };
});
bento.define('bento/components/translation', [
    'bento/sugar',
    'bento/math/vector2'
], function (Sugar, Vector2) {
    'use strict';
    return function (base) {
        var set = false,
            mixin = {},
            component = {
                name: 'translation',
                draw: function (data) {
                    var parent = base.getParent(),
                        position = base.getPosition(),
                        scroll = data.viewport;
                    data.renderer.save(base);
                    data.renderer.translate(Math.round(position.x), Math.round(position.y));

                    // scroll (only applies to parent objects)
                    if (parent === null) {
                        data.renderer.translate(Math.round(-scroll.x), Math.round(-scroll.y));
                    }
                },
                postDraw: function (data) {
                    data.renderer.restore();
                }
            };
        base.attach(component);
        mixin[component.name] = component;
        Sugar.combine(base, mixin);
        return base;
    };
});
/**
 * @license RequireJS domReady 2.0.1 Copyright (c) 2010-2012, The Dojo Foundation All Rights Reserved.
 * Available via the MIT or new BSD license.
 * see: http://github.com/requirejs/domReady for details
 */
/*jslint*/
/*global require: false, define: false, requirejs: false,
  window: false, clearInterval: false, document: false,
  self: false, setInterval: false */


bento.define('bento/lib/domready', [], function () {
    'use strict';

    var isTop, testDiv, scrollIntervalId,
        isBrowser = typeof window !== "undefined" && window.document,
        isPageLoaded = !isBrowser,
        doc = isBrowser ? document : null,
        readyCalls = [];

    function runCallbacks(callbacks) {
        var i;
        for (i = 0; i < callbacks.length; i += 1) {
            callbacks[i](doc);
        }
    }

    function callReady() {
        var callbacks = readyCalls;

        if (isPageLoaded) {
            //Call the DOM ready callbacks
            if (callbacks.length) {
                readyCalls = [];
                runCallbacks(callbacks);
            }
        }
    }

    /**
     * Sets the page as loaded.
     */
    function pageLoaded() {
        if (!isPageLoaded) {
            isPageLoaded = true;
            if (scrollIntervalId) {
                clearInterval(scrollIntervalId);
            }

            callReady();
        }
    }

    if (isBrowser) {
        if (document.addEventListener) {
            //Standards. Hooray! Assumption here that if standards based,
            //it knows about DOMContentLoaded.
            document.addEventListener("DOMContentLoaded", pageLoaded, false);
            window.addEventListener("load", pageLoaded, false);
        } else if (window.attachEvent) {
            window.attachEvent("onload", pageLoaded);

            testDiv = document.createElement('div');
            try {
                isTop = window.frameElement === null;
            } catch (e) {}

            //DOMContentLoaded approximation that uses a doScroll, as found by
            //Diego Perini: http://javascript.nwbox.com/IEContentLoaded/,
            //but modified by other contributors, including jdalton
            if (testDiv.doScroll && isTop && window.external) {
                scrollIntervalId = setInterval(function () {
                    try {
                        testDiv.doScroll();
                        pageLoaded();
                    } catch (e) {}
                }, 30);
            }
        }

        //Check if document already complete, and if so, just trigger page load
        //listeners. Latest webkit browsers also use "interactive", and
        //will fire the onDOMContentLoaded before "interactive" but not after
        //entering "interactive" or "complete". More details:
        //http://dev.w3.org/html5/spec/the-end.html#the-end
        //http://stackoverflow.com/questions/3665561/document-readystate-of-interactive-vs-ondomcontentloaded
        //Hmm, this is more complicated on further use, see "firing too early"
        //bug: https://github.com/requirejs/domReady/issues/1
        //so removing the || document.readyState === "interactive" test.
        //There is still a window.onload binding that should get fired if
        //DOMContentLoaded is missed.
        if (document.readyState === "complete") {
            pageLoaded();
        }
    }

    /** START OF PUBLIC API **/

    /**
     * Registers a callback for DOM ready. If DOM is already ready, the
     * callback is called immediately.
     * @param {Function} callback
     */
    function domReady(callback) {
        if (isPageLoaded) {
            callback(doc);
        } else {
            readyCalls.push(callback);
        }
        return domReady;
    }

    domReady.version = '2.0.1';

    /**
     * Loader Plugin API method
     */
    domReady.load = function (name, req, onLoad, config) {
        if (config.isBuild) {
            onLoad(null);
        } else {
            domReady(onLoad);
        }
    };

    /** END OF PUBLIC API **/

    return domReady;
});

/**
 * http://www.makeitgo.ws/articles/animationframe/
 */
bento.define('bento/lib/requestanimationframe', [], function () {
    'use strict';
    // http://paulirish.com/2011/requestanimationframe-for-smart-animating/
    // http://my.opera.com/emoller/blog/2011/12/20/requestanimationframe-for-smart-er-animating

    // requestAnimationFrame polyfill by Erik Möller. fixes from Paul Irish and Tino Zijdel

    // MIT license

    (function () {
        var lastTime = 0;
        var vendors = ['ms', 'moz', 'webkit', 'o'];
        for (var x = 0; x < vendors.length && !window.requestAnimationFrame; ++x) {
            window.requestAnimationFrame = window[vendors[x] + 'RequestAnimationFrame'];
            window.cancelAnimationFrame = window[vendors[x] + 'CancelAnimationFrame'] || window[vendors[x] + 'CancelRequestAnimationFrame'];
        }

        if (!window.requestAnimationFrame)
            window.requestAnimationFrame = function (callback, element) {
                var currTime = new Date().getTime();
                var timeToCall = Math.max(0, 16 - (currTime - lastTime));
                var id = window.setTimeout(function () {
                        callback(currTime + timeToCall);
                    },
                    timeToCall);
                lastTime = currTime + timeToCall;
                return id;
            };

        if (!window.cancelAnimationFrame)
            window.cancelAnimationFrame = function (id) {
                clearTimeout(id);
            };
    }());
    return window.requestAnimationFrame;
});
/**
 *  Manager that controls all assets
 *  @copyright (C) 2014 1HandGaming
 *  @author Hernan Zhou
 */
bento.define('bento/managers/asset', [
    'bento/sugar'
], function (Sugar) {
    'use strict';
    var assetGroups = {},
        assets = {
            audio: {},
            json: {},
            images: {}
        },
        loadJSON = function (name, source, callback) {
            var xhr = new XMLHttpRequest();
            if (xhr.overrideMimeType) {
                xhr.overrideMimeType('application/json');
            }
            xhr.open('GET', source, true);
            xhr.onerror = function () {
                callback('Error ' + source);
            };
            xhr.ontimeout = function () {
                callback('Timeout' + source);
            };
            xhr.onreadystatechange = function () {
                if (xhr.readyState === 4) {
                    if ((xhr.status === 200) || ((xhr.status === 0) && xhr.responseText)) {
                        callback(null, name, JSON.parse(xhr.responseText));
                    } else {
                        callback('Error: State ' + xhr.readyState + ' ' + source);
                    }
                }
            };
            xhr.send(null);
        },
        loadImage = function (name, source, callback) {
            // TODO: Implement failure
            var img = new Image();
            img.src = source;
            img.addEventListener('load', function () {
                callback(null, name, img);
            }, false);
        },
        /**
         * Loads json files containing asset paths
         * @param {Object} jsonFiles: name with json path
         * @param {Function} onReady: callback when ready
         * @param {Function} onLoaded: callback when json file is loaded
         */
        loadAssetGroups = function (jsonFiles, onReady, onLoaded) {
            var jsonName,
                keyCount = Sugar.getKeyLength(jsonFiles),
                loaded = 0,
                callback = function (err, name, json) {
                    if (err) {
                        console.log(err);
                        return;
                    }
                    assetGroups[name] = json;
                    loaded += 1;
                    if (Sugar.isDefined(onLoaded)) {
                        onLoaded(loaded, keyCount);
                    }
                    if (keyCount === loaded && Sugar.isDefined(onReady)) {
                        onReady(null);
                    }
                };
            for (jsonName in jsonFiles) {
                if (jsonFiles.hasOwnProperty(jsonName)) {
                    loadJSON(jsonName, jsonFiles[jsonName], callback);
                }
            }
        },
        /**
         * Loads assets from group
         * @param {String} groupName: name of asset group
         * @param {Function} onReady: callback when ready
         * @param {Function} onLoaded: callback when asset file is loaded
         */
        load = function (groupName, onReady, onLoaded) {
            var group = assetGroups[groupName],
                asset,
                assetsLoaded = 0,
                path = '',
                assetCount = 0,
                checkLoaded = function () {
                    if (assetsLoaded === assetCount && Sugar.isDefined(onReady)) {
                        onReady(null);
                    }
                },
                onLoadImage = function (err, name, image) {
                    if (err) {
                        console.log(err);
                        return;
                    }
                    assets.images[name] = image;
                    assetsLoaded += 1;
                    if (Sugar.isDefined(onLoaded)) {
                        onLoaded(assetsLoaded, assetCount);
                    }
                    checkLoaded();
                };

            if (!Sugar.isDefined(group)) {
                onReady('Could not find asset group ' + groupName);
                return;
            }
            // set path
            if (Sugar.isDefined(group.path)) {
                path += group.path;
            }
            // load images
            if (Sugar.isDefined(group.images)) {
                assetCount += Sugar.getKeyLength(group.images);
                for (asset in group.images) {
                    if (!group.images.hasOwnProperty(asset)) {
                        continue;
                    }
                    loadImage(asset, path + group.images[asset], onLoadImage);
                }
            }
            // load audio
            if (Sugar.isDefined(group.audio)) {
                assetCount += Sugar.getKeyLength(group.audio);
            }
            // load json
            if (Sugar.isDefined(group.json)) {
                assetCount += Sugar.getKeyLength(group.json);
            }

        },
        unload = function () {},
        getImage = function (name) {
            var asset = assets.images[name];
            if (!Sugar.isDefined(asset)) {
                throw ('Asset ' + name + ' could not be found');
            }
            return asset;
        },
        getSubImage = function (name) {

        };
    return {
        loadAssetGroups: loadAssetGroups,
        load: load,
        unload: unload,
        getImage: getImage,
        getSubImage: getSubImage
    };
});
/**
 *  Manager that controls all events and input
 *  @copyright (C) 2014 1HandGaming
 *  @author Hernan Zhou
 */
bento.define('bento/managers/input', [
    'bento/sugar',
    'bento/math/vector2',
    'bento/eventsystem'
], function (Sugar, Vector2, EventSystem) {
    'use strict';
    var isPaused = false,
        canvas,
        canvasScale,
        viewport,
        pointers = [],
        offsetLeft = 0,
        offsetTop = 0,
        pointerDown = function (evt) {
            EventSystem.fire('pointerDown', evt);
        },
        pointerMove = function (evt) {
            EventSystem.fire('pointerMove', evt);
        },
        pointerUp = function (evt) {
            EventSystem.fire('pointerUp', evt);
        },
        touchStart = function (evt) {
            var id, i;
            console.log('touchstart');
            evt.preventDefault();
            for (i = 0; i < evt.changedTouches.length; i += 1) {
                addTouchPosition(evt, i);
            }
            pointerDown(evt);
        },
        touchMove = function (evt) {
            var id, i;
            evt.preventDefault();
            for (i = 0; i < evt.changedTouches.length; i += 1) {
                addTouchPosition(evt, i);
            }
            pointerMove(evt);
        },
        touchEnd = function (evt) {
            var id, i;
            evt.preventDefault();
            for (i = 0; i < evt.changedTouches.length; i += 1) {
                addTouchPosition(evt, i);
            }
            pointerUp(evt);
        },
        mouseDown = function (evt) {
            console.log('mousedown');
            evt.preventDefault();
            addMousePosition(evt);
            pointerDown(evt);
        },
        mouseMove = function (evt) {
            evt.preventDefault();
            addMousePosition(evt);
            pointerMove(evt);
        },
        mouseUp = function (evt) {
            evt.preventDefault();
            addMousePosition(evt);
            pointerUp(evt);
        },
        addTouchPosition = function (evt, n) {
            var touch = evt.changedTouches[n],
                x = (touch.pageX - offsetLeft) / canvasScale.x,
                y = (touch.pageY - offsetTop) / canvasScale.y;
            evt.preventDefault();
            evt.eventType = 'touch';
            evt.changedTouches[n].position = Vector2(x, y);
            evt.changedTouches[n].worldPosition = evt.changedTouches[n].position.clone();
            evt.changedTouches[n].worldPosition.x += viewport.x;
            evt.changedTouches[n].worldPosition.y += viewport.y;
            // add 'normal' position
            evt.position = evt.changedTouches[n].position.clone();
            evt.worldPosition = evt.changedTouches[n].position.clone();
        },
        addMousePosition = function (evt) {
            var x = (evt.clientX - offsetLeft) / canvasScale.x,
                y = (evt.clientY - offsetTop) / canvasScale.y;
            evt.eventType = 'mouse';
            evt.position = Vector2(x, y);
            evt.worldPosition = evt.position.clone();
            evt.worldPosition.x += viewport.x;
            evt.worldPosition.y += viewport.y;
        };

    return {
        init: function (settings) {
            // canvasScale is needed to take css scaling into account
            canvasScale = settings.canvasScale;
            canvas = settings.canvas;
            viewport = settings.viewport;
            canvas.addEventListener('touchstart', touchStart);
            canvas.addEventListener('touchmove', touchMove);
            canvas.addEventListener('touchend', touchEnd);
            canvas.addEventListener('mousedown', mouseDown);
            canvas.addEventListener('mousemove', mouseMove);
            canvas.addEventListener('mouseup', mouseUp);

            if (canvas && !navigator.isCocoonJS) {
                offsetLeft = canvas.offsetLeft;
                offsetTop = canvas.offsetTop;
            }

            // touch device
            document.body.addEventListener('touchstart', function (evt) {
                if (evt && evt.preventDefault) {
                    evt.preventDefault();
                }
                if (evt && evt.stopPropagation) {
                    evt.stopPropagation();
                }
                return false;
            });
            document.body.addEventListener('touchmove', function (evt) {
                if (evt && evt.preventDefault) {
                    evt.preventDefault();
                }
                if (evt && evt.stopPropagation) {
                    evt.stopPropagation();
                }
                return false;
            });
        },
        addListener: function () {},
        removeListener: function () {}
    };
});
/**
 *  Manager that controls all objects
 *  @copyright (C) 2014 1HandGaming
 *  @author Hernan Zhou
 */
bento.define('bento/managers/object', [
    'bento/sugar'
], function (Sugar) {
    'use strict';
    var objects = [],
        lastTime = new Date().getTime(),
        cumulativeTime = 0,
        minimumFps = 30,
        lastFrameTime = new Date().getTime(),
        gameData,
        debug,
        isRunning = false,
        useSort = true,
        isPaused = false,
        sort = function () {
            Sugar.stableSort.inplace(objects, function (a, b) {
                return a.z - b.z;
            });
            /*// default behavior
            objects.sort(function (a, b) {
                return a.z - b.z;
            });*/
        },
        cleanObjects = function () {
            var i;
            // loop objects array from end to start and remove null elements
            for (i = objects.length - 1; i >= 0; --i) {
                if (objects[i] === null) {
                    objects.splice(i, 1);
                }
            }
        },
        predraw = function () {},
        cycle = function (time) {
            var object,
                i,
                currentTime = new Date().getTime(),
                deltaT = currentTime - lastTime;

            if (debug && debug.debugBar) {
                debug.fps = Math.round(1000 / (window.performance.now() - debug.lastTime), 2);
                debug.fpsAccumulator += debug.fps;
                debug.fpsTicks += 1;
                debug.avg = Math.round(debug.fpsAccumulator / debug.fpsTicks);
                if (debug.fpsTicks > debug.fpsMaxAverage) {
                    debug.fpsAccumulator = 0;
                    debug.fpsTicks = 0;
                }
                debug.debugBar.innerHTML = 'fps: ' + debug.avg;
                debug.lastTime = window.performance.now();
            }

            lastTime = currentTime;
            cumulativeTime += deltaT;
            gameData.deltaT = deltaT;
            while (cumulativeTime >= 1000 / 60) {
                cumulativeTime -= 1000 / 60;
                if (cumulativeTime > 1000 / minimumFps) {
                    // deplete cumulative time
                    while (cumulativeTime >= 1000 / 60) {
                        cumulativeTime -= 1000 / 60;
                    }
                }
                for (i = 0; i < objects.length; ++i) {
                    object = objects[i];
                    if (!object) {
                        continue;
                    }
                    if (object.update && ((isPaused && object.updateWhenPaused) || !isPaused)) {
                        object.update(gameData);
                    }
                }
            }
            cleanObjects();
            if (useSort) {
                sort();
            }
            predraw();
            for (i = 0; i < objects.length; ++i) {
                object = objects[i];
                if (!object) {
                    continue;
                }
                if (object.draw) {
                    object.draw(gameData);
                }
            }
            gameData.renderer.flush();

            lastFrameTime = time;

            requestAnimationFrame(cycle);
        };

        if (!window.performance) {
            window.performance = {
                now: Date.now
            };
        }

    return {
        init: function (data, debugObj) {
            gameData = data;
            debug = debugObj;
        },
        add: function (object) {
            var i, type, family;
            object.z = object.z || 0;
            objects.push(object);
            if (object.init) {
                object.init();
            }
            // add object to access pools
            if (object.getFamily) {
                family = object.getFamily();
                for (i = 0; i < family.length; ++i) {
                    type = family[i];
                    if (!quickAccess[type]) {
                        quickAccess[type] = [];
                    }
                    quickAccess[type].push(object);
                }
            }
        },
        remove: function (object) {
            var i, type, index, family;
            if (!object) {
                return;
            }
            index = objects.indexOf(object);
            if (index >= 0) {
                objects[index] = null;
                if (object.destroy) {
                    object.destroy(gameData);
                }
            }
            // remove from access pools
            if (object.getFamily) {
                family = object.getFamily();
                for (i = 0; i < family.length; ++i) {
                    type = family[i];
                    Sugar.removeObject(quickAccess[type], object);
                }
            }
        },
        removeAll: function (removeGlobal) {
            var i,
                object;
            for (i = 0; i < objects.length; ++i) {
                object = objects[i];
                if (!object) {
                    continue;
                }
                if (!object.global || removeGlobal) {
                    this.remove(object);
                }
            }
        },
        getByName: function (objectName) {
            var i,
                object,
                array = [];

            for (i = 0; i < objects.length; ++i) {
                object = objects[i];
                if (!object) {
                    continue;
                }
                if (!object.name) {
                    continue;
                }
                if (object.name === objectName) {
                    array.push(object);
                }
            }
            return array;
        },
        getByFamily: function (type) {
            var array = quickAccess[type];
            if (!array) {
                // initialize it
                quickAccess[type] = [];
                array = quickAccess[type];
                console.log('Warning: family called ' + type + ' does not exist');
            }
            return array;
        },
        run: function () {
            if (!isRunning) {
                cycle();
                isRunning = true;
            }
        }
    };
});
/**
 *  @module Array2d
 *  @desc Represents a 2 dimensional array
 *  @copyright (C) 1HandGaming
 *  @author Hernan Zhou
 */
bento.define('bento/math/array2d', function () {
    'use strict';
    return function (width, height) {
        var array = [],
            i,
            j;

        // init array
        for (i = 0; i < width; ++i) {
            array[i] = [];
            for (j = 0; j < height; ++j) {
                array[i][j] = null;
            }
        }

        return {
            isArray2d: function () {
                return true;
            },
            iterate: function (callback) {
                var i, j;
                for (j = 0; j < height; ++j) {
                    for (i = 0; i < width; ++i) {
                        callback(i, j, array[i][j]);
                    }
                }
            },
            get: function (x, y) {
                return array[x][y];
            },
            set: function (x, y, value) {
                array[x][y] = value;
            },
            width: function () {
                return width;
            },
            height: function () {
                return height;
            }
        };
    };
});
/**
 *  @module Matrix
 *  @desc Represents a matrix (a 2d array of Numbers)
 *  @copyright (C) 1HandGaming
 *  @author Hernan Zhou
 */
bento.define('bento/math/matrix', [
    'bento/sugar'
], function (Sugar) {
    'use strict';
    var add = function (other) {
            var newMatrix = this.clone();
            newMatrix.addTo(other);
            return newMatrix;
        },
        multiply = function (matrix1, matrix2) {
            var newMatrix = this.clone();
            newMatrix.multiplyWith(other);
            return newMatrix;
        },
        module = function (width, height) {
            var matrix = [],
                n = width || 0,
                m = height || 0,
                i,
                j,
                set = function (x, y, value) {
                    matrix[y * n + x] = value;
                },
                get = function (x, y) {
                    return matrix[y * n + x];
                };

            // initialize as identity matrix
            for (j = 0; j < m; ++j) {
                for (i = 0; i < n; ++i) {
                    if (i === j) {
                        set(i, j, 1);
                    } else {
                        set(i, j, 0);
                    }
                }
            }

            return {
                isMatrix: function () {
                    return true;
                },
                /**
                 * Returns a string representation of the matrix (useful for debugging purposes)
                 */
                stringify: function () {
                    var i,
                        j,
                        str = '',
                        row = '';
                    for (j = 0; j < m; ++j) {
                        for (i = 0; i < n; ++i) {
                            row += get(i, j) + '\t';
                        }
                        str += row + '\n';
                        row = '';
                    }
                    return str;
                },
                /**
                 * Get the value inside matrix
                 * @param {Number} x - x index
                 * @param {Number} y - y index
                 */
                get: function (x, y) {
                    return get(x, y);
                },
                /**
                 * Set the value inside matrix
                 * @param {Number} x - x index
                 * @param {Number} y - y index
                 * @param {Number} value - new value
                 */
                set: function (x, y, value) {
                    set(x, y, value);
                },
                /**
                 * Set the values inside matrix using an array
                 * If the matrix is 2x2 in size, then supplying an array with
                 * values [1, 2, 3, 4] will result in a matrix
                 * [1 2]
                 * [3 4]
                 * If the array has more elements than the matrix, the
                 * rest of the array is ignored.
                 * @param {Array} array - array with Numbers
                 */
                setValues: function (array) {
                    var i, l = Math.min(matrix.length, array.length);
                    for (i = 0; i < l; ++i) {
                        matrix[i] = array[i];
                    }
                    return this;
                },
                /**
                 * Get the matrix width
                 */
                getWidth: function () {
                    return n;
                },
                /**
                 * Get the matrix height
                 */
                getHeight: function () {
                    return m;
                },
                /**
                 * Iterate through matrix
                 */
                iterate: function (callback) {
                    var i, j;
                    for (j = 0; j < m; ++j) {
                        for (i = 0; i < n; ++i) {
                            if (!Sugar.isFunction(callback)) {
                                throw ('Please supply a callback function');
                            }
                            callback(i, j, get(i, j));
                        }
                    }
                },
                /**
                 * Transposes the current matrix
                 */
                transpose: function () {
                    var i, j, newMat = [];
                    // reverse loop so m becomes n
                    for (i = 0; i < n; ++i) {
                        for (j = 0; j < m; ++j) {
                            newMat[i * m + j] = get(i, j);
                        }
                    }
                    // set new matrix
                    matrix = newMat;
                    // swap width and height
                    m = [n, n = m][0];
                    return this;
                },
                /**
                 * Addition of another matrix
                 * @param {Matrix} matrix - matrix to add
                 */
                addTo: function (other) {
                    var i, j;
                    if (m != other.getHeight() || n != other.getWidth()) {
                        throw 'Matrix sizes incorrect';
                    }
                    for (j = 0; j < m; ++j) {
                        for (i = 0; i < n; ++i) {
                            set(i, j, get(i, j) + other.get(i, j));
                        }
                    }
                    return this;
                },
                add: add,
                /**
                 * Multiply with another matrix
                 * If a new matrix C is the result of A * B = C
                 * then B is the current matrix and becomes C, A is the input matrix
                 * @param {Matrix} matrix - input matrix to multiply with
                 */
                multiplyWith: function (other) {
                    var i, j,
                        newMat = [],
                        newWidth = n, // B.n
                        oldHeight = m, // B.m
                        newHeight = other.getHeight(), // A.m
                        oldWidth = other.getWidth(), // A.n
                        newValue = 0,
                        k;
                    if (oldHeight != oldWidth) {
                        throw 'Matrix sizes incorrect';
                    }

                    for (j = 0; j < newHeight; ++j) {
                        for (i = 0; i < newWidth; ++i) {
                            newValue = 0;
                            // loop through matrices
                            for (k = 0; k < oldWidth; ++k) {
                                newValue += matrix.get(k, j) * get(i, k);
                            }
                            newMat[j * newWidth + i] = newValue;
                        }
                    }
                    // set to new matrix
                    matrix = newMat;
                    // update matrix size
                    n = newWidth;
                    m = newHeight;
                    return this;
                },
                multiply: multiply,
                /**
                 * Returns a clone of the current matrix
                 */
                clone: function () {
                    var newMatrix = module(n, m);
                    newMatrix.setValues(matrix);
                    return newMatrix;
                }
            };
        };
    return module;
});
/**
 *  @module Polygon
 *  @desc Represents a polygon
 *  @copyright (C) 1HandGaming
 *  @author Hernan Zhou
 */
bento.define('bento/math/polygon', [
    'bento/sugar',
    'bento/math/rectangle'
], function (Sugar, Rectangle) {
    'use strict';
    var isPolygon = function () {
            return true;
        },
        clone = function () {
            var clone = [],
                points = this.points,
                i = points.length;
            // clone the array
            while (i--) {
                clone[i] = points[i];
            }
            return module(clone);
        },
        offset = function (pos) {
            var clone = [],
                points = this.points,
                i = points.length;
            while (i--) {
                clone[i] = points[i];
                clone[i].x += pos.x;
                clone[i].y += pos.y;
            }
            return module(clone);
        },
        doLineSegmentsIntersect = function (p, p2, q, q2) {
            // based on https://github.com/pgkelley4/line-segments-intersect
            var crossProduct = function (p1, p2) {
                    return p1.x * p2.y - p1.y * p2.x;
                },
                subtractPoints = function (p1, p2) {
                    return {
                        x: p1.x - p2.x,
                        y: p1.y - p2.y
                    };
                },
                r = subtractPoints(p2, p),
                s = subtractPoints(q2, q),
                uNumerator = crossProduct(subtractPoints(q, p), r),
                denominator = crossProduct(r, s),
                u,
                t;
            if (uNumerator === 0 && denominator === 0) {
                return ((q.x - p.x < 0) !== (q.x - p2.x < 0) !== (q2.x - p.x < 0) !== (q2.x - p2.x < 0)) ||
                    ((q.y - p.y < 0) !== (q.y - p2.y < 0) !== (q2.y - p.y < 0) !== (q2.y - p2.y < 0));
            }
            if (denominator === 0) {
                return false;
            }
            u = uNumerator / denominator;
            t = crossProduct(subtractPoints(q, p), s) / denominator;
            return (t >= 0) && (t <= 1) && (u >= 0) && (u <= 1);
        },
        intersect = function (polygon) {
            var intersect = false,
                other = [],
                points = this.points,
                p1,
                p2,
                q1,
                q2,
                i,
                j;

            // is other really a polygon?
            if (polygon.isRectangle) {
                // before constructing a polygon, check if boxes collide in the first place 
                if (!this.getBoundingBox().intersect(polygon)) {
                    return false;
                }
                // construct a polygon out of rectangle
                other.push({
                    x: polygon.x,
                    y: polygon.y
                });
                other.push({
                    x: polygon.getX2(),
                    y: polygon.y
                });
                other.push({
                    x: polygon.getX2(),
                    y: polygon.getY2()
                });
                other.push({
                    x: polygon.x,
                    y: polygon.getY2()
                });
                polygon = module(other);
            } else {
                // simplest check first: regard polygons as boxes and check collision
                if (!this.getBoundingBox().intersect(polygon.getBoundingBox())) {
                    return false;
                }
                // get polygon points
                other = polygon.points;
            }

            // precision check
            for (i = 0; i < points.length; ++i) {
                for (j = 0; j < other.length; ++j) {
                    p1 = points[i];
                    p2 = points[(i + 1) % points.length];
                    q1 = other[j];
                    q2 = other[(j + 1) % other.length];
                    if (doLineSegmentsIntersect(p1, p2, q1, q2)) {
                        return true;
                    }
                }
            }
            // check inside one or another
            if (this.hasPosition(other[0]) || polygon.hasPosition(points[0])) {
                return true;
            } else {
                return false;
            }
        },
        hasPosition = function (p) {
            var points = this.points,
                has = false,
                i = 0,
                j = points.length - 1;

            if (p.x < minX || p.x > maxX || p.y < minY || p.y > maxY) {
                return false;
            }
            for (i, j; i < points.length; j = i++) {
                if ((points[i].y > p.y) != (points[j].y > p.y) &&
                    p.x < (points[j].x - points[i].x) * (p.y - points[i].y) /
                    (points[j].y - points[i].y) + points[i].x) {
                    has = !has;
                }
            }
            return has;
        },
        module = function (points) {
            var minX = points[0].x,
                maxX = points[0].x,
                minY = points[0].y,
                maxY = points[0].y,
                n = 1,
                q;

            for (n = 1; n < points.length; ++n) {
                q = points[n];
                minX = Math.min(q.x, minX);
                maxX = Math.max(q.x, maxX);
                minY = Math.min(q.y, minY);
                maxY = Math.max(q.y, maxY);
            }

            return {
                points: points,
                isPolygon: isPolygon,
                getBoundingBox: function () {
                    return Rectangle(minX, minY, maxX - minX, maxY - minY);
                },
                hasPosition: hasPosition,
                intersect: intersect,
                offset: offset,
                clone: clone
            };
        };
    return module;
});
/**
 *  @module Rectangle
 *  @desc Represents a rectangle
 *  @copyright (C) 1HandGaming
 *  @author Hernan Zhou
 */
bento.define('bento/math/rectangle', ['bento/sugar'], function (Sugar) {
    'use strict';
    var isRectangle = function () {
            return true;
        },
        getX2 = function () {
            return this.x + this.width;
        },
        getY2 = function () {
            return this.y + this.height;
        },
        union = function (rectangle) {
            var x1 = Math.min(this.x, rectangle.x),
                y1 = Math.min(this.y, rectangle.y),
                x2 = Math.max(this.getX2(), rectangle.getX2()),
                y2 = Math.max(this.getY2(), rectangle.getY2());
            return module(x1, y1, x2 - x1, y2 - y1);
        },
        intersect = function (other) {
            if (other.isPolygon) {
                return other.intersect(this);
            } else {
                return !(this.x + this.width <= other.x ||
                    this.y + this.height <= other.y ||
                    this.x >= other.x + other.width ||
                    this.y >= other.y + other.height);
            }
        },
        intersection = function (rectangle) {
            var inter = module(0, 0, 0, 0);
            if (this.intersect(rectangle)) {
                inter.x = Math.max(this.x, rectangle.x);
                inter.y = Math.max(this.y, rectangle.y);
                inter.width = Math.min(this.x + this.width, rectangle.x + rectangle.width) - inter.x;
                inter.height = Math.min(this.y + this.height, rectangle.y + rectangle.height) - inter.y;
            }
            return inter;
        },
        offset = function (pos) {
            return module(this.x + pos.x, this.y + pos.y, this.width, this.height);
        },
        clone = function () {
            return module(this.x, this.y, this.width, this.height);
        },
        hasPosition = function (vector) {
            return !(
                vector.x < this.x ||
                vector.y < this.y ||
                vector.x >= this.x + this.width ||
                vector.y >= this.y + this.height
            );
        },
        grow = function (size) {
            this.x -= size / 2;
            this.y -= size / 2;
            this.width += size;
            this.height += size;
        },
        module = function (x, y, width, height) {
            return {
                x: x,
                y: y,
                width: width,
                height: height,
                isRectangle: isRectangle,
                getX2: getX2,
                getY2: getY2,
                union: union,
                intersect: intersect,
                intersection: intersection,
                offset: offset,
                clone: clone,
                hasPosition: hasPosition,
                grow: grow
            };
        };
    return module;
});
/**
 *  @module Vector2
 *  @desc Represents a 2 dimensional vector
 *  @copyright (C) 1HandGaming
 *  @author Hernan Zhou
 */
bento.define('bento/math/vector2', [], function () {
    'use strict';
    var isVector2 = function () {
            return true;
        },
        add = function (vector) {
            var v = this.clone();
            v.addTo(vector);
            return v;
        },
        addTo = function (vector) {
            this.x += vector.x;
            this.y += vector.y;
            return this;
        },
        substract = function (vector) {
            var v = this.clone();
            v.substractFrom(vector);
            return v;
        },
        substractFrom = function (vector) {
            this.x -= vector.x;
            this.y -= vector.y;
            return this;
        },
        angle = function () {
            return Math.atan2(this.y, this.x);
        },
        angleBetween = function (vector) {
            return Math.atan2(
                vector.y - this.y,
                vector.x - this.x
            );
        },
        dotProduct = function (vector) {
            return this.x * vector.x + this.y * vector.y;
        },
        multiply = function (vector) {
            var v = this.clone();
            v.multiplyWith(vector);
            return v;
        },
        multiplyWith = function (vector) {
            this.x *= vector.x;
            this.y *= vector.y;
            return this;
        },
        divide = function (vector) {
            var v = this.clone();
            v.divideBy(vector);
            return v;
        },
        divideBy = function (vector) {
            this.x /= vector.x;
            this.y /= vector.y;
            return this;
        },
        scale = function (value) {
            this.x *= value;
            this.y *= value;
            return this;
        },
        length = function () {
            return Math.sqrt(this.dotProduct(this));
        },
        normalize = function () {
            var length = this.length();
            this.x /= length;
            this.y /= length;
            return this;
        },
        distance = function (vector) {
            return vector.substract(this).length();
        },
        clone = function () {
            return module(this.x, this.y);
        },
        toMatrix = function () {
            var matrix = Matrix(1, 3);
            matrix.set(0, 0, this.x);
            matrix.set(0, 1, this.y);
            matrix.set(0, 2, 1);
            return matrix;
        },
        module = function (x, y) {
            return {
                x: x,
                y: y,
                isVector2: isVector2,
                add: add,
                addTo: addTo,
                substract: substract,
                substractFrom: substractFrom,
                angle: angle,
                angleBetween: angleBetween,
                dotProduct: dotProduct,
                multiply: multiply,
                multiplyWith: multiplyWith,
                divide: divide,
                divideBy: divideBy,
                scale: scale,
                length: length,
                normalize: normalize,
                distance: distance,
                clone: clone
            };
        };
    return module;
});
bento.define('bento/renderers/canvas2d', [
    'bento/sugar'
], function (Sugar) {
    return function (canvas, context) {
        var renderer = {
            name: 'canvas2d',
            save: function () {
                context.save();
            },
            restore: function () {
                context.restore();
            },
            translate: function (x, y) {
                context.translate(x, y);
            },
            scale: function (x, y) {
                context.scale(x, y);
            },
            rotate: function (angle) {
                context.rotate(angle);
            },
            fillRect: function (color, x, y, w, h) {
                context.fillStyle = color;
                context.fillRect(x, y, w, h);
            },
            drawImage: function (image, sx, sy, sw, sh, x, y, w, h) {
                context.drawImage(image, sx, sy, sw, sh, x, y, w, h);
            }
        };
        console.log('using canvas2d as renderer');

        return renderer;
    };
});
bento.define('bento/renderers/pixi', [
    'bento/sugar'
], function (Sugar) {
    return function (canvas, context) {
        var pixiStage,
            pixiRenderer,
            pixiBatch,
            currentObject,
            renderer = {
                name: 'pixi',
                init: function () {

                },
                destroy: function () {},
                save: function (obj) {
                    currentObject = obj;
                    pixiStage.addChild(obj.pixiSprite);
                    currentObject.pixiSprite.position.x = 0;
                    currentObject.pixiSprite.position.y = 0;
                },
                restore: function () {},
                translate: function (x, y) {
                    currentObject.pixiSprite.position.x += x;
                    currentObject.pixiSprite.position.y += y;
                },
                scale: function (x, y) {},
                rotate: function (angle) {},
                fillRect: function (color, x, y, w, h) {},
                drawImage: function (image, sx, sy, sw, sh, x, y, w, h) {
                    currentObject.pixiTexture.setFrame(new PIXI.Rectangle(sx, sy, sw, sh));

                },
                flush: function () {
                    pixiRenderer.render(pixiStage);
                    pixiStage.removeChildren();
                }
            };
        // init pixi
        pixiStage = new PIXI.Stage(0x000000);
        pixiRenderer = PIXI.autoDetectRenderer(canvas.width, canvas.height, {
            view: canvas
        });
        console.log('initialized pixi as renderer');
        return renderer;
    }
});