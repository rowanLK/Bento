/**
 * Main entry point for Bento engine
 * Defines global bento namespace, use bento.require and define.
 * Require/define uses RequireJS.
 * @name bento
 */
(function () {
    'use strict';
    var startWatching = false,
        modules = [],
        rjs = window.requirejs, // cache requirejs
        req = window.require, // cache requirejs
        def = window.define; // cache requirejs
    bento.require = req;
    bento.define =  function () {
        var name = arguments[0];
        if (startWatching) {
            modules.push(name);
        }
        def.apply(this, arguments);
    };
    bento.refresh = function () {
        var i = 0;
        // undefines every module loaded since watch started
        for (i = 0; i < modules.length; ++i) {
            rjs.undef(modules[i]);
        }
    };
    bento.watch = function () {
        startWatching = true;
    };

    // undefine global define and require, in case it clashes with other require systems
    window.require = undefined;
    window.define = undefined;
}());

// define cpp components and classes
bento.define('bento', [], function () {
    'use strict';
    return window.bento;
});

// define cpp components and classes
bento.define('bento/managers/object', [], function () {
    'use strict';
    return window.bento.objects;
});

bento.define('bento/math/vector2', [], function () {
    'use strict';
    return Vector2;
});

bento.define('bento/math/rectangle', [], function () {
    'use strict';
    return Rectangle;
});

bento.define('bento/entity', [], function () {
    'use strict';
    return Entity;
});