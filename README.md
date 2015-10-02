# RAII.js #

## Introduction ##

RAII.js is a RAII(Resource Acquisition Is Initialization) implementation based on ES6 Promise.

RAII.js make sure your resource is initialized&destroyed in order, and it's possible to cancel(destroy) the whole stack at any time.

## Installation ##

Just install raii.js via npm in your project:

```
npm install raii --save
```

## Quick start ##

First, create a raii instance before any resource initialization:

```javascript
var Raii = require("raii")
var raii = new Raii();
```

Then, push any resource instance into raii. Resource instance should be a object
with `init()` and/or `destroy(error)` method. It can be a object instanted from class, or
a temporary object, or even a module with `init()` and/or `destroy(error)` function.

You can also use raii.push(init, destroy) where init and destroy are functions.
If so, a temporary object will be created for you.

You can return nothing if your init/destroy process finished immediately, or return
 a Promise object if there's some work to do.

Notice: you should check whether init process is done in destroy function, because
init process may be interrupted by some errors.

```javascript
raii.push({
    init: function(){
        global.app = new Application();
    },
    destroy: function(){
        if (global.app){
            global.app.close();
            global.app = null;
        }
    }
});

// Use function directly.
raii.push(function(){
    // Return a promise to wait for something.
    return new Promise(function(resolve){
        setTimeout(resolve, 1000);
    });
})

raii.push(new ResourceWithInitAndDestroyFunction())

// Raii class self is a valid resource.
// You can create another instance and push it into stack.
raii.push(new Raii());
```

Use init/destroy method of raii to control your application flow.

All your resources will be inited in order to startup,
and destroyed in reverse order after destroyed or any error.

```
raii.init().then(e=>{
    console.log("Ready.");
}, e=>{
    console.error(e.stack);
})

process.on('SIGINT', ()=>{
    raii.destroy().then(()=>{
        console.log("Bye.");
    })
});

```

## Exception Handling & Other details ##

If any error occured in init process, the process will be break, and destroy
process will be started immediately. After all, the promise returned by `init()`
 will be reject with the error object.

If you call `destroy()` before init process finished, a error with message 'RAII_CANCELED`
will be used to reject the promise returned by `init()`. You can catch and ignor this error
and print any other error information to console. The init process of current resource will *NOT*
be break, raii will wait for it.

If you call `init()` or `destroy()` multi times, the state will be guarded that
the init process or the destroy process will be only run once.

After destroy process finished, you can call `init()` again to start a new init
process. If you call `init()` during destroy process, you will receive `RAII_CANCALED` error.

## Breakable resource ##

Resource object with `isBreakable` property of a true value will be treated as a
breakable resource. raii stack will call `destroy` function with a error of message('RAII_CANCALED'),
before the promise returned by `init()` is resolved.

The breakable resource should handle this case, and reject the promise returned by `init()`
with the error argument.

Any instance of `Raii` class is a breakable resource.

## Reference ##

### class Raii ###

#### constructor() ####

#### raii.push(resource) ####

Push a resource object (which may have `init()` and/or `destroy()` method) into raii stack.

#### raii.push(init[, destroy]) ####

Push a temporary object with `init()` function and optional a `destroy()` function into raii stack.

#### raii.init() ####

Start a init process, return a promise object to track the state of init process.

* Called in initial state: Start init process and return a promise which will be resolved
after init process done or reject if any error occured or init process was canceled.

* Called in init process: Return the promise of current init process(same with the one returned in previous call)

* Called in done state: No effect. Return a resolved promise(new instance)

* Called in destroy process: Return a promise which will be rejected after destroy process done.

#### raii.destroy([error]) ####

Stop init process and start destroy process.

* Called in intial state: No effect. Return a resolved promise(new instance)

* Called in init process: The init process will be interruped. Return a promise that will be resolved after destroy process done or
reject if any error occued in current init process.

* Called in done state: Start destroy process. Return a promise that will be resolved after destroy process done.

* Called in destroy process: Return the promise of current destroy process (same with the one returned in previous call).

#### raii.isBreakable ####

True. Means any instance of Raii class is a breakable resource.

