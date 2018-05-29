/**
 * Component that listens to an event fired by the EventSystem.
 * Automatically stops listening if the entity is destroyed or if the component is removed
 * <br>Exports: Constructor
 * @module bento/components/eventlistener
 * @moduleName EventListener
 * @snippet EventListener.snippet
EventListener({
    name: '${1:eventListener}',
    eventName: '${2:eventName}',
    ignorePause: ${3:false},
    onEvent: function (data) {
        $4
    }
})
 * @param {Object} settings - Settings
 * @param {String} settings.name - Component name, defaults to 'eventListener'
 * @param {String} settings.eventName - Event name to listen to
 * @param {Boolean} settings.ignorePause - Listen to events even if entity is paused
 * @param {Function} settings.onEvent - Event callback
 */
bento.define('bento/components/eventlistener', [
    'bento',
    'bento/math/vector2',
    'bento/math/rectangle',
    'bento/entity',
    'bento/eventsystem',
    'bento/utils',
    'bento/tween'
], function (
    Bento,
    Vector2,
    Rectangle,
    Entity,
    EventSystem,
    Utils,
    Tween
) {
    'use strict';
    var isPaused = function (entity) {
        var rootPause = 0;
        if (!Bento.objects || !entity) {
            return false;
        }
        rootPause = entity.updateWhenPaused;
        // find root parent
        while (entity.parent) {
            entity = entity.parent;
            rootPause = entity.updateWhenPaused;
        }

        return rootPause < Bento.objects.isPaused();
    };
    return function (settings) {
        var viewport = Bento.getViewport();
        var componentName = settings.name || 'eventListener';
        var eventName = settings.eventName;
        var ignorePause = settings.ignorePause || false;
        var onEvent = settings.callback || settings.onEvent || function () {};
        var entity;
        var component = {
            name: componentName,
            start: function (data) {
                if (!eventName) {
                    Utils.log('WARNING: eventName is not defined! Using component name as event name');
                    eventName = componentName;
                }
                EventSystem.on(eventName, ignorePause ? onEvent : wrapperCallback);
            },
            destroy: function (data) {
                EventSystem.off(eventName, ignorePause ? onEvent : wrapperCallback);
            },
            attached: function (data) {
                entity = data.entity;
            }
        };
        // this callback is used when event listener can pause
        var wrapperCallback = function (data) {
            if (!isPaused(entity)) {
                onEvent(data);
            }
        };
        return component;
    };
});