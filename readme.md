## Bento Javascript Game Engine

Bento is a modular, component based Javascript game engine. 

## Installation

Use `npm install`. Also install bower and use `bower install`. To build the engine, use the `gulp` command. If you don't want to build you can also just get bento.js from the build folder.

## How to use

Please refer to [this tutorial](http://www.lucky-kat.com/bento).

## API Reference

Please refer to the documentation hosted on the Lucky Kat [bitbucket page](http://luckykat.bitbucket.org/).

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
## Acknowledgement

Bento has the following dependencies:
* Require.js by jrburke
* gl-sprites by mattdesl
* Audia by richaur (AMD implementation by sprky0)
* hshg by kirbysayshi

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