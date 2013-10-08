window.onload = function() {
    try {
        timing = performance.timing;
        dr = timing.domContentLoadedEventEnd - timing.navigationStart;
        document.body.innerHTML += ("DOMContentReady fires at: " + Date.now());
        document.body.innerHTML += ", " + timing.domContentLoadedEventEnd + " (Timing API)<br>";


        document.body.innerHTML += "<hr>";

        document.body.innerHTML += "<strong>Time Elapsed:</strong><br>";

        document.body.innerHTML += ("to domContentLoaded: " + dr + " ms<br>") ;

        setTimeout(function() {
            try {
                ld = timing.loadEventEnd - timing.navigationStart;
                document.body.innerHTML += ("to load: " + ld + " ms<br>");
            } catch(e) {}
        }, 200);
    } catch(e) {}
};
