var log = require('logger')('procevent');
var util = require('util');
var uuid = require('node-uuid');
var events = require('events');

var Process = function (process) {
    this.process = process;
    this.onces = {};
    this.ons = {};
    this.queue = {};
    var thiz = this;
    process.on('message', function (o) {
        if (!o.event) {
            return
        }
        var done;
        if (o.event === 'emitted') {
            if (log.debug) {
                log.debug('emiton response %s, %s', o.id, thiz.process.pid);
            }
            done = thiz.queue[o.id];
            done.apply([false].concat(o.data));
            delete thiz.queue[o.id];
            return;
        }
        var dones = thiz.ons[o.event];
        var args = (o.event === 'emit') ? [o.event, o.id].concat(o.data) : o.data;
        if (dones) {
            dones.forEach(function (done) {
                done.apply(thiz, args);
            });
        }
        dones = thiz.onces[o.event];
        if (dones) {
            dones.forEach(function (done) {
                done.apply(thiz, args);
            });
            thiz.onces[o.event] = [];
        }
    });
};

Process.prototype.on = function (event, done) {
    var dones = this.ons[event] || (this.ons[event] = []);
    dones.push(done);
};

Process.prototype.once = function (event, done) {
    var dones = this.onces[event] || (this.onces[event] = []);
    dones.push(done);
};

Process.prototype.emit = function (event) {
    this.process.send({
        event: event,
        data: Array.prototype.slice.call(arguments, 1)
    });
};

Process.prototype.emiton = function (event) {
    var id = uuid.v4();
    var args = Array.prototype.slice.call(arguments, 1);
    this.queue[id] = args.pop();
    if (log.debug) {
        log.debug('emiton request %s, %s, %s, %s', event, id, JSON.stringify(args), this.process.pid);
    }
    this.process.send({
        event: 'emit',
        type: event,
        id: id,
        data: args
    });
};

module.exports = function (process) {
    return new Process(process);
};