# Bento

Bento is a HTML5 Game Engine written in JavaScript, primarily aimed at the mobile environment (web and native apps). 

- Table of contents
  * [1. Getting started](#1-getting-started)
  * [2. RequireJS](#2-requirejs)
  * [3. Entities and Components](#3-entities-and-components)
    + [3.1 Entities](#31-entities)
    + [3.2 Components](#32-components)
    + [3.3 Parent-child relations](#33-parent-child-relations)
    + [3.4 Retrieving components](#34-retrieving-components)
  * [4. Bento Managers](#4-bento-managers)
    + [4.1 Asset Manager](#41-asset-manager)
      - [4.1.1 How assets are defined](#411-how-assets-are-defined)
      - [4.1.2 Automatic asset collecting](#412-automatic-asset-collecting)
      - [4.1.3 Getting assets](#413-getting-assets)
    + [4.2 Audio Manager](#42-audio-manager)
    + [4.3 Input Manager](#43-input-manager)
    + [4.5 Object Manager](#45-object-manager)
      - [4.5.1 Retrieving entities](#451-retrieving-entities)
    + [4.6 Savestate manager](#46-savestate-manager)
    + [4.7 Screen Manager](#47-screen-manager)
  * [5. Other Bento functionalities](#5-other-bento-functionalities)
    + [5.1 More about Sprites](#51-more-about-sprites)
    + [5.2 Collisions](#52-collisions)
    + [5.3 Scrolling](#53-scrolling)
    + [5.4 EventSystem](#54-eventsystem)

## 1. Getting started

Download the [Bento Empty Project template](https://github.com/LuckyKat/Bento-Empty-Project). 

To start the game, any browser will do. However, do keep in mind that every browser, [except Opera and Firefox](https://productforums.google.com/forum/#!msg/chrome/v177zA6LCKU/uQ8QZFD3pfcJ), will require a web server to be run locally on your computer. 

Recommended for programming is Sublime Text 3. You can use any editor you like, but we have [snippets](https://gist.github.com/HernanZh/d12d81cd2de72c735171e866f5236632) available which makes development much easier! 
Tip: also install [JSHint](https://github.com/uipoet/sublime-jshint)

You will also need to install Node.js in order to utilize the development scripts.


## 2. JavaScript knowledge

Bento uses ES5 version of JavaScript. Why ES5? Primarily to stay compatible with [cocoon.io](http://cocoon.io/).

Since module importing is introduced in ES6/ES2015, Bento uses RequireJS for modular programming. For a quick tutorial on RequireJS: [link](https://www.sitepoint.com/understanding-requirejs-for-effective-javascript-module-loading/)

Having a strong understanding of JavaScript is recommended. Trouble understanding JavaScript? A small guide about JavaScript for games is written [here](http://www.lucky-kat.com/javascript).

## 3. Entities and Components

### 3.1 Entities

Bento uses a entity + component structure (not to be confused with Entity-Component-System aka ECS). The entities are considered as game objects where you can attach components as behaviors or visuals. Entities have several transform properties which are directly editable:
* position (*Vector2*)
* scale (*Vector2*)
* rotation (*in radians*)
* alpha
* visible
* z-index (see *Object Manager*)

Declaring an entity does not make it appear in the game (unlike game engines such as Unity and Game Maker). You must attach the entity to the [Object Manager of Bento](https://luckykat.github.io/Bento/module-bento_managers_object.html), which is available as ``Bento.objects``:
```javascript
var entity = new Entity({
    name: 'myEntity',
    position: new Vector2(0, 0),
    components: []
    // ... etc
});

// add it to the game!
Bento.objects.attach(entity);
```

It is also worth noting that Bento often uses object literals as parameters.

### 3.2 Components

Bento comes with several premade components you can attach. Particularly the [Sprite](https://luckykat.github.io/Bento/module-bento_components_sprite.html) and [Clickable](https://luckykat.github.io/Bento/module-bento_components_clickable.html) components are very common.
You will end up writing your own components for behaviors. A component can be anything. For example, an object literal:
```javascript
var component = {
    name: 'myComponent',
    start: function (data) {},
    destroy: function (data) {},
    update: function (data) {},
    draw: function (data) {}
};

entity.attach(component);
```

Or a prototype object:
```javascript
var Component = function () {
    this.name = 'myComponent';
};
Component.prototype.update = function (data) {};
Component.prototype.draw = function (data) {};
// etc...

var component = new Component();
entity.attach(component);
```

Anything goes, even the update and draw functions are optional. 
Typically, components have the following functions:
 * ``start``: called when the component goes "live" in the game, the start function is guaranteed to be called when the entity is attached to the game, even if the component is attached later.
 * ``destroy``: called when the component is removed from the game (opposite of ``start``)
 * ``update``: called every tick (guaranteed 60 times per second)
 * ``draw``: called every tick, after the update loop (60fps if possible)
 * ``postDraw``: called every tick, after the draw loop, in reverse order
 * ``attached``: called when component is attached to entity
 * ``removed``: called when component is removed from entity (opposite of ``attached``)

All of these pass ``data`` as parameter. The data object has a reference to the parent entity, renderer, viewport etc (see [Bento.getGameData](https://luckykat.github.io/Bento/module-bento.html#getGameData)). 

The order of these functions is simply the order of components. The entity keeps an array and loops through this, calling update and draw in the process. An exception is postDraw, this is called in reverse order of components (this allows you to untransform anything you did in ``draw`` in reverse order).

### 3.3 Parent-child relations

The line between entity and component is blurry. Just like components, the entity implements the following functions: start, destroy, update, draw etc. The entity forms a container and calls the same functions on its components. 
In fact, it is perfectly possible to attach entities to other entities. Doing so creates a parent child relation and the attached entity could be considered a component. Child entities transform with the parent entity (moving, scaling and rotating). 

### 3.4 Retrieving components

To get a component, use [entity.getComponent](https://luckykat.github.io/Bento/module-bento_entity.html#getComponent) (even if the component is an entity). You must reference the component by its name. It is very much recommended that you assign a name property to every component, or it will be difficult to get them again outside the context you created them.

## 4. Bento Managers

We already saw a glimpse of one of the managers: the Object Manager. This manager is used to attach entities to the game and is accessed through ``Bento.objects``. We will go into more detail of these managers.

### 4.1 Asset Manager

Access this through ``Bento.assets``. Loading assets is primarily done in the preloading stage, but for mobile environments and memory usage considerations, the manager allows assets to be loaded and unloaded at the developer's discretion. The following asset types are supported:

* audio (ogg and mp3 recommended)
* images (png recommended)
* json
* fonts (ttf)
* spritesheets (see [5.1 More about Sprites](#51-more-about-sprites))

#### 4.1.1 How assets are defined

Assets are defined in ``assets.json`` and is located in the root of the game folder (next to ``index.html``). The assets themselves are located in the ``./assets/`` folder. Bento will always try to read this during initialization.

For the purpose of loading and unloading, assets are always split into groups. A group in the assets folder is a folder in ``./assets/``. This apppears ``assets.json`` as the object literal in the root object. **You may name asset groups anything you like**.

A group is then split into its types: audio, images, json etc. For example an image would reside in ``./assets/group/images/my-image.png``. Dividing the assets into further folders is okay.

#### 4.1.2 Automatic asset collecting

The ``assets.json`` won't need to be managed by hand. A useful script is available by running ``gulp collector``. Any asset that is added into the assets folder will automatically update assets.json while the script is running.

(Note: make sure to have Node.js installed, have gulp globally installed with ``npm install -g gulp`` and use ``npm install`` to install script dependencies).

#### 4.1.3 Getting assets

Assets can be retrieved by [Bento.assets](https://luckykat.github.io/Bento/module-bento_managers_asset.html). Each asset has to be referenced by an alias name. This alias is defined in ``assets.json``. The collector script chooses the alias as follows:

**The alias of an asset is the asset path without the groupname and asset type.**

For example an image with path ``./assets/gui-group/images/gui/button.png`` would be retrieved by ``var image = Bento.assets.getImage('gui/button')``.

Not including the groupname and asset type is a feature that allows you to freely move assets between groups, without having to adjust the code.


### 4.2 Audio Manager

Used to play sounds and music. (*Note: this manager is on the chopping block, to be replaced by a Sound Manager and Music Manager*)
Use [Bento.audio](https://luckykat.github.io/Bento/module-bento_managers_audio.html) to play sound and music. 

**In order to differentiate sounds and music, the audio assets must be prefixed with sfx_ and bgm_**

### 4.3 Input Manager

This manager takes control of game input (touch, mouse and keyboard). For touch input you won't need to interact with this manager, but use the [Clickable](https://luckykat.github.io/Bento/module-bento_components_clickable.html) component instead. Take a close look at the callback functions!

### 4.5 Object Manager

The object manager is used to keep track of all entities attached to games. It calls update and draw of each entity, much like an entity itself but with an important difference: Entities are ordered by z-index at all time (ordered from low to high).

Just so you know, just like components, you may attach anything with the attach function. It doesn't really matter if it's Entities or plain object literals.

#### 4.5.1 Retrieving entities

Entities can be retrieved by the Object manager at any times using [Bento.objects.get](https://luckykat.github.io/Bento/module-bento_managers_object.html#get) and [Bento.objects.getByName](https://luckykat.github.io/Bento/module-bento_managers_object.html#getByName).

Another way of retrieving entities is by [family](https://luckykat.github.io/Bento/module-bento_managers_object.html#getByFamily). Entities are grouped by families. You can assign multiple families to an entity.

Note that all these methods only apply to entities that were attached with ``Bento.objects.attach``. To retrieve child entities, first get their parent and make subsequent getComponent calls.

### 4.6 Savestate manager

The savestate manager is just a wrapper around localStorage. Use ``Bento.saveState.save('key', value)`` to save a value and ``Bento.saveState.load('key', defaultValue)`` to load a value. (defaultValue is returned if the key does not exist)

### 4.7 Screen Manager

The screen manager helps with loading and unloading "screens". A screen could be seen as a level in a game.

You define a [screen](https://luckykat.github.io/Bento/module-bento_screen.html) as any RequireJS module (use the screen snippet!). Use [Bento.screens.show](https://luckykat.github.io/Bento/module-bento_screen.html) to jump between screens. *Note: because this work through RequireJS, jumping between screens is asynchronous.*

In the Bento Empty Project template you can see the game starts up by going into ``screens/preloader``  first, where the user waits for assets to be loaded and then goes into ``screens/main`` where the main game starts.

## 5. Other Bento functionalities

### 5.1 More about Sprites

The Sprite component is a commonly used component. 

Please note that the Sprite component is currently undergoing a bit of change (in the sense that it's starting to look more like GameMaker's definition of sprites). 

The Sprite component draws an image that is composed as a spritesheet, allowing animations. There are 2 ways to define a sprite: from an image asset or from a spritesheet asset.

#### 5.1.1 Using images as sprites (old method)

When drawing sprites from images, it is assumed the image is set up as a spritesheet and is divided with constant width and height. 
If the image is a simple one with only "1 frame of animation", a sprite can be defined very quick:

```javascript
var sprite = new Sprite({
    imageName: 'myImage'
});
```

An example of an image with multiple frames and multiple animations:

![image](http://2.1m.yt/20k7CI4.png)

```javascript
var sprite = new Sprite({
    imageName: 'players/bunny',
    frameCountX: 4,
    frameCountY: 4,
    animations: {
        idle: {
            speed: 0.1,
            frames: [0, 10, 11, 12]
        },
        walk: {
            speed: 0.2,
            frames: [4, 5, 6, 7, 8, 9]
        },
        jump: {
            frames: [1]
        },
        death: {
            frames: [2]
        },
        brake: {
            frames: [3]
        }
    }
});
```
As you can see, you pass data to the Sprite component that defines how the spritesheet is formed and what frames form an animation.

### 5.1.2 Using spritesheet assets (new method)

The spritesheet asset is basically the same as the above method, however a spritesheet asset is composed of 2 individual elements: an image and the JSON data that defines the sprite. Both of these must be kept in the same directory in the assets folder (under the type spritesheets). To keep things simple, a spritesheet must only have 1 animation.

Defining a sprite with a spritesheet is simple:
```javascript
var sprite = new Sprite({
    spriteSheet: 'mySpriteSheetAsset'
});
```

To switch animation, one must switch spritesheets by using ``sprite.setSpriteSheet('otherSpriteSheet')``.

**Tools to generate spritesheets are currently in development**

(TODO: link to gif2sprite tool)

### 5.2 Collisions

[Entity.collidesWith](https://luckykat.github.io/Bento/module-bento_entity.html#collidesWith) implements an AABB collision check with other entities or families. 

Considerations for performance: collidesWith is a sort of "brute force method". It is somewhat restrained by only comparing collisions between families of entities. You may need to implement extra methods for improved performance, such as hasgrids or quadtrees. From my experience, a simple hashgrid for non-moving objects is very effective. If the object count is low, collidesWith performs fine.
(TODO: bento hashgrid example)

You may be also considering to implement a physics engine, such as Box2D. Just be wary of performance of these engines on mobile browsers!
(TODO: show bento-Box2D implementation example)

### 5.3 Scrolling

In order to scroll through levels, it is recommended to change viewport.x and viewport.y. See [Bento.getViewport](https://luckykat.github.io/Bento/module-bento.html#getViewport)

### 5.4 EventSystem

Bento uses an internal eventsystem that can also be used for the developers to fire custom events. Here is an example of a component that catches a custom event:

```javascript
var component = {
    name: 'eventListener',
    onEvent: function (eventData) {
        /* your event callback */
    },
    start: function () {
        // start listening to events when entity is added
        EventSystem.on('myCustomEvent', component.onEvent);
    },
    destroy: function () {
        // this cleans up the event listener when the entity is removed
        EventSystem.off('myCustomEvent', component.onEvent);
    }
};

// somewhere else in the code
var eventData = {}; // optional
EventSystem.fire('myCustomEvent', eventData);
```

(TODO: list all of Bento's fired event)