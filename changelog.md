# Changelog

## 1.2.0
* Allow external assets to be loaded
* Option to cache Tiled canvasses
* Tile loop is skipped if there is no onTile callback in Tiled, improves performance.
* Transform component and canvas2d renderer refactored: *save* and *restore* no longer calls the internal 2d context save and restore. Instead it saves the current transform matrix. The Transform component keeps track of a local and world transform matrix. Note that these aren't optimally used yet (can improve toWorldPosition and toLocalPosition)
* Re-ordered the properties of Entity. This way the name will show up on top if entities are logged.
* Page visibility can be ignored in the audio manager
* Bento now has an option called **antiAlias** (was called *smoothing* before). Note that anti-aliasing works differently in Cocoon/Pixi, where the option applies to images/textures the moment they are loaded. The same parameter can be passed to Text modules, as these create internal canvasses (textures).
* The **Text** modules creates an internal canvas during start instead of during the constructor. Text.generateOnConstructor is added for legacy purposes (false by default)
* Fixed a bug where **Bento.assets.hasAsset** did not apply for images that were texture-packed
* Option to *"compact-build"* games (see Bento Empty Project). A compact build inlines all assets into a single HTML file. 
* Related to compact builds: assets.json itself can be inlined as javascript with window.assetsJson. This can optionally be represented as an LZString-compressed string.
* **Tweens** are no longer Entities, for improved performance. Tweens as Entities was an uncommon feature, where you could attach components to tweens as well. Instead, if you want tweens inside Entities, **Tween.TweenBehavior** can be called as constructor which acts as a component.
* **Bento.objects.timer** and **Bento.objects.ticker** where timer is affected by game speed.
* Warnings will be logged when the *name* property is not set in Entities and components. Not setting the name is considered bad practice, as there is no way to retrieve the Entity or component without a name.
* Added static functions **Vector2.copyInto(source, target)**, **Vector2.fromRotation(angle, length)** and static properties **Vector2.up**, **Vector2.down**, **Vector2.left**, **Vector2.right**. As well as **Rectangle.copyInto(source, target)**. The *copyInto* functions are also avaible as member functions.
* Option to auto-throttle gamespeed (**autoThrottle**), useful for deltaT enabled games. When turned on, the internal gamespeed automatically adjusted when the game goes below 60fps. Speeds are adjusted down to 20fps (to ignore huge time steps). *Bento.setGameSpeed()* is still relevant, as data.speed is represented as the multiplication of the throttle speed (*Bento.objects.throttle*) and game speed (*Bento.getGameSpeed()*).

## 1.1.0
* Starting a changelog.... finally
* New component: **Modal** pauses everything except the parent entity, great for popups and UI
* New component: **EventListener** Instead of using EventSystem.on and EventSystem.off, this component binds a listeners automatically, with its lifetime of the parent entity. It can also pause the listener if the entity itself is paused.  
* New component: **Spine** Note: Implemented for Canvas2D only. It's function are sort of similar to Sprite.
* New GUI module: **ScrollingList** A list of items that can be scrolled using touch input.
* New GUI module: **CenteredList** A list of items that that are spaced equally.
* Fixed getWorldPosition and toWorldPosition (notable when one of the parent entities was scaled or rotated)
* Fixed overlapping ClickButtons intercepting a click even though one of them is inactive
* Added *active* property to ClickButtons. It was quite confusing that a ClickButton could use a *visible* property but it's active state was using a *setActive* method.
* Clickbutton is allowed again to have *frameCountX: 1* and *frameCountY: 1* again. In that case, the up, down and inactive sprite frames all use frame 0.
* The Entity.collidesWith *withComponent* parameter is removed.
* Static **Text.disposeCanvas** member to dispose the internal canvas on destroy (dispose is a cocoon feature)
* Tiled has an additional *cacheModules* setting, which will cache RequireJS and will be able to synchronously call modules if they were loaded before. Use the *clearCache* method to delete the cache.
* Tiled's *onSpawn* includes a *properties* key.
* Tiled's *onLayer* and *onSpawn* callback include a layer index parameter. 
* Added **buttonUp-\<key\>** events, fired by the input manager. There were *buttonDown-\<key\>* events before, but no equivalent buttonUp events.
* Tiled and Bento.assets can load synchronously. (Needed for native version of Bento)
* Tween no longer overwrites the entity functions, instead the tween is a behavior attached to the entity.
* Added **Bento.assets.forceHtml5Audio**, call this before the assets are loaded.
* The AMD-less version of Bento now loads modules on demand (instead of doing that all beforehand). This behavior is more similar to RequireJS and is able to catch circular dependencies.
* Unlisted Entity.family and Entity.components as members of Entity. It is now considered bad practice to interact with these arrays. (May need to add new functions, for example to get the sizes of these arrays etc.)
* Updated snippets
