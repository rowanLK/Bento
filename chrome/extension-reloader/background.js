chrome.browserAction.onClicked.addListener(function (tab) {
    var actualCode = "bento.require([\"bento\"], function (Bento) {" +
        "Bento.reload();" +
        "})";
    chrome.tabs.getSelected(null, function (tab) {
        chrome.tabs.executeScript(tab.id, {
            code: "var script = document.createElement('script');" +
                "script.textContent = '" + actualCode +"';" +
                "(document.head||document.documentElement).appendChild(script);" +
                "script.parentNode.removeChild(script);"
        }, function (response) {

        });
    });

});