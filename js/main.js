/**
 *  Main entry point for Bento engine
 *  Defines global bento namespace, use bento.require and define
 *  @name bento
 */
(function () {
    'use strict';
    var startWatching = false,
        modules = [],
        rjs = window.requirejs, // cache requirejs
        req = window.require, // cache requirejs
        def = window.define, // cache requirejs
        bento = {
            require: req,
            define: function () {
                var name = arguments[0];
                if (startWatching) {
                    modules.push(name);
                }
                def.apply(this, arguments);
            },
            refresh: function () {
            	var i = 0;
                // undefines every module loaded since watch started 
                for (i = 0; i < modules.length; ++i) {
                	rjs.undef(modules[i]);
                }
            },
            watch: function () {
                startWatching = true;
            }
        };
    window.bento = window.bento || bento;
}());