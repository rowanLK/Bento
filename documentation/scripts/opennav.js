(function () {
    var i,
        summary,
        summaries = document.getElementsByTagName('summary'),
        title = document.getElementsByClassName('page-title');
    if (title && title.length) {
        title = title[0];
    } else {
        return;
    }
    if (summaries && summaries.length) {
        for (i = 0; i < summaries.length; ++i) {
            summary = summaries[i];
            if (summary.innerHTML === title.innerHTML) {
                summary.parentElement.setAttribute('open', 'true');
            }
        }
    } else {
        return;
    }
})();