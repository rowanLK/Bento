## Bento Javascript Game Engine

Bento is a modular, component based Javascript game engine. 

## Code Example

Better examples can be found in the examples folder.

```javascript
// Start with a bento.require call
bento.require([
    'bento',
    'bento/math/vector2',
    'bento/math/rectangle',
    'bento/entity'
], function (
    Bento,
    Vector2,
    Rectangle,
    Entity
) {
    'use strict';

    // Start up Bento game engine
    Bento.setup({
        // points to a canvas element
        canvasId: 'canvas',
        // resizes the canvas
        canvasDimension: Rectangle(0, 0, 640, 480),
        // specify your assets in a json file
        assetGroups: {
            'assets': 'assets/assets.json'
        },
        // automatically chooses renderer (canvas2d or webgl)
        renderer: 'auto'
    }, function () {
        // Ready to load assets (You could add a loader screen here)
        console.log('Bento ready');

        // Start loading assets
        Bento.assets.load('assets', function (err) {            
            console.log('Start game');

            /* Your game code here */

        }, function (current, total) {
            // Loader
            console.log('Loading asset ' + current + '/' + total);
        });
    });
});
```

## Motivation

A short description of the motivation behind the creation and maintenance of the project. This should explain **why** the project exists.

## Installation

Provide code examples and explanations of how to get the project.

## Getting Started

## To do

* Improve documentation
* Seperate more components from the Entity module (remove some of its bulkiness)
* Add Pixi.js as renderer


## API Reference

(Link to documentation)

## License

The MIT License (MIT)

Copyright (c) 2015 Lucky Kat

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.