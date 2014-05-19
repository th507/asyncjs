/*global suite, test, assert, sinon, asyncJS*/
suite('Executing Callbacks', function(){
    /*jshint laxcomma:true, unused:false, curly:false*/

    test("...in an empty queue", function(done) {
        var q = asyncJS();
        var job = sinon.spy();

        q.whenDone(function() {
            job.call(null);
            assert(job.called);
            done();
        });
    });

    test("...after inline function", function(done) {
        var job = sinon.spy();

        asyncJS(job, function() {
            assert(job.called);
            done();
        });
    });

    test("...after evaulating script string", function(done) {
        var job = sinon.spy();
        window.Foo = {};

        asyncJS(["window.Foo.bar='bar'", job], function() {
            assert(job.called);
            assert.equal("bar", window.Foo.bar);

            delete window.Foo;
            done();
        });
    });


    test("...in a simple queue consisted of one inline function", function(done) {
        var job = sinon.spy();

        var q = asyncJS(job);

        q.whenDone(function() {
            assert(job.called);
            done();
        });
    });

    test("...after timing consuming inline function", function(done) {
        function sleep(delay) {
            var start = Date.now();
            while (Date.now() < start + delay);
        }

        var begin = Date.now();
        var q = asyncJS(sleep(1000));

        q.whenDone(function() {
            assert(Date.now() - begin >= 1000);
            done();
        });
    });

    test("...after external script", function(done) {
        this.timeout(10000);

        var job = sinon.spy();
        var jq = "https://cdnjs.cloudflare.com/ajax/libs/jquery/1.8.3/jquery.min.js";

        var q = asyncJS([jq, job]);

        q.whenDone(function() {
            assert(job.called);
            assert(!!window.jQuery);
            done();
        });
    });

    test("Async function without return value", function(done) {
        var q = asyncJS();
        var job = sinon.spy();
        var asyncJob = sinon.spy();

        q.add(function(resolver) {
            setTimeout(function() {
                asyncJob.call(null);
                resolver.resolve(null);
            }, 5);
        },'OMITTED');

        q.add(job);

        q.whenDone(function (data) {
            assert.equal('{}', JSON.stringify(data));
            assert(job.called);
            assert(asyncJob.called);
            done();
        });
    });

    test("Async function with return value", function(done) {
        var q = asyncJS();

        window.Foo = {};

        q.add(function(resolver) {
            resolver.resolve(1);
        },"demo1");

        q.add(function(resolver) {
            setTimeout(function() {
                resolver.resolve(2);
            }, 5);
        },"demo2");

        q.add(function(resolver) {
            setTimeout(function() {
                resolver.resolve(3);
            }, 5);
        },"demo3");

        q.whenDone(function (data) {
            assert.equal("1", data.demo1);
            assert.equal("2", data.demo2);
            assert.equal("3", data.demo3);
            done();
        });

    });

    test("Mixing async functions and sync functions", function(done) {
        /*global Foo*/
        var q = asyncJS();

        window.Foo = {};

        q.add(function(resolver) {
            resolver.resolve(1);
        },"demo1");


        q.add(function(resolver) {
            setTimeout(function() {
                Foo.bar = "bar";
                resolver.resolve(null);
            }, 10);

        }, "demo2");

        q.whenDone(function (data) {
            assert.equal("1", data.demo1);
            assert.equal(null, data.demo2);
            assert.equal("bar", window.Foo.bar);
            done();
        });

    });


    test("Adding Async function with #then", function(done) {
        var q = asyncJS();
        var job = sinon.spy();
        var asyncJob = sinon.spy();

        q.add(job);

        q.then(function(resolver) {
            setTimeout(function() {
                asyncJob.call(null);
                resolver.resolve();
            }, 10);
        } , "OMITTED");

        q.whenDone(function () {
            assert(job.called);
            assert(asyncJob.called);
            done();
        });
    });

    test("Async function which calls resolver.resolve multiple times", function(done) {
        var q = asyncJS();
        var job = sinon.spy();
        var asyncJob = sinon.spy();

        q.add(function(resolver) {
            setTimeout(function() {
                asyncJob.call(null);
                resolver.resolve(null);
            }, 5);

            setTimeout(function() {
                asyncJob.call(null);
                resolver.resolve(null);
            }, 200);
        },'OMITTED');

        q.add(job);

        q.whenDone(function (data) {
            assert.equal('{}', JSON.stringify(data));
            assert(job.called);
            assert(asyncJob.called);
            assert.equal(q.errors.length, 0);
            done();
        });
    });

/*
 * We could handle uncaught error in Node, but not in browser
 * http://stackoverflow.com/a/9132271
 *
 * However, this function works, see examples/error-handling.html
 **/
/*
    test("Catching errors", function(done) {
        var times = 0;
        window.throwLater = function () {};

        var q = asyncJS(function() {throw new Error});

        q.add(function() {
            times++;
        });

        q.add(function() {
            times += 2;
        });

        q.whenDone(function(queue, current, errors) {
            assert.equal(3, times);
            assert.equal(2, current);
            assert.equal(1, errors.length);
            done();
        })
    });
*/
});
