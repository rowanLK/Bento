/**
 *  Manager that controls all events for input
 *  @copyright (C) 2014 HeiGames
 *  @author Hernan Zhou
 */
bento.define('bento/managers/input', [
    'bento/utils',
    'bento/math/vector2',
    'bento/eventsystem'
], function (Utils, Vector2, EventSystem) {
    'use strict';
    return function (settings) {
        var isPaused = false,
            canvas,
            canvasScale,
            viewport,
            pointers = [],
            offsetLeft = 0,
            offsetTop = 0,
            pointerDown = function (evt) {
                pointers.push(evt);
                EventSystem.fire('pointerDown', evt);
            },
            pointerMove = function (evt) {
                EventSystem.fire('pointerMove', evt);
                updatePointer(evt);
            },
            pointerUp = function (evt) {
                EventSystem.fire('pointerUp', evt);
                removePointer(evt);
            },
            touchStart = function (evt) {
                var id, i;
                evt.preventDefault();
                for (i = 0; i < evt.changedTouches.length; i += 1) {
                    addTouchPosition(evt, i);
                    pointerDown(evt);
                }
            },
            touchMove = function (evt) {
                var id, i;
                evt.preventDefault();
                for (i = 0; i < evt.changedTouches.length; i += 1) {
                    addTouchPosition(evt, i);
                    pointerMove(evt);
                }
            },
            touchEnd = function (evt) {
                var id, i;
                evt.preventDefault();
                for (i = 0; i < evt.changedTouches.length; i += 1) {
                    addTouchPosition(evt, i);
                    pointerUp(evt);
                }
            },
            mouseDown = function (evt) {
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
                evt.id = 0;
                evt.eventType = 'touch';
                evt.changedTouches[n].position = Vector2(x, y);
                evt.changedTouches[n].worldPosition = evt.changedTouches[n].position.clone();
                evt.changedTouches[n].worldPosition.x += viewport.x;
                evt.changedTouches[n].worldPosition.y += viewport.y;
                // add 'normal' position
                evt.position = evt.changedTouches[n].position.clone();
                evt.worldPosition = evt.changedTouches[n].worldPosition.clone();
                // id
                evt.id = evt.changedTouches[n].identifier + 1;
            },
            addMousePosition = function (evt) {
                var x = (evt.clientX - offsetLeft) / canvasScale.x,
                    y = (evt.clientY - offsetTop) / canvasScale.y;
                evt.id = 0;
                evt.eventType = 'mouse';
                evt.position = Vector2(x, y);
                evt.worldPosition = evt.position.clone();
                evt.worldPosition.x += viewport.x;
                evt.worldPosition.y += viewport.y;
                // give it an id that doesn't clash with touch id
                evt.id = -1;
            },
            updatePointer = function (evt) {
                var i = 0;
                for (i = 0; i < pointers.length; i += 1) {
                    if (pointers[i].id === evt.id) {
                        pointers[i] = evt;
                        return;
                    }
                }
            },
            removePointer = function (evt) {
                var i = 0;
                for (i = 0; i < pointers.length; i += 1) {
                    if (pointers[i].id === evt.id) {
                        pointers.splice(i, 1);
                        return;
                    }
                }
            };

        if (!settings) {
            throw 'Supply a settings object';
        }
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

        if (canvas && !Utils.isCocoonJS()) {
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
        return {
            getPointers: function () {
                return pointers;
            },
            resetPointers: function () {
                pointers.length = 0;
            },
            addListener: function () {},
            removeListener: function () {}
        };
    };
});