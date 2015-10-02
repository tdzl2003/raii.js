/**
 * Created by tdzl2_000 on 2015-10-02.
 */
"use strict";

class Raii {
    constructor(){
        this._stack = [];
        this._error = null;
        this._position = 0;
        this._running = null;
        this._destroying = null;
    }
    get isBreakable(){
        return true;
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
        this._running = this._next()
        this._running.then(()=>{
            this._running = null;
            this._error = null;
            this._destroying = null;
        }, e=>{
            this._running = null;
            this._error = null;
            this._destroying = null;
        })
        return this._running;
    }
    init(){
        return this.run();
    }
    destroy(error){
        if (this._destroying){
            return this._destroying;
        }
        if (this._position == 0){
            return Promise.resolve();
        }
        let target = this._stack[this._position - 1];

        if (target.isBreakable){
            target.destroy(new Error('RAII_CANCELED'));
            --this._position;
        } else {
            this._error = this._error || error || new Error('RAII_CANCELED');
        }

        this._destroying = this.run().catch(e=>{
            if (e.message === 'RAII_CANCELED'){
                return;
            }
            return Promise.reject(e);
        })
        return this._destroying;
    }
    _next(){
        if (this._error) {
            // Reversing.
            if (this._position === 0) {
                return Promise.reject(this._error);
            }
            let target = this._stack[--this._position];
            return target.destroy ?
                Promise.resolve().then(()=>target.destroy(this._error))
                    .then(
                        ()=> (this._next()),
                        e=>{
                            console.warn("destroy of RAII resource should not throw a error.\n" + e.stack);
                            return this._next();
                        }
                    ) : this._next();
        } else {
            // Forwarding.
            if (this._position >= this._stack.length) {
                return Promise.resolve()
            }
            let target = this._stack[this._position++];
            return target.init ? Promise.resolve().then(()=>target.init()).then(
                ()=>(this._next()),
                e=>{
                    this._error = e;
                    return this._next();
                }): this._next();
        }
    }
}
module.exports = Raii;
