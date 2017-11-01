/**
 * Manager that tracks mouse/touch and keyboard input. Useful for manual input managing.
 * <br>Exports: Constructor, can be accessed through Bento.input namespace.
 * @module bento/managers/input
 * @moduleName InputManager
 * @param {Object} gameData - gameData
 * @param {Vector2} gameData.canvasScale - Reference to the current canvas scale.
 * @param {HtmlCanvas} gameData.canvas - Reference to the canvas element.
 * @param {Rectangle} gameData.viewport - Reference to viewport.
 * @param {Object} settings - settings passed from Bento.setup
 * @param {Boolean} [settings.preventContextMenu] - Prevents right click menu
 * @param {Boolean} [settings.globalMouseUp] - Catch mouseup events outside canvas (only useful for desktop)
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
            offsetLocal = new Vector2(0, 0),
            gamepad,
            gamepads,
            gamepadButtonsPressed = [],
            gamepadButtonStates = {},
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
                for (i = 0; i < evt.changedTouches.length; ++i) {
                    addTouchPosition(evt, i, 'start');
                    pointerDown(evt);
                }
            },
            touchMove = function (evt) {
                var id, i;
                evt.preventDefault();
                for (i = 0; i < evt.changedTouches.length; ++i) {
                    addTouchPosition(evt, i, 'move');
                    pointerMove(evt);
                }
            },
            touchEnd = function (evt) {
                var id, i;
                evt.preventDefault();
                for (i = 0; i < evt.changedTouches.length; ++i) {
                    addTouchPosition(evt, i, 'end');
                    pointerUp(evt);
                }
            },
            mouseDown = function (evt) {
                // evt.preventDefault();
                addMousePosition(evt, 'start');
                pointerDown(evt);
            },
            mouseMove = function (evt) {
                // evt.preventDefault();
                addMousePosition(evt, 'move');
                pointerMove(evt);
            },
            mouseUp = function (evt) {
                // evt.preventDefault();
                addMousePosition(evt, 'end');
                pointerUp(evt);
            },
            addTouchPosition = function (evt, n, type) {
                var touch = evt.changedTouches[n];
                var x = (touch.pageX - offsetLeft) / canvasScale.x + offsetLocal.x;
                var y = (touch.pageY - offsetTop) / canvasScale.y + offsetLocal.y;
                var startPos = {};

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
                        Utils.log("ERROR: touch startPosition was not defined");
                    }
                }

            },
            addMousePosition = function (evt, type) {
                var x = (evt.pageX - offsetLeft) / canvasScale.x + offsetLocal.x,
                    y = (evt.pageY - offsetTop) / canvasScale.y + offsetLocal.y,
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
                for (i = 0; i < pointers.length; ++i) {
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
                for (i = 0; i < pointers.length; ++i) {
                    if (pointers[i].id === evt.id) {
                        pointers.splice(i, 1);
                        return;
                    }
                }
            },
            initTouch = function () {
                if (window.ejecta) {
                    canvas.addEventListener('tvtouchstart', tvTouchStart);
                    canvas.addEventListener('tvtouchmove', tvTouchMove);
                    canvas.addEventListener('tvtouchend', tvTouchEnd);
                }
                canvas.addEventListener('touchstart', touchStart);
                canvas.addEventListener('touchmove', touchMove);
                canvas.addEventListener('touchend', touchEnd);
                if (settings.globalMouseUp) {
                    // TODO: add correction for position
                    window.addEventListener('mouseup', mouseUp);
                } else {
                    canvas.addEventListener('mouseup', mouseUp);
                }
                canvas.addEventListener('mousedown', mouseDown);
                canvas.addEventListener('mousemove', mouseMove);
                isListening = true;

                if (!Utils.isCocoonJs()) {
                    canvas.addEventListener('touchstart', function (evt) {
                        if (evt && evt.preventDefault) {
                            evt.preventDefault();
                        }
                        if (evt && evt.stopPropagation) {
                            evt.stopPropagation();
                        }
                        return false;
                    });
                    canvas.addEventListener('touchmove', function (evt) {
                        if (evt && evt.preventDefault) {
                            evt.preventDefault();
                        }
                        if (evt && evt.stopPropagation) {
                            evt.stopPropagation();
                        }
                        return false;
                    });
                }

                // touchcancel can be used when system interveness with the game
                canvas.addEventListener('touchcancel', function (evt) {
                    EventSystem.fire('touchcancel', evt);
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
                // catch unknown keys
                if (!names) {
                    Utils.log("ERROR: Key with keyCode " + evt.keyCode + " is undefined.");
                    return;
                }
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
                // catch unknown keys
                if (!names) {
                    Utils.log("ERROR: Key with keyCode " + evt.keyCode + " is undefined.");
                    return;
                }
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
             */
            updateCanvas = function () {
                if (Utils.isCocoonJs()) {
                    // assumes full screen
                    canvasScale.x = window.innerWidth / viewport.width;
                    canvasScale.y = window.innerHeight / viewport.height;
                } else {
                    // use offsetWidth and offsetHeight to determine visual size
                    canvasScale.x = canvas.offsetWidth / viewport.width;
                    canvasScale.y = canvas.offsetHeight / viewport.height;
                    // get the topleft position
                    offsetLeft = canvas.offsetLeft;
                    offsetTop = canvas.offsetTop;
                }
            },
            initMouseClicks = function () {
                if (!canvas || !canvas.addEventListener) {
                    return;
                }
                canvas.addEventListener('contextmenu', function (e) {
                    EventSystem.fire('mouseDown-right');
                    // prevent context menu
                    if (settings.preventContextMenu) {
                        e.preventDefault();
                    }
                }, false);
                canvas.addEventListener('click', function (e) {
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
             * Adds event listeners for connecting/disconnecting a gamepad
             */
            initGamepad = function () {
                window.addEventListener('gamepadconnected', gamepadConnected);
                window.addEventListener('gamepaddisconnected', gamepadDisconnected);
            },
            /**
             * Fired when the browser detects that a gamepad has been connected or the first time a button/axis of the gamepad is used.
             * Adds a pre-update loop check for gamepads and gamepad input
             * @param {GamepadEvent} evt
             */
            gamepadConnected = function (evt) {
                // check for button input before the regular update
                EventSystem.on('preUpdate', checkGamepad);

                console.log('Gamepad connected:', evt.gamepad);
            },
            /**
             * Fired when the browser detects that a gamepad has been disconnected.
             * Removes the reference to the gamepad
             * @param {GamepadEvent} evt
             */
            gamepadDisconnected = function (evt) {
                gamepad = undefined;

                // stop checking for button input
                EventSystem.off('preUpdate', checkGamepad);
            },
            /**
             * Gets a list of all gamepads and checks if any buttons are pressed.
             */
            checkGamepad = function () {
                var i = 0,
                    len = 0;

                // get gamepad every frame because Chrome doesn't store a reference to the gamepad's state
                gamepads = navigator.getGamepads ? navigator.getGamepads() : (navigator.webkitGetGamepads ? navigator.webkitGetGamepads() : []);
                for (i = 0, len = gamepads.length; i < len; ++i) {
                    if (gamepads[i]) {
                        gamepad = gamepads[i];
                    }
                }

                if (!gamepad)
                    return;

                // uses an array to check against the state of the buttons from the previous frame
                for (i = 0, len = gamepad.buttons.length; i < len; ++i) {
                    if (gamepad.buttons[i].pressed !== gamepadButtonsPressed[i]) {
                        if (gamepad.buttons[i].pressed) {
                            gamepadButtonDown(i);
                        } else {
                            gamepadButtonUp(i);
                        }
                    }
                }
            },
            gamepadButtonDown = function (id) {
                var i = 0,
                    names = Utils.gamepadMapping[id],
                    len = 0;

                // confusing name is used to keep the terminology similar to keyDown/keyUp
                EventSystem.fire('gamepadKeyDown', id);
                // save value in array
                gamepadButtonsPressed[id] = true;

                for (i = 0, len = names.length; i < len; ++i) {
                    gamepadButtonStates[names[i]] = true;
                    EventSystem.fire('gamepadButtonDown', names[i]);
                    EventSystem.fire('gamepadButtonDown-' + names[i]);
                }
            },
            gamepadButtonUp = function (id) {
                var i = 0,
                    names = Utils.gamepadMapping[id],
                    len = 0;

                // confusing name is used to keep the terminology similar to keyDown/keyUp
                EventSystem.fire('gamepadKeyUp', id);
                // save value in array
                gamepadButtonsPressed[id] = false;

                for (i = 0, len = names.length; i < len; ++i) {
                    gamepadButtonStates[names[i]] = false;
                    EventSystem.fire('gamepadButtonUp', names[i]);
                }
            },
            /**
             * Adds a check for input from the apple remote before every update. Only if on tvOS.
             *
             * Ejecta (at least in version 2.0) doesn't have event handlers for button input, so
             * continually checking for input is the only way for now.
             */
            initRemote = function () {
                var i = 0,
                    tvOSGamepads;

                if (window.ejecta) {
                    // get all connected gamepads
                    tvOSGamepads = navigator.getGamepads();
                    // find apple remote gamepad
                    for (i = 0; i < tvOSGamepads.length; ++i)
                        if (tvOSGamepads[i] && tvOSGamepads[i].profile === 'microGamepad')
                            remote = tvOSGamepads[i];

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
            },
            tvPointerDown = function (evt) {
                pointers.push({
                    id: evt.id,
                    position: evt.position,
                    eventType: evt.eventType,
                    localPosition: evt.localPosition,
                    worldPosition: evt.worldPosition
                });
                EventSystem.fire('tvPointerDown', evt);
            },
            tvPointerMove = function (evt) {
                EventSystem.fire('tvPointerMove', evt);
                updatePointer(evt);
            },
            tvPointerUp = function (evt) {
                EventSystem.fire('tvPointerUp', evt);
                removePointer(evt);
            },
            tvTouchStart = function (evt) {
                var id, i;
                evt.preventDefault();
                for (i = 0; i < evt.changedTouches.length; ++i) {
                    addTvTouchPosition(evt, i, 'start');
                    tvPointerDown(evt);
                }
            },
            tvTouchMove = function (evt) {
                var id, i;
                evt.preventDefault();
                for (i = 0; i < evt.changedTouches.length; ++i) {
                    addTvTouchPosition(evt, i, 'move');
                    tvPointerMove(evt);
                }
            },
            tvTouchEnd = function (evt) {
                var id, i;
                evt.preventDefault();
                for (i = 0; i < evt.changedTouches.length; ++i) {
                    addTvTouchPosition(evt, i, 'end');
                    tvPointerUp(evt);
                }
            },
            addTvTouchPosition = function (evt, n, type) {
                var touch = evt.changedTouches[n],
                    x = (touch.pageX - offsetLeft) / canvasScale.x + offsetLocal.x,
                    y = (touch.pageY - offsetTop) / canvasScale.y + offsetLocal.y,
                    startPos = {};

                evt.preventDefault();
                evt.id = 0;
                evt.eventType = 'tvtouch';
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
                        Utils.log("ERROR: touch startPosition was not defined");
                    }
                }
            };

        if (!gameData) {
            throw 'Supply a gameData object';
        }
        // canvasScale is needed to take css scaling into account
        canvasScale = gameData.canvasScale;
        canvas = gameData.canvas;
        viewport = gameData.viewport;

        // TODO: it's a bit tricky with order of event listeners
        if (canvas) {
            window.addEventListener('resize', updateCanvas, false);
            window.addEventListener('orientationchange', updateCanvas, false);
            updateCanvas();
        }

        // touch device
        initTouch();
        // keyboard
        initKeyboard();
        // init clicks
        initMouseClicks();
        // apple remote (only on tvOS)
        initRemote();
        // start listening for gamepads
        initGamepad();

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
             * @returns {Boolean} Returns true if the provided key is down.
             * @name isKeyDown
             */
            isKeyDown: function (name) {
                return keyStates[name] || false;
            },
            /**
             * Checks if any keyboard key is pressed
             * @function
             * @instance
             * @returns {Boolean} Returns true if any provided key is down.
             * @name isAnyKeyDown
             */
            isAnyKeyDown: function () {
                var state;

                for (state in keyStates)
                    if (keyStates[state])
                        return true;

                return false;
            },
            /**
             * Is the gamepad connected?
             * @function
             * @instance
             * @returns {Boolean} Returns true if gamepad is connected, false otherwise.
             * @name isGamepadButtonDown
             */
            isGamepadConnected: function () {
                if (gamepad)
                    return true;
                else
                    return false;
            },
            /**
             * Checks if a gamepad button is down
             * @function
             * @instance
             * @param {String} name - name of the button
             * @returns {Boolean} Returns true if the provided button is down.
             * @name isGamepadButtonDown
             */
            isGamepadButtonDown: function (name) {
                return gamepadButtonStates[name] || false;
            },
            /**
             * Checks if any gamepad button is pressed
             * @function
             * @instance
             * @returns {Boolean} Returns true if any button is down.
             * @name isAnyGamepadButtonDown
             */
            isAnyGamepadButtonDown: function () {
                var state;

                for (state in gamepadButtonStates)
                    if (gamepadButtonStates[state])
                        return true;

                return false;
            },
            /**
             * Returns the current float values of the x and y axes of left thumbstick
             * @function
             * @instance
             * @returns {Vector2} Values range from (-1, -1) in the top left to (1, 1) in the bottom right.
             * @name getGamepadAxesLeft
             */
            getGamepadAxesLeft: function () {
                return new Vector2(gamepad.axes[0], gamepad.axes[1]);
            },
            /**
             * Returns the current float values of the x and y axes of right thumbstick
             * @function
             * @instance
             * @returns {Vector2} Values range from (-1, -1) in the top left to (1, 1) in the bottom right.
             * @name getGamepadAxesRight
             */
            getGamepadAxesRight: function () {
                return new Vector2(gamepad.axes[2], gamepad.axes[3]);
            },
            /**
             * Checks if a remote button is down
             * @function
             * @instance
             * @param {String} name - name of the button
             * @returns {Boolean} Returns true if the provided button is down.
             * @name isRemoteButtonDown
             */
            isRemoteButtonDown: function (name) {
                return remoteButtonStates[name] || false;
            },
            /**
             * Defines if pressing 'menu' button will go back to Apple TV home screen
             * @function
             * @instance
             * @param {Boolean} Set to false if you want to assign custom behaviour for the 'menu' button
             * @name setRemoteExitOnMenuPress
             */
            setRemoteExitOnMenuPress: function (bool) {
                remote.exitOnMenuPress = bool;
            },
            /**
             * Returns the current float values of the x and y axes of the touch area
             * @function
             * @instance
             * @returns {Vector2} Values range from (-1, -1) in the top left to (1, 1) in the bottom right.
             * @name getRemoteAxes
             */
            getRemoteAxes: function () {
                return new Vector2(remote.axes[0], remote.axes[1]);
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
                if (window.ejecta) {
                    canvas.removeEventListener('tvtouchstart', tvTouchStart);
                    canvas.removeEventListener('tvtouchmove', tvTouchMove);
                    canvas.removeEventListener('tvtouchend', tvTouchEnd);
                }
                canvas.removeEventListener('touchstart', touchStart);
                canvas.removeEventListener('touchmove', touchMove);
                canvas.removeEventListener('touchend', touchEnd);
                canvas.removeEventListener('mousedown', mouseDown);
                canvas.removeEventListener('mousemove', mouseMove);
                if (settings.globalMouseUp) {
                    window.removeEventListener('mouseup', mouseUp);
                } else {
                    canvas.removeEventListener('mouseup', mouseUp);
                }

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
                if (window.ejecta) {
                    canvas.addEventListener('tvtouchstart', tvTouchStart);
                    canvas.addEventListener('tvtouchmove', tvTouchMove);
                    canvas.addEventListener('tvtouchend', tvTouchEnd);
                }
                canvas.addEventListener('touchstart', touchStart);
                canvas.addEventListener('touchmove', touchMove);
                canvas.addEventListener('touchend', touchEnd);
                canvas.addEventListener('mousedown', mouseDown);
                canvas.addEventListener('mousemove', mouseMove);
                if (settings.globalMouseUp) {
                    window.addEventListener('mouseup', mouseUp);
                } else {
                    canvas.addEventListener('mouseup', mouseUp);
                }

                isListening = true;
            },
            /**
             * Changes the offsets after resizing or screen re-orientation.
             * @function
             * @instance
             * @name updateCanvas
             */
            updateCanvas: updateCanvas,
            /**
             * Adds an offset to all pointer input
             * Note that this is in local space
             * @function
             * @instance
             * @param {Vector2} offset - Offset as Vector2
             * @name setOffset
             */
            setOffset: function (offset) {
                offsetLocal = offset;
            }
        };
    };
});