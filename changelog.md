# Changelog

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
* Added **Bento.assets.forceHtml5Audio**, call this before the assets are loaded.
* The AMD-less version of Bento now loads modules on demand (instead of doing that all beforehand). This behavior is more similar to RequireJS and is able to catch circular dependencies.
* Updated snippets
