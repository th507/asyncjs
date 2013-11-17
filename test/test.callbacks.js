/*global suite, test, assert, asyncJS*/
suite('Executing Callbacks', function(){
    /*jshint laxcomma:true, unused:false*/

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
        })
    });

    test("...after external script", function(done) {
        this.timeout(10000);

        var job = sinon.spy();
        var jq = "https://cdnjs.cloudflare.com/ajax/libs/jquery/1.8.3/jquery.min.js"

        var q = asyncJS([jq, job]);

        q.whenDone(function() {
            assert(job.called);
            assert(!!window.jQuery);
            done();
        })
    });

    test("Async function without return value", function(done) {

        var q = asyncJS();

        q.add(function(resolver) {
            resolver.resolve(null);

        },'OMITTED');

        q.whenDone(function (r) {
            assert.equal(JSON.stringify(r.data), '{}');
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
