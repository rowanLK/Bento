/**
 * Game loop implementation. Reason why this exists is because Loop.run(callback)
 * can be swapped out with a different implementation other than requestAnimationFrame.
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