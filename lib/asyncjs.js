/**
 * Async JavaScript Loader
 * https://github.com/th507/asyncJS
 *
 * Load every bit of JavaScript asynchronously
 * include inline script
 *
 * @author Jingwei "John" Liu <liujingwei@gmail.com>
 */

(function(name, context) {
    /*jshint plusplus:false, curly:false, bitwise:false*/
    "use strict";

    // some useful shims and variables
    var dataURIPrefix = "data:application/javascript,";

    // detect Data URI support
    var supportDataURI = true;

    /*
     * As much as I love to use a semantic way to
     * detect Data URI support, all the detection
     * methods I could think of are asynchronous,
     * which makes them less reliable when calling
     * asyncJS immediately after its instantiation
     */

    // IE 7 or below does not support Data URI.
    // NodeJS does not have navigator
    if(
        navigator &&
        (navigator.appName !== 'ie') &&
        (navigator.appVersion < 8)
    ) {
        // In IE 8, while Data URI is supported,
        // the maximum URI length is limited to 32kB
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
     * @name later
     * Run callback asynchronously
     *
     * @param {Function} fn
     */
    // This is use for multiple purposes (not good).
    // Sometimes just for async flow
    // sometimes we do need to execute
    // after a period of time.
    // TODO: maybe use postmessage ?
    // http://jsperf.com/postmessage/15

    // 1000 / 60 = 50 / 3
    var later = function(fn) { setTimeout(fn, 50 / 3); };

    /**
     * @private
     * @name throwLater
     * Throw Error asynchronously
     *
     * @param {Object}  err
     */
    function throwLater(err) {
        later(function() { throw err; });
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
        // or a single line that ends with .js
        return (
            /(^(https?:)?\/\/)|(\.js$)/.test(str) &&
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
        return fn.constructor && fn.call && fn.apply;
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
        if (Array.isArray) {
            return Array.isArray(obj) ? obj : [obj];
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
    //wiki.ecmascript.org/doku.php?id=conventions:safe_meta_programming
    var call = Function.call;
    function factory(fn) {
        var concat = ArrayPrototype.concat,
            defaults = ArrayPrototype.slice.call(arguments, 1);

        return function() {
            // make an extra copy of defaults
            // so that predefined values are kept intact
            return call.apply(fn, concat.apply(defaults, arguments));
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
        var Document = document,
            ScriptTagName = "script",
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
        later(function() {
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
        var until = -1;

        // getter and setter for until
        self.until = function() { return until; };
        self.waitFor = function(num) { until = num; };

        // implies the queue is executing callback
        var digest = false;

        // getter and setter for digest
        self.digest = function() { return digest; };
        self.setDigest = function(bool) { digest = bool; };

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
        if (self.digest()) {
            later(factory(resolveCallback, self));
            return;
        }

        self.setDigest(true);

        var fn, next, i = self.nextCallback;

        // always update length for next iteration
        for (; i < getCutoffLength(self.callbacks, self.until()); i++) {
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
                self.waitFor(-1);
            }

            // remove invalid or untilThen function
            self.callbacks.splice(next, 1);
        }

        self.setDigest(false);
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
            self.waitFor(self.nextCallback);

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
    var asyncJS = function (js, fn) {
        return new AsyncQueue(js, fn);
    };

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
