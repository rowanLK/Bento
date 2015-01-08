/**
 *  Main entry point for Rice engine
 *  @copyright (C) 2014 1HandGaming
 *  @author Hernan Zhou
 */
(function () {
    'use strict';
    var rice = {
        require: window.require,
        define: window.define
    };
    window.rice = window.rice || rice;
}());