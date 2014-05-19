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

    // do not record return value for asynchronous task
    // if handler is OMITTED
    var OMITTED = "OMITTED";

    // for better compression
    var Document = document;
    var Window = window;
    var ArrayPrototype = Array.prototype;

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
        Window.setTimeout(fn, s || 0);
    }

    /**
     * @private
     * @name immediate
     * Run callback asynchronously (almost immediately)
     *
     * @param {Function} fn
     */
    var immediate = Window.requestAnimationFrame
                || Window.webkitRequestAnimationFrame
                || Window.mozRequestAnimationFrame
                || timeout;

    /**
     * @private
     * @name throwLater
     * Throw Error asynchronously
     *
     * @param {Object}  error
     */
    function throwLater(error) {
        timeout(function() { throw error; });
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
     * @name slice
     * Convert array-like object to array
     *
     * @param {Object} arr
     */
    function slice (arr) {
        return ArrayPrototype.slice.call(arr);
    }

    /**
     * @private
     * @name factory
     * Factory Method producing function
     * that receives reduced arguments
     *
     * @param {Function} fn
     */
    // http://wiki.ecmascript.org/doku.php?id=conventions:safe_meta_programming
    var call = Function.call;
    function factory() {
        var defaults = slice(arguments);

        return function() {
            // keep this as simple as possible
            return call.apply(call, defaults.concat(slice(arguments)));
        };
    }

    // end of shims

    /**
     * @private
     * @name resolveScriptEvent
     * Script event handler
     *
     * @param {Object} resolver
     * @param {Object} evt
     */
    function resolveScriptEvent(resolver, evt) {
        /*jshint validthis:true */
        var script = this;

        // run only when ready
        // script.readyState is completed or loaded
        if (script.readyState &&
            !(/^c|loade/.test(script.readyState))
        ) return;

        // never rerun callback
        if (script.loadStatus) return;

        // unbind to avoid rerun
        script.onload = script.onreadystatechange = script.onerror = null;

        script.loadStatus = true;

        if (evt && evt.type === "error") {
            var src = script.src || "Resource",
                fails = " fails to load.";

            // custom error
            // TODO: create a more specific stack for this Error
            var error = {
                name: "ConnectionError",
                source: src,
                evt: evt,
                stack: src + fails,
                message: fails,
                toString: function() {
                    return this.source + this.message;
                }
            };
            throwLater(error);

            resolver.reject(error);
            return;
        }

        resolver.resolve();
    }

    /**
     * @private
     * @name appendScript
     * Append asynchronous script to DOM
     *
     * @param {String|Function} str
     * @param {Object} resolver
     */
    function appendScript(str, resolver) {
        var ScriptTagName = "script";
        var script = Document.createElement(ScriptTagName);

        // at least one script could be found,
        // the one which wraps around asyncJS
        var scripts = Document.getElementsByTagName(ScriptTagName);
        var lastScript = scripts[scripts.length - 1];

        script.async = true;
        script.src = str;

        if (!resolver) return;

        // executes callback if given
        script.loadStatus = false;

        var resolveScript = factory(resolveScriptEvent, script, resolver);

        // onload for all sane browsers
        // onreadystatechange for legacy IE
        script.onload = script.onreadystatechange = script.onerror = resolveScript;

        // inline script tends to change nearby DOM elements
        // so we append script closer to the caller
        // this is at best a ballpark guess and
        // might not work well with some inline script
        var slot = lastScript;

        // in case running from Console
        // we might encounters a scriptless page
        slot = slot || document.body.firstChild;

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
    function loadFunction (js, resolver) {
        immediate(function () {
            try {
                js.call(null, resolver);
            }
            catch (e) {
                resolver.reject(e);
            }
        });
    }

    /**
     * @private
     * @name load
     * Loads one request or executes one chunk of code
     *
     * @param {String|Function} js
     * @param {Function} resolve
     */
    function load(js, resolver) {
        /*jshint newcap:false, evil:true*/
        // js is not a function
        if (!isFunction(js)) {
            if (isURL(js)) {
                appendScript(js, resolver);
                return;
            }
            if (supportDataURI) {
                // wraps up inline JavaScript into external script
                js = dataURIPrefix + encodeURIComponent(js);
                appendScript(js, resolver);
                return;
            }
        }

        var fn = isFunction(js) ? js : Function(js);

        // a synchronous function is wrapped into a special function
        // so that we could use the same logic as an asynchronous function
        if (!resolver.async) {
            var task = fn;
            fn = function (resolver) {
                try {
                    task.call(null);
                    resolver.resolve();
                }
                catch (e) {
                    resolver.reject(e);
                }
            };
        }

        loadFunction(fn, resolver);
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

        // TODO: exposing this is not safe
        self.tasks = [];
        self.callbacks = [];
        self.errors = [];

        // return values of Promise
        self.data = {};

        // resolved task index
        self.nextTask = 0;

        // resolved callback index
        self.nextCallback = 0;

        // -1 (default) means not waiting for AsyncQueue#then
        self.until = -1;

        // queue is executing callback
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
                fn.call(null, self.data, self.nextTask - 1, self.errors);

                // if callback is not to generated function
                // then it would advance to the next iteration
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
     * @name nextTick
     * Advance to next tick in the queue
     * For AsyncQueue#reject or AsyncQueue#resolve
     *
     * @param {String} handle
     * @param {Object} data
     */
    function nextTick() {
        /*jshint validthis:true*/
        var self = this;

        // never resolve when tasks are finished
        if (self.nextTask < self.tasks.length) {
            // if tasks are still queueing
            // increment nextTask
            if (++self.nextTask !== self.tasks.length) return self;
        }

        // check callbacks if all tasks are finished
        resolveCallback.call(self);
        return self;
    }

    /**
     * @private
     * @name resolve
     * Resolve next asyncJS queue
     * Normally, you never have to call this
     *
     * @param {String} handle
     * @param {Object} data
     */
    AsyncQueue.prototype.resolve = function (handle, data) {
        /*jshint validthis:true*/
        var self = this;

        // save data if available and necessary
        if (handle && handle !== OMITTED) self.data[handle] = data;

        return nextTick.call(self);
    };

    /**
     * @private
     * @name reject
     * Reject and continue next asyncJS queue
     *
     * @param {Object} error
     */
    AsyncQueue.prototype.reject = function (error) {
        /*jshint validthis:true*/
        var self = this;

        if (error) {
            throwLater(error);

            self.errors.push(error);
        }

        // keep executing other stacked tasks
        return nextTick.call(self);
    };

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
        if (self.nextTask === self.tasks.length) self.resolve();

        return self;
    };

    /**
     * @public
     * @name AsyncQueue#add
     * Add tasks to next asyncJS queue
     *
     * @param {Array|String|Function} tasks
     */
    AsyncQueue.prototype.add = function(tasks, handle) {
        var self = this;
        if (!tasks) return self;

        // warn user if returned data could overwrite
        // existing data, without stopping further execution
        if (handle && self[handle]) {
            var error = new Error("Callback value name: " + handle + " is registered");

            throwLater(error);
            self.errors.push(error);
        }

        tasks = makeArray(tasks);

        var resolver = {
                resolve: factory(self.resolve, self, handle),
                reject: self.reject,
                async: !!handle
            };

        for (var i = 0, fn; i < tasks.length; i++) {
            fn = tasks[i];
            if (!fn) continue;

            // this is just for future reference
            self.tasks.push(fn);

            // resolve function
            load(fn, resolver);
        }

        return self;
    };

    /**
     * @public
     * @name AsyncQueue#then
     * Add a SINGLE dependent task to next asyncJS queue
     * which blocks all following callbacks
     * until this task is finished
     *
     * @param {Array|String|Function} task
     */
    AsyncQueue.prototype.then = function(task, handle) {
        var self = this;

        if (!task) return self;

        // if there are still tasks unfinished
        // add new tasks when this function
        // that has a `untilthen` property
        function addDependent() {
            // when `resolveCallback` sees the
            // property, it will stop executing
            // all other callbacks until it is done
            self.until = self.nextCallback;

            self.add(task, handle);
        }

        addDependent.untilThen = true;

        return self.whenDone(addDependent);
    };

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
    if (typeof module !== 'undefined' && module.exports) {
        module.exports = asyncJS;
    }
    else if (typeof define === "function" && define.amd) {
        define(function(){ return asyncJS; });
    }
    else {
        context[name] = asyncJS;
    }
}("asyncJS", this));
