# asyncJS - Slightly Deferent JavaScript loader and dependency manager

[![Continuous Integration status](https://secure.travis-ci.org/th507/asyncjs.png)](http://travis-ci.org/th507/asyncjs)

`asyncJS` is a slightly deferent JavaScript loader and dependency manager for browsers. Unlike many other script loaders, asyncJS can asynchronously load inline functions and script strings as well as external JavaScript files. 

`asyncJS` uses a Defer-like queue to keep track of tasks, allowing you to append additional tasks, attaching extra callbacks, and handling error inside callbacks, making it a more versatile and robust solution for complex dependency management.

# Why
I use [script.js](https://github.com/ded/script.js/) for my last project. I love the idea of lazy loading script, but I'm not a big fan of this laconic coding style (semicolon is a rare commodity in this case), and its awkward syntax for nested dependency. 

That's why I created `asyncJS`.

Comparing to script.js and other script loader, the advantages of `asyncJS` are

* support inline function and text string as JavaScript
* handle error of the dependency queue
* better looking syntax
* painlessly add async/sync task current queue (due to Defer-like design)
* better nested dependency management

# Download

Latest version is 0.4.0

* [Developement](https://raw.github.com/th507/asyncjs/master/lib/asyncjs.js) 12KB Uncompressed
* [Production](https://raw.github.com/th507/asyncjs/master/dist/asyncjs.min.js) 1.08KB Minified and gziped


# Browser Support
Tested on

* IE 8+
* Opera 15+
* Safari 5+
* Chrome 30+
* Firefox 27+

It should work on older browsers, but I can't find any legacy browser around me at the time. I will update the support sheet after I test it on more browsers.

# Example

### Old way
 Inline script evaluation blocks following script, and external script blocks `DOMContentReady`

````html
<script>
	// this could take quite some time to process
	var data = computation();
</script>
<script src="jquery.js"></script>
<script src="high-chart.js"></script>
<script>
	new HighChart(data, ...);
</script>
````


### Better
External script is non-blocking, but inline script evaluation are still blocking.

````javascript
// this could take quite some time to process
var data = computation();

asyncJS("jquery.js", function() {
	asyncJS("high-chart.js", function() {
		new HighChart(data, ...);
	}]);
});
````

### Best
Neither inline nor external scripts are blocking, all JavaScript code load asynchronously.

````javascript
var data;

// q is chain-able
var q = asyncJS();

// async evaluate time-consuming computation
q.add(function() { data = computation(); });

q.add(["jquery.js", "highchart-standalone.js"]);

q.whenDone(function() {
	new HighChart(data, ...);
});
````

Or use `then` when dealing with strict dependencies

````javascript
var q = asyncJS();

q.add("jquery.js");

q.whenDone(function() {
	// jQuery is ready
});

// bootstrap will start to load after jquery is loaded
q.then("bootstrap.js");

q.whenDone(function() {
	// jQuery AND bootstrap are ready
});
````

# API

### asyncJS(task[, callback])
Add one or more tasks to the asynchronous loading queue. Returns the queue.

````javascript
// accepts a single task
asyncJS("jquery.js")

// accepts multiple tasks
asyncJS(["jquery.js", "high-chart.js"])

// accepts script string
// and inline function
asyncJS([
	"function() { console.log(1); }",
	function() { console.log(2); },
	"jquery.js"
])
````
	
### asyncJS#add(tasks)
Add one or more tasks to the asynchronous loading queue and returns the queue. Note that `add` does not guarantee that added function is executed after the previous task. For sequential execution, use [async#addSync](#addSync) instead.

````javascript
var q = asyncJS("jquery.js");
q.add("high-chart.js");
````

### asyncJS#addSync(tasks)[](id:addSync)
Alias of [`then`](#then)

### asyncJS#then(tasks)[](id:then)
Add one or more **synchronous** tasks to the loading queue, and returns the queue. `then` guarantee that added function is executed after the previous task.

````javascript
var q = asyncJS("jquery.js");

// tasks added by then will be executed when
// all previous tasks have been completed
q.then("bootstrap.js");
````

`then` will not block previous callbacks execution, but it will block all  following `whenDone` functions until `then` tasks have finished.


### asyncJS#whenDone(callback)[](id:whenDone)
Add callback to execute when all **previous** tasks are finished. `taskIndex` is the index of the last finished task, while `queue` is the current loading queue and `error` the accumulative errors in execution.

````javascript
var q = asyncJS("jquery.js");

q.whenDone(function(queue, taskIndex, errors) {
	// queue is the current loading queue
	// taskIndex is the index of last finished task
	// errors is the accumulative errors in execution
})
````

** Manipulate queue/q inside `whenDone` might crash the page.**

For example, calling `queue.add(…)` inside `whenDone`  will cause an infinite loop of re-adding the task after the same task is add and executed, which will eventually bring down the entire page.

In practice, never change the queue/q inside callback. Use `addSync` if you would like to add a dependent task.
 
# Build
AsyncJS can be minified with Google Closure Compiler using advanced optimization (with a few warnings due to the `factory` method). Or it could be minified with UglifyJS2 by

````bash
$ npm install
$ npm run-script build
````

# Tests
### With PhantomJS

````bash
$ npm install
$ npm test
````

### With Browser

Open `test/index.html` in your browser.

# License

Copyright (c) 2013 Jingwei "John" Liu

Licensed under the MIT license.
