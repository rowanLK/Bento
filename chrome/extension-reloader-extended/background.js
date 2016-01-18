var execute = function (actualCode) {
    chrome.tabs.getSelected(null, function (tab) {
        chrome.tabs.executeScript(tab.id, {
            code: "var script = document.createElement('script');" +
                "script.textContent = '" + actualCode + "';" +
                "(document.head||document.documentElement).appendChild(script);" +
                "script.parentNode.removeChild(script);"
        }, function (response) {

        });
    });
}

window.reload = function () {
    var actualCode = "bento.require([\"bento\"], function (Bento) {" +
        "Bento.reload();" +
        "})";
    execute();
});

window.reloadAssets = function () {
    var actualCode = "bento.require([\"bento\"], function (Bento) {" +
        "Bento.assets.reload(Bento.reload);" +
        "})";
    execute();
});

window.jump = function () {
    var actualCode = "bento.require([\"bento\"], function (Bento) {" +
        "var res = prompt('Show which screen?');" +
        "Bento.screens.show(res);" +
        "})";
    execute();
});