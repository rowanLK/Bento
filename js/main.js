/**
 *  Main entry point for Bento engine
 *  Defines global bento namespace, use bento.require and define
 *  @name bento
 *  @copyright (C) 2015 LuckyKat
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