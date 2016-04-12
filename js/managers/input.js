/**
 * Manager that tracks mouse/touch and keyboard input. Useful for manual input managing.
 * <br>Exports: Constructor, can be accessed through Bento.input namespace.
 * @module bento/managers/input
 * @param {Object} gameData - gameData
 * @param {Vector2} gameData.canvasScale - Reference to the current canvas scale.
 * @param {HtmlCanvas} gameData.canvas - Reference to the canvas element.
 * @param {Rectangle} gameData.viewport - Reference to viewport.
 * @param {Object} settings - settings passed from Bento.setup
 * @param {Boolean} settings.preventContextMenu - Prevents right click menu
 * @returns InputManager
 */
bento.define('bento/managers/input', [
    'bento/utils',
    'bento/math/vector2',
    'bento/eventsystem'
], function (Utils, Vector2, EventSystem) {
    'use strict';
    var startPositions = {};
    return function (gameData, settings) {
        var isPaused = false,
            isListening = false,
            canvas,
            canvasScale,
            viewport,
            pointers = [],
            keyStates = {},
            offsetLeft = 0,
            offsetTop = 0,
            remote,
            remoteButtonsPressed = [],
            remoteButtonStates = {},
            pointerDown = function (evt) {
                pointers.push({
                    id: evt.id,
                    position: evt.position,
                    eventType: evt.eventType,
                    localPosition: evt.localPosition,
                    worldPosition: evt.worldPosition
                });
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
                    addTouchPosition(evt, i, 'start');
                    pointerDown(evt);
                }
            },
            touchMove = function (evt) {
                var id, i;
                evt.preventDefault();
                for (i = 0; i < evt.changedTouches.length; i += 1) {
                    addTouchPosition(evt, i, 'move');
                    pointerMove(evt);
                }
            },
            touchEnd = function (evt) {
                var id, i;
                evt.preventDefault();
                for (i = 0; i < evt.changedTouches.length; i += 1) {
                    addTouchPosition(evt, i, 'end');
                    pointerUp(evt);
                }
            },
            mouseDown = function (evt) {
                evt.preventDefault();
                addMousePosition(evt, 'start');
                pointerDown(evt);
            },
            mouseMove = function (evt) {
                evt.preventDefault();
                addMousePosition(evt, 'move');
                pointerMove(evt);
            },
            mouseUp = function (evt) {
                evt.preventDefault();
                addMousePosition(evt, 'end');
                pointerUp(evt);
            },
            addTouchPosition = function (evt, n, type) {
                var touch = evt.changedTouches[n],
                    x = (touch.pageX - offsetLeft) / canvasScale.x,
                    y = (touch.pageY - offsetTop) / canvasScale.y,
                    startPos = {};

                evt.preventDefault();
                evt.id = 0;
                evt.eventType = 'touch';
                touch.position = new Vector2(x, y);
                touch.worldPosition = touch.position.clone();
                touch.worldPosition.x += viewport.x;
                touch.worldPosition.y += viewport.y;
                touch.localPosition = touch.position.clone();
                // add 'normal' position
                evt.position = touch.position.clone();
                evt.worldPosition = touch.worldPosition.clone();
                evt.localPosition = touch.localPosition.clone();
                // id
                evt.id = touch.identifier + 1;
                // diff position
                if (type === 'start') {
                    startPos.startPosition = touch.position.clone();
                    startPos.startWorldPosition = touch.worldPosition.clone();
                    startPos.startLocalPosition = touch.localPosition.clone();
                    // save startPos
                    startPositions[evt.id] = startPos;
                }
                if (type === 'end') {
                    // load startPos
                    startPos = startPositions[evt.id];
                    if (startPos && startPos.startPosition) {
                        touch.diffPosition = touch.position.substract(startPos.startPosition);
                        touch.diffWorldPosition = touch.worldPosition.substract(startPos.startWorldPosition);
                        touch.diffLocalPosition = touch.localPosition.substract(startPos.startLocalPosition);
                        evt.diffPosition = touch.diffPosition.clone();
                        evt.diffWorldPosition = touch.diffWorldPosition.clone();
                        evt.diffLocalPosition = touch.diffLocalPosition.clone();
                        delete startPositions[evt.id];
                    } else {
                        console.log('WARNING: touch startPosition was not defined');
                    }
                }

            },
            addMousePosition = function (evt, type) {
                var x = (evt.pageX - offsetLeft) / canvasScale.x,
                    y = (evt.pageY - offsetTop) / canvasScale.y,
                    startPos = {},
                    n = -1;
                evt.id = 0;
                evt.eventType = 'mouse';
                evt.position = new Vector2(x, y);
                evt.worldPosition = evt.position.clone();
                evt.worldPosition.x += viewport.x;
                evt.worldPosition.y += viewport.y;
                evt.localPosition = evt.position.clone();
                // diff position
                if (type === 'start') {
                    startPos.startPosition = evt.position.clone();
                    startPos.startWorldPosition = evt.worldPosition.clone();
                    startPos.startLocalPosition = evt.localPosition.clone();
                    // save startPos
                    startPositions[n] = startPos;
                }
                if (type === 'end') {
                    // load startPos
                    startPos = startPositions[n];
                    evt.diffPosition = evt.position.substract(startPos.startPosition);
                    evt.diffWorldPosition = evt.worldPosition.substract(startPos.startWorldPosition);
                    evt.diffLocalPosition = evt.localPosition.substract(startPos.startLocalPosition);
                }
                // give it an id that doesn't clash with touch id
                evt.id = -1;
            },
            updatePointer = function (evt) {
                var i = 0;
                for (i = 0; i < pointers.length; i += 1) {
                    if (pointers[i].id === evt.id) {
                        pointers[i].position = evt.position;
                        pointers[i].worldPosition = evt.worldPosition;
                        pointers[i].localPosition = evt.position;
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
            },
            initTouch = function () {
                canvas.addEventListener('touchstart', touchStart);
                canvas.addEventListener('touchmove', touchMove);
                canvas.addEventListener('touchend', touchEnd);
                canvas.addEventListener('mousedown', mouseDown);
                canvas.addEventListener('mousemove', mouseMove);
                canvas.addEventListener('mouseup', mouseUp);
                isListening = true;

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
            initKeyboard = function () {
                var element = gameData.canvas || window,
                    refocus = function (evt) {
                        if (element.focus) {
                            element.focus();
                        }
                    };
                // fix for iframes
                element.tabIndex = 0;
                if (element.focus) {
                    element.focus();
                }
                element.addEventListener('keydown', keyDown, false);
                element.addEventListener('keyup', keyUp, false);
                // refocus
                element.addEventListener('mousedown', refocus, false);

            },
            keyDown = function (evt) {
                var i, names;
                evt.preventDefault();
                EventSystem.fire('keyDown', evt);
                // get names
                names = Utils.keyboardMapping[evt.keyCode];
                for (i = 0; i < names.length; ++i) {
                    keyStates[names[i]] = true;
                    EventSystem.fire('buttonDown', names[i]);
                    EventSystem.fire('buttonDown-' + names[i]);
                }
            },
            keyUp = function (evt) {
                var i, names;
                evt.preventDefault();
                EventSystem.fire('keyUp', evt);
                // get names
                names = Utils.keyboardMapping[evt.keyCode];
                for (i = 0; i < names.length; ++i) {
                    keyStates[names[i]] = false;
                    EventSystem.fire('buttonUp', names[i]);
                }
            },
            destroy = function () {
                // remove all event listeners
            },
            /**
             * Changes the offsets after resizing or screen re-orientation.
             * @function
             * @instance
             * @name onResize
             */
            onResize = function () {
                offsetLeft = canvas.offsetLeft;
                offsetTop = canvas.offsetTop;
            },
            initMouseClicks = function () {
                if (!document || !document.addEventListener) {
                    return;
                }
                document.addEventListener('contextmenu', function (e) {
                    EventSystem.fire('mouseDown-right');
                    // prevent context menu
                    if (settings.preventContextMenu) {
                        e.preventDefault();
                    }
                }, false);
                document.addEventListener('click', function (e) {
                    if (e.which === 1) {
                        EventSystem.fire('mouseDown-left');
                        e.preventDefault();
                    } else if (e.which === 2) {
                        EventSystem.fire('mouseDown-middle');
                        e.preventDefault();
                    }
                }, false);
            },
            /**
             * Adds a check for input from the apple remote before every update. Only if on tvOS.
             *
             * Ejecta (at least in version 2.0) doesn't have event handlers for button input, so
             * continually checking for input is the only way for now.
             */
            initRemote = function () {
                var i = 0,
                    gamepads;

                if (window.ejecta) {
                    // get all connected gamepads
                    gamepads = navigator.getGamepads();
                    // find apple remote gamepad
                    for (i = 0; i < gamepads.length; ++i)
                        if (gamepads[i] && gamepads[i].profile === 'microGamepad')
                            remote = gamepads[i];

                    for (i = 0; i < remote.buttons.length; ++i)
                        remoteButtonsPressed.push(remote.buttons[i].pressed);

                    // check for button input before the regular update
                    EventSystem.on('preUpdate', checkRemote);
                }
            },
            /**
             * Checks if a remote button has been pressed. Runs before every frame, if added.
             */
            checkRemote = function () {
                var i = 0,
                    len = 0;

                // uses an array to check against the state of the buttons from the previous frame
                for (i = 0, len = remote.buttons.length; i < len; ++i) {
                    if (remote.buttons[i].pressed !== remoteButtonsPressed[i]) {
                        if (remote.buttons[i].pressed) {
                            remoteButtonDown(i);
                        } else {
                            remoteButtonUp(i);
                        }
                    }
                }
            },
            remoteButtonDown = function (id) {
                var i = 0,
                    names = Utils.remoteMapping[id];
                // save value in array
                remoteButtonsPressed[id] = true;

                for (i = 0; i < names.length; ++i)
                    remoteButtonStates[names[i]] = true;
            },
            remoteButtonUp = function (id) {
                var i = 0,
                    names = Utils.remoteMapping[id];
                // save value in array
                remoteButtonsPressed[id] = false;

                for (i = 0; i < names.length; ++i)
                    remoteButtonStates[names[i]] = false;
            };

        window.addEventListener('resize', onResize, false);
        window.addEventListener('orientationchange', onResize, false);

        if (!gameData) {
            throw 'Supply a gameData object';
        }
        // canvasScale is needed to take css scaling into account
        canvasScale = gameData.canvasScale;
        canvas = gameData.canvas;
        viewport = gameData.viewport;

        if (canvas && !Utils.isCocoonJS()) {
            offsetLeft = canvas.offsetLeft;
            offsetTop = canvas.offsetTop;
        }

        // touch device
        initTouch();
        // keyboard
        initKeyboard();
        // init clicks
        initMouseClicks();
        // apple remote (only on tvOS)
        initRemote();

        return {
            /**
             * Returns all current pointers down
             * @function
             * @instance
             * @returns {Array} pointers - Array with pointer positions
             * @name getPointers
             */
            getPointers: function () {
                return pointers;
            },
            /**
             * Removes all current pointers down
             * @function
             * @instance
             * @returns {Array} pointers - Array with pointer positions
             * @name resetPointers
             */
            resetPointers: function () {
                pointers.length = 0;
            },
            /**
             * Checks if a keyboard key is down
             * @function
             * @instance
             * @param {String} name - name of the key
             * @name isKeyDown
             */
            isKeyDown: function (name) {
                return keyStates[name] || false;
            },
            /**
             * Checks if a remote button is down
             * @function
             * @instance
             * @param {String} name - name of the button
             * @name isRemoteButtonDown
             */
            isRemoteButtonDown: function (name) {
                return remoteButtonStates[name] || false;
            },
            getRemoteAxes: function () {
                return remote.axes;
            },
            /**
             * Stop all pointer input
             * @function
             * @instance
             * @name stop
             */
            stop: function () {
                if (!isListening) {
                    return;
                }
                canvas.removeEventListener('touchstart', touchStart);
                canvas.removeEventListener('touchmove', touchMove);
                canvas.removeEventListener('touchend', touchEnd);
                canvas.removeEventListener('mousedown', mouseDown);
                canvas.removeEventListener('mousemove', mouseMove);
                canvas.removeEventListener('mouseup', mouseUp);
                isListening = false;
            },
            /**
             * Resumes all pointer input
             * @function
             * @instance
             * @name resume
             */
            resume: function () {
                if (isListening) {
                    return;
                }
                canvas.addEventListener('touchstart', touchStart);
                canvas.addEventListener('touchmove', touchMove);
                canvas.addEventListener('touchend', touchEnd);
                canvas.addEventListener('mousedown', mouseDown);
                canvas.addEventListener('mousemove', mouseMove);
                canvas.addEventListener('mouseup', mouseUp);
                isListening = true;
            }
        };
    };
});