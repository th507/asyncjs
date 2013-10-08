function log(msg, pre) {
	if (!msg) return;
	try {
		if (pre) msg = "<pre>" + msg + "</pre>";
		document.body.innerHTML += msg + "<br>";
	} catch(e) {
		try {
            console.log(msg);
        } catch(e) {
            alert(msg);
        }
	}
}

// for morbid browsers
if (typeof Date.now !== "function") {
    Date.now = function() { return (new Date()).getTime(); }
}

var begin = Date.now();

function from() {
    return Date.now() - begin;
}

function sleep(delay) {
    var start = Date.now();
    while (Date.now() < start + delay);
}
