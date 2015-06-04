/*
 * Audio manager, will be rewritten in the future
 */

define('bento/managers/audio', [
    'bento/utils'
], function (Utils) {
    return function (bento) {
        var volume = 1,
            mutedSound = false,
            mutedMusic = false,
            preventSounds = false,
            howler,
            musicLoop = false,
            lastMusicPlayed = '',
            currentMusicId = 0,
            saveMuteSound,
            saveMuteMusic,
            assetManager = bento.assets,
            canvasElement = bento.getCanvas(),
            onVisibilityChanged = function (hidden) {
                if (hidden) {
                    // save audio preferences and mute
                    saveMuteSound = mutedSound;
                    saveMuteMusic = mutedMusic;
                    obj.muteMusic(true);
                    obj.muteSound(true);
                } else {
                    // reload audio preferences and replay music if necessary
                    mutedSound = saveMuteSound;
                    mutedMusic = saveMuteMusic;
                    obj.playMusic(lastMusicPlayed, musicLoop);
                }
            },
            obj = {
                /* Sets the volume (0 = minimum, 1 = maximum)
                 * @name setVolume
                 * @function
                 * @param {Number} value: the volume
                 * @param {String} name: name of the sound currently playing
                 */
                setVolume: function (value, name) {
                    assetManager.getAudio(name).volume(value);
                },
                /* Plays a sound
                 * @name playSound
                 * @function
                 * @param {String} name: name of the soundfile
                 */
                playSound: function (name) {
                    if (!mutedSound && !preventSounds) {
                        assetManager.getAudio(name).play();
                    }
                },
                stopSound: function (name) {
                    var i, l, node;
                    assetManager.getAudio(name).stop();
                },
                /* Plays a music
                 * @name playMusic
                 * @function
                 * @param {String} name: name of the soundfile
                 */
                playMusic: function (name, loop, onEnd, time) {
                    lastMusicPlayed = name;
                    if (Utils.isDefined(loop)) {
                        musicLoop = loop;
                    } else {
                        musicLoop = true;
                    }
                    // set end event
                    if (Utils.isCocoonJS() && onEnd) {
                        assetManager.getAudio(name)._audioNode[0].onended = onEnd;
                    }
                    if (!mutedMusic && lastMusicPlayed !== '') {
                        if (Utils.isCocoonJS()) {
                            assetManager.getAudio(name)._audioNode[0].currentTime = time || 0;
                            assetManager.getAudio(name)._audioNode[0].loop = musicLoop;
                            assetManager.getAudio(name)._audioNode[0].play();
                            return;
                        }
                        assetManager.getAudio(name).loop(musicLoop);
                        assetManager.getAudio(name).play(function (id) {
                            currentMusicId = id;
                        });
                    }
                },
                stopMusic: function (name) {
                    var i, l, node;
                    if (Utils.isCocoonJS()) {
                        assetManager.getAudio(name)._audioNode[0].pause();
                        return;
                    }
                    assetManager.getAudio(name).stop();
                },
                /* Mute or unmute all sound
                 * @name muteSound
                 * @function
                 * @param {Boolean} mute: whether to mute or not
                 */
                muteSound: function (mute) {
                    mutedSound = mute;
                    if (mutedSound) {
                        // we stop all sounds because setting volume is not supported on all devices
                        this.stopAllSound();
                    }
                },
                /* Mute or unmute all music
                 * @name muteMusic
                 * @function
                 * @param {Boolean} mute: whether to mute or not
                 */
                muteMusic: function (mute, continueMusic) {
                    var last = lastMusicPlayed;
                    mutedMusic = mute;

                    if (!Utils.isDefined(continueMusic)) {
                        continueMusic = false;
                    }
                    if (mutedMusic) {
                        obj.stopAllMusic();
                        lastMusicPlayed = last;
                    } else if (continueMusic && lastMusicPlayed !== '') {
                        obj.playMusic(lastMusicPlayed, musicLoop);
                    }
                },
                /* Stop all sound currently playing
                 * @name stopAllSound
                 * @function
                 */
                stopAllSound: function () {
                    var sound,
                        howls = assetManager.getAssets().audio;
                    for (sound in howls) {
                        if (howls.hasOwnProperty(sound) && sound.substring(0, 3) === 'sfx') {
                            howls[sound].stop();
                        }
                    }
                },
                /* Stop all sound currently playing
                 * @name stopAllSound
                 * @function
                 */
                stopAllMusic: function () {
                    var sound,
                        howls = assetManager.getAssets().audio;
                    for (sound in howls) {
                        if (howls.hasOwnProperty(sound) && sound.substring(0, 3) === 'bgm') {
                            if (Utils.isCocoonJS()) {
                                howls[sound]._audioNode[0].pause();
                                continue;
                            }
                            howls[sound].stop(sound === lastMusicPlayed ? currentMusicId : void(0));
                        }
                    }
                    lastMusicPlayed = '';
                },
                /* Prevents any sound from playing without interrupting current sounds
                 * @name preventSounds
                 * @function
                 */
                preventSounds: function (bool) {
                    preventSounds = bool;
                }
            };
        // https://developer.mozilla.org/en-US/docs/Web/Guide/User_experience/Using_the_Page_Visibility_API
        if ('hidden' in document) {
            document.addEventListener("visibilitychange", function () {
                onVisibilityChanged(document.hidden);
            }, false);
        } else if ('mozHidden' in document) {
            document.addEventListener("mozvisibilitychange", function () {
                onVisibilityChanged(document.mozHidden);
            }, false);
        } else if ('webkitHidden' in document) {
            document.addEventListener("webkitvisibilitychange", function () {
                onVisibilityChanged(document.webkitHidden);
            }, false);
        } else if ('msHidden' in document) {
            document.addEventListener("msvisibilitychange", function () {
                onVisibilityChanged(document.msHidden);
            }, false);
        } else if ('onpagehide' in window) {
            window.addEventListener('pagehide', function () {
                onVisibilityChanged(true);
            }, false);
            window.addEventListener('pageshow', function () {
                onVisibilityChanged(false);
            }, false);
        } else if ('onblur' in document) {
            window.addEventListener('blur', function () {
                onVisibilityChanged(true);
            }, false);
            window.addEventListener('focus', function () {
                onVisibilityChanged(false);
            }, false);
            visHandled = true;
        } else if ('onfocusout' in document) {
            window.addEventListener('focusout', function () {
                onVisibilityChanged(true);
            }, false);
            window.addEventListener('focusin', function () {
                onVisibilityChanged(false);
            }, false);
        }
        return obj;
    };
});