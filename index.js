var log = require('logger')('procevent');
var uuid = require('node-uuid');
var events = require('events');

var Process = function (process) {
    this.id = uuid.v4();
    this.process = process;
    this.onces = {};
    this.ons = {};
    this.queue = {};
    var thiz = this;
    this.message = function (o) {
        if (!o.event) {
            return
        }
        var done;
        if (o.event === 'emitted') {
            if (o.pid !== thiz.id) {
                return;
            }
            if (log.debug) {
                log.debug('emiton response %s, %s %s', o.id, thiz.process.pid, o.data);
            }
            done = thiz.queue[o.id];
            done.apply(done, [false].concat(o.data));
            delete thiz.queue[o.id];
            return;
        }
        var dones = thiz.ons[o.event];
        var args = (o.event === 'emit') ? [o.event, o.id, o.pid].concat(o.data) : o.data;
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
    };
    process.on('message', this.message);
};

Process.prototype.on = function (event, done) {
    var dones = this.ons[event] || (this.ons[event] = []);
    dones.push(done);
};

Process.prototype.once = function (event, done) {
    var dones = this.onces[event] || (this.onces[event] = []);
    dones.push(done);
};

Process.prototype.emit = function (event, id, pid, data) {
    var d = {
        event: event
    };
    if (event === 'emitted') {
        d.id = id;
        d.pid = pid;
        d.data = data;
    } else {
        d.data = Array.prototype.slice.call(arguments, 1);
    }
    this.process.send(d);
};

Process.prototype.emiton = function (event) {
    var id = uuid.v4();
    var args = Array.prototype.slice.call(arguments, 1);
    this.queue[id] = args.pop();
    if (log.debug) {
        log.debug(typeof this.queue[id]);
        log.debug('emiton request %s, %s, %s, %s', event, id, JSON.stringify(args), this.process.pid);
    }
    this.process.send({
        event: 'emit',
        type: event,
        id: id,
        pid: this.id,
        data: args
    });
};

Process.prototype.destroy = function () {
    this.process.removeListener('message', this.message);
};

module.exports = function (process) {
    return new Process(process);
};