var sys = require('sys'),
  events = require('events'),
  config = require('../conf/config'),
  crypto = require('crypto'),
  Worker = require('./worker'),
  duplexEmitter = require('duplex-emitter'),
  socketio = require('socket.io'),
  vendors = require('../vendors');

function Station(listener) {
  this.listener = listener;
  this.clients = [];
  this.io = socketio(listener);
}

sys.inherits(Station, events.EventEmitter);

Station.prototype.start = function () {
  var self = this;

  vendors.mongo(function(db) {
    self.loadWorkers();

    self.io.on('connection', function(socket) {
      self.clients.push(socket);
      self.emit('connected', socket);

      socket.on('disconnect', function(){
        self.removeClient(socket);
        self.emit('disconnected', socket);
        console.log("Client disconnected!");
      });
    });
  });

};

Station.prototype.loadWorkers = function() {
  var self = this;

  /*
  this.stats = new Worker(this.servers, 30 * 1000, function (servers) {
    self.sendStats();
  });
  */


  this.pusher = new Worker(this.servers, 10 * 1000, function (servers) {
    vendors.mongo(function(db) {
      var collection = db.collection('servers');
      collection.find().toArray(function(err, servers) {
        self.send('servers', servers);
      });
    });
  });


  vendors.mongopubsub.subscribe('events', function (event) {
    console.log(event);
    self.send('event', event);
  });

  vendors.mongopubsub.subscribe('messages', function (message) {
    self.send('message', message);
  });
};

Station.prototype.pullServer = function(serverid, callback) {
  var self = this;
  self.redis.hgetall(serverid, function (err, obj) {

    self.redis.keys('sensors-' + obj.id + '-*', function (err, replies2) {

      var redis_multi = self.redis.multi();

      for (var i = 0; i < replies2.length; i++) {
        redis_multi.hgetall('sensors-' + obj.id + '-' + i);
      }

      redis_multi.exec(function (err, replies3) {
        obj.sensors = [];
        for (var i = 0; i < replies3.length; i++) {
          obj.sensors.push(replies3[i]);
        }
        callback(obj);
      });

    });
  });
};

Station.prototype.send = function (event, data) {
  this.clients.forEach(function (client) {
    client.emit(event, data);
  });
};

Station.prototype.sendStats = function (client) {
  var self = this;
  this.redis.hgetall('stats-' + outils.getHashDate(), function (err, data) {
    if (client !== undefined) {
      client.emit('stats', data);
    } else {
      self.send('stats', data);
    }
  });
};


Station.prototype.removeClient = function (rclient) {
  for (i = 0; i < this.clients.length; i++) {
    console.log(this.clients[i].id);
    if (this.clients[i].id === rclient.id) {
      this.clients.splice(i, 1);
      i = this.clients.length + 1;
    }
  }
};

module.exports = Station;
