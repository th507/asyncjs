/**
 * Async JavaScript Loader
 * https://github.com/th507/asyncJS
 *
 * Slightly Deferent JavaScript loader and dependency manager
 *
 * @author Jingwei "John" Liu <liujingwei@gmail.com>
 */

(function(name, context) {
    /*jshint plusplus:false, curly:false, bitwise:false, laxbreak:true*/
    "use strict";

    // some useful shims and variables
    var dataURIPrefix = "data:application/javascript,";

    var Document = document;

    // detect Data URI support
    var supportDataURI = true;
    
    // As much as I love to use a semantic way to
    // detect Data URI support, all the detection
    // methods I could think of are asynchronous,
    // which makes them less reliable when calling
    // asyncJS immediately after its instantiation

    // IE 8 or below does not support Data URI.
    // IE 8 or below returns false
    // http://tanalin.com/en/articles/ie-version-js
    if (Document.all && !Document.addEventListener) {
        supportDataURI = false;
    }

     /**
     * @private
     * @name getCutoffLength
     * Get cut-off length for iteration
     *
     * @param {Array}  arr
     * @param {Number} cutoff
     */
    function getCutoffLength(arr, cutoff) {
        //because AsyncQueue#then could add sync task at any time
        // we must read directly from this.tasks.length
        var length = arr.length;
        if (~cutoff && cutoff < length) length = cutoff;
        return length;
    }

    /**
     * @private
     * @name timeout
     * Run callback in setTimeout
     *
     * @param {Function} fn
     */
    function timeout(fn, s) {
        setTimeout(fn, s || 0);
    }

    /**
     * @private
     * @name createWorker
     * Create web Worker
     *
     */
    function createWorker () {
        var Window = window;

        // web Worker could be 50 times faster than setTimeout 0
        // see the test I wrote
        // http://jsperf.com/worker-and-settimeout-for-threaded-execution/8
        var URL = Window.URL || Window.webkitURL;

        // for not-so-old browsers and mocha/phantom-js test suite
        var BlobBuilder = Window.BlobBuilder
                        || Window.WebKitBlobBuilder
                        || Window.MozBlobBuilder
                        || Window.MSBlobBuilder;

        var blobType = "text/javascript";

        // forward message to worker
        var redirectMessage = "self.onmessage = "
            + "function(e) {self.postMessage(e.data);};";

        var blob;

        if (Window.Blob) {
            // MDN says Worker accpets dataURI
            // but only Opera actually supports it
            // http://stackoverflow.com/questions/10343913/
            blob = new Blob([redirectMessage], { type: blobType });
        }
        else if (BlobBuilder) {
            var _blob = new BlobBuilder();
            _blob.append(redirectMessage);
            blob = _blob.getBlob(blobType);
        }

        return new Worker(URL.createObjectURL(blob));
    }

    /**
     * @private
     * @name thread
     * Run callback asynchronously
     *
     * @param {Function} fn
     */
    var thread;

    // use Worker if possible
    // else try setImmediate
    // if all above fail, fallback back to setTimeout
    try {
        var worker = createWorker();

        // stores threaded functions
        var asyncThread = {};

        // internal thread spawn count
        // make sure threadIndex is unique
        var asyncThreadIndex = 0;

        // catch postMessage with threadIndex
        worker.addEventListener("message", function(evt) {
            var key = evt.data;
            if (!key) return;

            var fn = asyncThread[key] || null;
            if (!fn) return;

            fn.call(null);
            delete asyncThread[key];
        });

        // send threadIndex to worker
        thread = function(fn) {
            var threadIndex = "asyncJS-thread-"
                + (++asyncThreadIndex);

            asyncThread[threadIndex] = fn;

            worker.postMessage(threadIndex);
        };
    }
    catch (e) {
        // for browsers that does not support postMessage
        // use setTimeout instead
        thread = timeout;
    }

    /**
     * @private
     * @name throwLater
     * Throw Error asynchronously
     *
     * @param {Object}  err
     */
    function throwLater(err) {
        timeout(function() { throw err; });
    }

    /**
     * @private
     * @name isURL
     * Check if str is a URL
     *
     * @param {String} str
     */
    function isURL(str) {
        // supports URL starts with http://, https://, and //
        // or a single line that ends with .js or .php
        return (
            /(^(https?:)?\/\/)|(\.(js|php)$)/.test(str) &&
            !/(\n|\r)/m.test(str)
        );
    }

    /**
     * @private
     * @name isFunction
     * Check if fn is a function
     *
     * @param {Function} fn
     */
    // This is duck typing, aka. guessing
    function isFunction (fn) {
        return fn && fn.constructor && fn.call && fn.apply;
    }

    var ArrayPrototype = Array.prototype;
 
    /**
     * @private
     * @name makeArray
     * Make an array out of given object
     *
     * @param {Object} obj
     */
    function makeArray(obj) {
        var isArray;
        if ((isArray = Array.isArray)) {
            return isArray(obj) ? obj : [obj];
        }
        return ArrayPrototype.concat(obj);
    }

    /**
     * @private
     * @name factory
     * Factory Method producing function
     * that receives reduced arguments
     *
     * @param {Function} fn
     * @param {Object} context
     */
    // http://wiki.ecmascript.org/doku.php?id=conventions:safe_meta_programming
    var call = Function.call;
    function factory(fn) {
        var defaults = ArrayPrototype.slice.call(arguments, 1);

        // make an extra copy of defaults
        // so that predefined values are kept intact
        function concat(args) {
            return ArrayPrototype.concat.apply(defaults, args);
        }

        return function() {
            // keep this as simple as possible
            return call.apply(fn, concat(arguments));
        };
    }

    // end of shims

    /**
     * @private
     * @name handleScriptEvent
     * Script event handler
     *
     * @param {Function} fn
     * @param {Boolean} logEvent
     * @param {Object} evt
     */
    function handleScriptEvent(fn, logEvent, evt) {
        /*jshint validthis:true */
        var script = this,
            error = null;

        // run only when ready
        if (script.readyState &&
            !(/^c|loade/.test(script.readyState))
        ) return;

        // never rerun callback
        if (script.loadStatus) return;

        if (logEvent && evt) {
            var src = script.src || "Resource",
                fails = " fails to load.";

            // custom error
            // TODO: create a more specific stack for this Error
            error = {
                name: "ConnectionError",
                source: src,
                evt: evt,
                stack: src + fails,
                message: fails,
                toString: function() {
                    return this.stack;
                }
            };
            throwLater(error);
        }

        // unbind to avoid rerun
        script.onload = script.onreadystatechange = null;

        script.loadStatus = true;

        fn.call(null, error);
    }

    /**
     * @private
     * @name appendScript
     * Append asynchronous script to DOM
     *
     * @param {String|Function} str
     * @param {Function} fn
     */
    function appendScript(str, fn) {
        var ScriptTagName = "script",
            script = Document.createElement(ScriptTagName),
            // at least one script could be found,
            // the one which wraps around asyncJS
            scripts = Document.getElementsByTagName(ScriptTagName),
            lastScript = scripts[scripts.length - 1];

        // new browser does not need to declare type
        // old browser never goes this far
        // so we are omitting the type declaration
        script.async = true;
        script.src = str;

        if (!fn) return;

        // executes callback if given
        script.loadStatus = false;

        var LOG_EVENT = true;
        var handler = factory(handleScriptEvent, script, fn);

        // onload for all sane browsers
        // onreadystatechange for legacy IE
        script.onload =
        script.onreadystatechange = handler;

        // log error
        script.onerror = factory(handler, null, LOG_EVENT);

        // inline script tends to change nearby DOM elements
        // so we append script closer to the caller
        // this is at best a ballpark guess and
        // might not work well with some inline script
        var slot = lastScript;

        // in case running from Console
        // we might encounters a scriptless page
        slot = slot || document.head.firstChild;

        slot.parentNode.insertBefore(script, slot);
    }

    /**
     * @private
     * @name loadFunction
     * Loads JS function or script string for
     * browser that does not support Data URI
     *
     * @param {String|Function} js
     * @param {Function} fn
     */
    function loadFunction (js, fn) {
        thread(function() {
            /*jshint evil:true, newcap:false*/
            var error,
                task = isFunction(js) ? js : Function(js);

            try {
                task.call(null);
            } catch (e) {
                error = e;
                error.source = js;

                throwLater(error);
            }

            // executes callback
            fn.call(null, error);
        });
    }

    /**
     * @private
     * @name load
     * Loads one request or executes one chunk of code
     *
     * @param {String|Function} js
     * @param {Function} fn
     */
    function load(js, fn) {
        // js is not a function
        if (!isFunction(js)) {
            if (isURL(js)) {
                appendScript(js, fn);
                return;
            }
            if (supportDataURI) {
                // wraps up inline JavaScript into external script
                js = dataURIPrefix + encodeURIComponent(js);
                appendScript(js, fn);
                return;
            }
        }

        loadFunction(js, fn);
    }

    /**
     * @public
     * @name AsyncQueue
     * Create a semi-Promise for asyncJS
     * @constructor
     *
     * @param {Array|String|Function} tasks
     * @param {Function} fn
     */
    function AsyncQueue(tasks, fn) {
        // better compression for shrinking `this`
        var self = this;

        self.tasks = [];
        self.callbacks = [];
        self.errors = [];

        // resolved task install
        self.nextTask = 0;

        // resolved callback index
        self.nextCallback = 0;

        // should we wait for AsyncQueue#then
        // -1 (default) means no
        self.until = -1;

        // implies the queue is executing callback
        self.digest = false;

        // add tasks and callbacks
        self.add(tasks).whenDone(fn);
    }

    /**
     * @private
     * @name resolveCallback
     * Resolve next asyncJS callback
     */
    function resolveCallback() {
        /*jshint validthis:true*/
        var self = this;

        // try again later
        if (self.digest) {
            timeout(factory(resolveCallback, self), 50 / 3);
            return;
        }

        self.digest = true;

        var fn, next, i = self.nextCallback;

        // always update length for next iteration
        for (; i < getCutoffLength(self.callbacks, self.until); i++) {
            if (self.nextTask !== self.tasks.length) continue;

            next = self.nextCallback;

            fn = self.callbacks[next];

            if (fn) {
                self.nextCallback = i + 1;

                // passing in current taskIndex
                fn.call(null, self, self.nextTask - 1, self.errors);

                // if callback is not to generated function
                // then it would advance to the next iteration
                // else it would be removed from array
                if (!fn.untilThen) continue;

                // reduce nextCallback count
                self.nextCallback--;

                // release iteration lock
                self.until = -1;
            }

            // remove invalid or untilThen function
            self.callbacks.splice(next, 1);
        }

        self.digest = false;
    }

    /**
     * @private
     * @name resolve
     * Resolve next asyncJS queue
     * Normally, you never have to call this
     */
    function resolve(error) {
        /*jshint validthis:true*/
        var self = this;
        if (error) self.errors.push(error);

        // never resolve when tasks are finished
        if (self.nextTask < self.tasks.length) {
            // if tasks are still queueing
            // increment nextTask
            if (++self.nextTask !== self.tasks.length) return;
        }

        // check callbacks if all tasks are finished
        resolveCallback.call(self);
    }

    AsyncQueue.resolve = resolve;

    /**
     * @public
     * @name AsyncQueue#whenDone
     * Attach extra callback to next asyncJS queue
     *
     * @param {Function} fn
     */
    AsyncQueue.prototype.whenDone = function(fn) {
        // save a few bytes
        var self = this;
        if (!fn) return self;

        // tasks undone
        if (self.nextTask > self.tasks.length) return self;

        // add callback function
        self.callbacks.push(fn);

        // try resolve
        if (self.nextTask === self.tasks.length) resolve.call(self);

        return self;
    };

    /**
     * @public
     * @name AsyncQueue#add
     * Add tasks to next asyncJS queue
     *
     * @param {Array|String|Function} tasks
     */
    AsyncQueue.prototype.add = function(tasks) {
        tasks = makeArray(tasks);
        var i = 0,
            _resolve = factory(resolve, this);

        for (; i < tasks.length; i++) {
            if (!tasks[i]) continue;

            this.tasks.push(tasks[i]);
            load(tasks[i], _resolve);
        }

        return this;
    };

    /**
     * @public
     * @name AsyncQueue#addSync
     * Add tasks to next asyncJS queue
     * and BLOCK all following callbacks
     * until this task is finished
     *
     * @param {Array|String|Function} tasks
     */
    AsyncQueue.prototype.addSync = function(tasks) {
        var self = this;

        if (!tasks) return self;
        
        // if all previous tasks are finished
        // just add task is suffice
        if (self.nextTask === self.tasks.length) {
            self.add(tasks);
            return self;
        }

        // if there are still tasks unfinished
        // add new tasks when this function
        // that has a `untilthen` property
        function _addSync() {
            // when `resolveCallback` sees the
            // property, it will stop executing
            // all other callbacks until it is done
            self.until = self.nextCallback;

            self.add(tasks);
        }

        _addSync.untilThen = true;

        return self.whenDone(_addSync);
    };

    /**
     * @public
     * @name AsyncQueue#then
     * alias of #addSync
     */
    AsyncQueue.prototype.then = AsyncQueue.prototype.addSync;

    /**
     * @public
     * @name asyncJS
     * Loads multiple requests or executes inline code
     *
     * @param {String|Array} js
     * @param {Function} fn
     *
     * @return {Object} asyncJS queue
     */
    function asyncJS(js, fn) {
        return new AsyncQueue(js, fn);
    }

    // export asyncJS
    /*jshint node:true*/
    /*global define*/
    if (typeof exports === "object") {
        module.exports = asyncJS;
    }
    else if (typeof define === "function" && define.amd) {
        define(function(){ return asyncJS; });
    }
    else {
        context[name] = asyncJS;
    }
}("asyncJS", this));
