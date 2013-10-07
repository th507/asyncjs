/*global suite, test, assert, asyncJS*/
suite('Queueing Asynchronous Tasks', function(){
    /*jshint laxcomma:true, unused:false*/
    
    test("...in asyncJS", function(done) {
        var q = asyncJS([function(){}, "(function(){}())"]);

        assert.equal(2, q.tasks.length);
        done();

    });

    test("...in Queue.add", function(done) {
        var q = asyncJS();

        q.add([function(){}, "(function(){}())"]);

        assert.equal(2, q.tasks.length);
        done();

    });

    test("...in multiple ways", function(done) {
        var q = asyncJS(function(){});

        q.add("(function(){}())");

        assert.equal(2, q.tasks.length);
        done();

    });

    test("Queue should be empty if no task is attached", function(done) {
        var q = asyncJS();

        assert.equal(0, q.tasks.length);
        done();

    });

    test("Handle inline function in asyncJS", function(done) {
        var Bar = {};
        var q = asyncJS(
            // async task
            function() { Bar.foo = "foo"; },
            // callback
            function() {
                assert.equal("foo", Bar.foo);
                done();
            }
        );
    });

    test("Handle inline function in Queue.add", function(done) {
        var Bar = {};
        var q = asyncJS();

        q.add(function() { Bar.foo = "foo"; });

        q.whenDone(function() {
            assert.equal("foo", Bar.foo);
            done();
        });
    });


    test("Handle script string in Queue.add", function(done) {
        window.Foo = {};
        var q = asyncJS();
        q.add('window.Foo.bar = "bar"');

        q.whenDone(function() {
            assert.equal("bar", window.Foo.bar);

            delete window.Foo;
            done();
        });
    });

    test("Handle mixed script in asyncJS", function(done) {
        this.timeout(10000);

        var Bar = {};
        window.Foo = {};
        
        var q = asyncJS(
            [
                function() { Bar.foo = "foo"; },
                'window.Foo.bar = "bar"',
                "https://cdnjs.cloudflare.com/ajax/libs/jquery/1.8.3/jquery.min.js"
            ]
            , function() {
                assert.equal("foo", Bar.foo);
                assert.equal("bar", window.Foo.bar);
                assert(!!window.jQuery);

                delete window.Foo;
                delete window.jQuery;
                
                done();
            });
    });

    test("Handle mixed inline script in Queue.add", function(done) {
        this.timeout(10000);

        var Bar = {};
        window.Foo = {};
        
        var q = asyncJS();
        
        q.add([
            function() { Bar.foo = "foo"; },
            'window.Foo.bar = "bar"',
            "https://cdnjs.cloudflare.com/ajax/libs/jquery/1.8.3/jquery.min.js"
        ]);

        q.whenDone(function() {
            assert.equal("foo", Bar.foo);
            assert.equal("bar", window.Foo.bar);
            assert(!!window.jQuery);

            delete window.Foo;
            delete window.jQuery;

            done();
        });
    });
});
