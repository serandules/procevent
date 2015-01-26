var util = require('util');
var events = require('events');

var Process = function (process) {
    this.process = process;
    this.onces = {};
    this.ons = {};
    var that = this;
    process.on('message', function (o) {
        if (!o.event) {
            return
        }
        var cbs = that.ons[o.event];
        if (cbs) {
            cbs.forEach(function (cb) {
                cb.apply(that, o.data);
            });
        }
        cbs = that.onces[o.event];
        if (cbs) {
            cbs.forEach(function (cb) {
                cb.apply(that, o.data);
            });
            that.onces[o.event] = [];
        }
    });
};

Process.prototype.on = function (event, cb) {
    var cbs = this.ons[event] || (this.ons[event] = []);
    cbs.push(cb);
};

Process.prototype.once = function (event, cb) {
    var cbs = this.onces[event] || (this.onces[event] = []);
    cbs.push(cb);
};

Process.prototype.emit = function (event) {
    this.process.send({
        event: event,
        data: Array.prototype.slice.call(arguments, 1)
    });
};

module.exports = function (process) {
    return new Process(process);
};