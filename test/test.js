/**
 * Created by tdzl2_000 on 2015-10-02.
 */
"use strict";

var raii = require('../lib/index');

let stack = new raii().push({
    init(){
        return new Promise(resolve=>{
            setTimeout(resolve, 1000);
        })
    }
}).push({
    init(){
        return new Promise((resolve, reject)=>{
            this._server = require("net").createServer().listen(7744, resolve);
            this._server.on('error', reject);
        })
    },
    destroy(){
        if (this._server) {
            console.log("Shutting down server.");
            this._server.close();
            this._server = null;
        }
    }
})

stack.init().then(e=>{
    console.log("Ready.");
}, e=>{
    console.error(e.stack);
})

process.on('SIGINT', ()=>{
    stack.destroy().then(()=>{
        console.log("Bye.");
    })
});
