/**
 * Created by tdzl2_000 on 2015-10-02.
 */
"use strict";

class raii {
    constructor(){
        this._stack = [];
        this._error = null;
        this._position = 0;
        this._running = null;
    }
    push(target, destroy){
        if (typeof(target) == 'function'){
            target = {
                init: target,
                destroy: destroy
            }
        }
        this._stack.push(target);
        return this;
    }
    run(){
        if (this._running){
            return this._running
        }
        this._running = this.next()
        this._running.then(()=>{
            this._running = null;
            this._error = null;
        }, e=>{
            this._running = null;
            this._error = null;
        })
        return this._running;
    }
    init(){
        return this.run();
    }
    destroy(){
        this._error = this._error || new Error('RAII_CANCELED');

        return this.run().catch(e=>{
            if (e.message === 'RAII_CANCELED'){
                return;
            }
            return Promise.reject(e);
        })
    }
    next(){
        if (this._error) {
            // Reversing.
            if (this._position === 0) {
                return Promise.reject(this._error);
            }
            let target = this._stack[--this._position];
            return target.destroy ? Promise.resolve().then(()=>target.destroy()).then(()=> {
                    return this.next();
                }, e=>{
                    console.warn("destroy of RAII resource should not throw a error.\n" + e.stack);
                    return this.next();
                }
            ) : this.next();
        } else {
            // Forwarding.
            if (this._position >= this._stack.length) {
                return Promise.resolve()
            }
            let target = this._stack[this._position++];
            return target.init ? Promise.resolve().then(()=>target.init()).then(
                ()=>(this.next()),
                e=>{
                    this._error = e;
                    return this.next();
                }): this.next();
        }
    }
}
module.exports = raii;
