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
        
        var q = asyncJS(["https://cdnjs.cloudflare.com/ajax/libs/jquery/1.8.3/jquery.min.js", job]);

        q.whenDone(function() {
            assert(job.called);
            assert(!!window.jQuery);
            done();
        })
    });

    test("Catching errors", function(done) {
        var times = 0;
        var q = asyncJS(function() {sadf});

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
});
