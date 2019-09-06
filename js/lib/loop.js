/**
 * Game loop implementation
 */
bento.define('lib/loop', [
    'bento',
    'bento/utils',
    'bento/lib/requestanimationframe'
], function (
    Bento,
    Utils,
    RequestAnimationFrame
) {
    'use strict';
    var Loop = {
        run: function (callback) {
            RequestAnimationFrame(callback);
        }
    };
    return Loop;
});