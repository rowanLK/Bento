/**
 *  Main entry point for Bento engine
 *  @copyright (C) 2014 HeiGames
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