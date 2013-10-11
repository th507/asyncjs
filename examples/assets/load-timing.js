window.onload = function() {
    try {
        timing = performance.timing;
        dr = timing.domContentLoadedEventEnd - timing.navigationStart;
        log("DOMContentReady fires at: " + Date.now());
        log(", " + timing.domContentLoadedEventEnd + " (Timing API)");


        log("<hr>");

        log("<strong>Time Elapsed:</strong><br>");

        log("to domContentLoaded: " + dr + " ms<br>");

        setTimeout(function() {
            try {
                ld = timing.loadEventEnd - timing.navigationStart;
                log("to load: " + ld + " ms<br>");
            } catch(e) {}
        }, 200);
    } catch(e) {}
};
