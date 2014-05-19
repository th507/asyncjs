# asyncJS - Slightly Deferent JavaScript loader and dependency manager

[![Continuous Integration status](https://secure.travis-ci.org/th507/asyncjs.png)](http://travis-ci.org/th507/asyncjs)
[![NPM version](https://badge.fury.io/js/async-js.png)](http://badge.fury.io/js/async-js)

`asyncJS` is a slightly deferent JavaScript loader and dependency manager for browsers. Unlike many other script loaders, asyncJS can asynchronously load inline functions and script strings as well as external JavaScript files. 

`asyncJS` uses a Defer-like queue to keep track of tasks, allowing you to append additional tasks, attaching extra callbacks, and handling error inside callbacks, making it a more versatile and robust solution for complex dependency management.

# Why
I use [script.js](https://github.com/ded/script.js/) for my last project. I love the idea of lazy loading script, but I'm not a big fan of the laconic coding style and its awkward syntax for nested dependency. 

That's why I created `asyncJS`.

Comparing to script.js and other script loader, the advantages of `asyncJS` are

* support inline function and text string as JavaScript
* support asynchronous functions (such as AJAX request) with Defer-like `resolver`
* handle error of the dependency queue
* better looking, chaining syntax
* painlessly add async/sync task current queue (due to Defer-like design)
* better nested dependency management

Just like Promise, requesting AJAX content and loading external scripts are carried out in parallel. When `asyncJS` finishes all pending tasks, you could just parse the content and present your content to users with a shorter waiting period.

Read about [why asyncJS improves performance](http://ljw.me/2013/10/20/asyncjs.html) (in Chinese) on my blog.

# Download

Latest version is 0.7.7

### With npm
````bash
$ npm install async-js
````

### Direct Link

Inline `asyncJS` yields better performance.

* [**Developement**](https://raw.github.com/th507/asyncjs/master/lib/asyncjs.js) 15KB Uncompressed
* [**Production**](https://raw.github.com/th507/asyncjs/master/dist/asyncjs.min.js) 1.41KB Minified and gziped


# Browser Support
Tested on

* IE 6+
* Opera 15+
* Safari 5+
* Chrome 30+
* Firefox 3.6.28+

Test might fail in IE < 8, that is testing framework failing, not asyncjs. Examples run fine. However, `ConnectionError` is **NOT** catched in IE.

# Example

### Old way
 Inline script evaluation blocks following script, and external script blocks `DOMContentLoaded`

````html
<script>
	// this could take quite some time to process
	var data = computation();
</script>
<script src="jquery.js"></script>
<script src="foo.js"></script>
<script>
	// do something with data, $, and foo.js
</script>
````


### Better
External script is non-blocking, but inline script evaluation are still blocking.

````javascript
// this could take quite some time to process
var data = computation();

asyncJS("jquery.js", function() {
	asyncJS("foo.js", function() {
		// do something with data, $, and foo.js
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

q.add(["jquery.js", "foo.js"]);

q.whenDone(function() {
	// do something with data, $, and foo.js
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
asyncJS(["jquery.js", "foo.js"])

// accepts script string
// and inline function
asyncJS([
	"function() { console.log(1); }",
	function() { console.log(2); },
	"jquery.js"
])
````
	
### asyncJS#add(tasks)
Add non-blocking tasks. It supports external URL, inline function and text string as JavaScript.

Note that `add` does not guarantee that added function is executed after the previous task. For sequential execution, use [async#addSync](#addSync) instead.

When adding asynchronous function, call `resolver.resolve` when data is ready.

Use `AsyncQueue#add(fn, name)` to add an asynchronous function to the queue and restore its return value in q.data[name].

#### For URL, text string or synchronous function:

````javascript
var q = asyncJS("jquery.js");
q.add("foo.js");
q.add(function() {
	// synchronous function
})
````

#### For asynchronous function:

````javascript
// adding an async function
q.add(function(resolver) {
	setTimeout(function() {
		// when asyn function finished
		// value is stored in q.data[name]
		resolver.resolve(value);
		
		// when things go south
		resolver.reject(error);
	}, 5);
}, "timeout");

// using returned values
q.whenDone(function(data) {
	// using previously returned value
	var value = data.timeout;
})
````

### asyncJS#then(tasks)[](id:then)
Add **blocking** tasks.

 `then` guarantee that added function is executed after the previous task.

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

q.whenDone(function(data, taskIndex, errors) {
	// data is the accumulative returned values of current loading queue
	// taskIndex is the index of last finished task
	// errors is the accumulative errors in execution
})
````

**Manipulate queue/q inside `whenDone` might crash the page.**

For example, calling `queue.add(…)` inside `whenDone`  will cause an infinite loop of re-adding the task after the same task is add and executed, which will eventually bring down the entire page.

In practice, never change the queue/q inside callback. Use `addSync` if you would like to add a dependent task.
 
# Build
AsyncJS can be minified with Google Closure Compiler using advanced optimization if externs are provided in compilation. Or it could be minified with UglifyJS2 by

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
