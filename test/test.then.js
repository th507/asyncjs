/*global suite, test, assert, sinon, asyncJS*/
suite('Queueing Synchronous Tasks', function(){
    /*jshint laxcomma:true, unused:false, plusplus:false*/

    test("...in Queue.then", function(done) {
        var q = asyncJS();

        q.then([function(){}, "(function(){}())"]);

        assert.equal(2, q.tasks.length);
        done();
    });

    test("...in multiple ways", function(done) {
        var q = asyncJS(function(){});

        q.then("(function(){}())");

        q.whenDone(function() {
            assert.equal(2, q.tasks.length);
            done();
        });
    });

    test("Update callbacks and tasks array.", function(done) {
        var q = asyncJS(function(){});

        q.whenDone(function() {});

        assert.equal(1, q.callbacks.length);
            
        q.then("(function(){}())");

        q.whenDone(function() {
            assert.equal(2, q.tasks.length);
            done();
        });
    });

    test("Queue.then should not block following Queue.add", function(done) {
        var times = 0;
        var q = asyncJS(function(){});

        q.whenDone(function() {
            times++;
        });
            
        q.then(function(){
            times = 0;
        });

        q.add(function() {});

        q.whenDone(function() {
            assert.equal(0, times);
            assert.equal(3, q.tasks.length);
            done();
        });
    });

    test("Queue.then should block following Queue.whenDone", function(done) {
        var times = 0;
        var q = asyncJS(function(){});

        q.whenDone(function() {
            times++;
        });

        q.add(function() {
            times++;
        });

            
        q.then(function(){
            times = 0;
        });

        q.whenDone(function() {
            assert.equal(0, times);
            done();
        });
    });



    test("Sequential Execution", function(done) {
        this.timeout(10000);
        var jQuery = "https://cdnjs.cloudflare.com/ajax/libs/jquery/1.8.3/jquery.min.js";
        var bootstrap = "https://netdna.bootstrapcdn.com/bootstrap/3.0.0/js/bootstrap.min.js";
        var job = sinon.spy();
        var times = 0;

        var q = asyncJS(jQuery);
        q.whenDone(function () {
            job.call(null);
            assert.equal(0, times);
            assert(!!jQuery);
            assert(!$.fn.emulateTransitionEnd);
            times++;
        });

        q.whenDone(function () {
            assert(!!jQuery);
            assert(!$.fn.emulateTransitionEnd);
            times++;
        });
        // then blocks all follow whenDone callbacks
        q.then(bootstrap);

        q.whenDone(function () {
            assert.equal(2, times);
            assert(job.called);
            assert(!!jQuery);
            assert(!!$.fn.emulateTransitionEnd);
            done();
        });
    });

    test("Multiple tasks in then", function(done) {
        this.timeout(10000);
        var jQuery = "https://cdnjs.cloudflare.com/ajax/libs/jquery/1.8.3/jquery.min.js";
        var bootstrap = "https://netdna.bootstrapcdn.com/bootstrap/3.0.0/js/bootstrap.min.js";
        var times = 0;

        var q = asyncJS(jQuery);
        q.whenDone(function () {
            assert.equal(0, times);
            assert(!!jQuery);
            assert(!$.fn.emulateTransitionEnd);
            times++;
        });

        q.whenDone(function () {
            assert(!!jQuery);
            assert(!$.fn.emulateTransitionEnd);
            times++;
        });
        // then blocks all follow whenDone callbacks
        q.then([bootstrap, function() { times++; }]);

        q.whenDone(function () {
            assert.equal(3, times);
            assert(!!jQuery);
            assert(!!$.fn.emulateTransitionEnd);
            done();
        });
    });

});
