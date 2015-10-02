/**
 * Created by tdzl2_000 on 2015-10-02.
 */
"use strict";

var Raii = require('../lib/index');

let stack = new Raii().push({
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
}).push({
    // A breakable resource that will never done init process.
    isBreakable: true,
    init(){
        return new Promise((resolve, reject)=>{
            this._reject = reject
        })
    },
    destroy(error){
        if (this._reject){
            this._reject(error || new Error());
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
