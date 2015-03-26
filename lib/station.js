var sys = require('sys'),
  events = require('events'),
  config = require('../conf/config'),
  crypto = require('crypto'),
  duplexEmitter = require('duplex-emitter'),
  socketio = require('socket.io'),
  vendors = require('../vendors'),
  async = require('async');

function Station(listener) {
  this.listener = listener;
  this.clients = [];
  this.io = socketio(listener);
}

sys.inherits(Station, events.EventEmitter);

Station.prototype.start = function() {
  var self = this;

  vendors.mongo(function(db) {
    self.loadWorkers();

    self.io.on('connection', function(socket) {
      self.clients.push(socket);
      self.emit('connected', socket);

      socket.on('disconnect', function() {
        self.removeClient(socket);
        self.emit('disconnected', socket);
        console.log("Client disconnected!");
      });

      self.sendServers();
      self.sendStats();
    });
  });

};

Station.prototype.loadWorkers = function() {
  var self = this;

  this.serversInterval = setInterval(function() {
    self.sendServers();
  }, 10 * 1000);

  this.statsInterval = setInterval(function() {
    self.sendStats();
  }, 60 * 1000);


  var subscriber = vendors.redis.createClient();
  subscriber.subscribe('events');
  subscriber.subscribe('messages');

  subscriber.on('message', function (channel, event) {
    event = JSON.parse(event);
    if(channel == 'events') {
      console.log(event);
      self.send('event', event);
    } else if(channel == 'messages') {
      self.send('message', event);
    }
  });
};

Station.prototype.sendServers = function() {
  var self = this;
  vendors.mongo(function(db) {
    var collection = db.collection('servers');
    collection.find().toArray(function(err, servers) {
      self.send('servers', servers);
    });
  });
};

Station.prototype.send = function(event, data) {
  this.clients.forEach(function(client) {
    client.emit(event, data);
  });
};

Station.prototype.sendStats = function() {
  var self = this;

  var now = Math.round(new Date().getTime() / 1000.0);
  var dayBefore = now - (24 * 3600);

  vendors.mongo(function(db) {
    var collection = db.collection('triggers');
    var collection2 = db.collection('feeds');

    async.parallel([
        function(callback) {
          collection.find({
            date: {
              $lt: now,
              $gt: dayBefore
            },
            level: 'warned'
          }).toArray(function(err, triggers) {
            callback(undefined, triggers.length);
          });
        },
        function(callback) {
          collection.find({
            date: {
              $lt: now,
              $gt: dayBefore
            },
            level: 'alarmed'
          }).toArray(function(err, triggers) {
            callback(undefined, triggers.length);
          });
        },
        function(callback) {
          collection.find({
            date: {
              $lt: now,
              $gt: dayBefore
            },
            level: 'fired'
          }).toArray(function(err, triggers) {
            callback(undefined, triggers.length);
          });
        },
        function(callback) {
          collection2.find({
            date: {
              $lt: now,
              $gt: dayBefore
            }
          }).toArray(function(err, triggers) {
            callback(undefined, triggers.length);
          });
        }
      ],
      function(err, results) {
        self.send('stats', {
          'warned': results[0],
          'alarmed': results[1],
          'fired': results[2],
          'feeds': results[3]
        });
      });
  });
};


Station.prototype.removeClient = function(rclient) {
  for (i = 0; i < this.clients.length; i++) {
    console.log(this.clients[i].id);
    if (this.clients[i].id === rclient.id) {
      this.clients.splice(i, 1);
      i = this.clients.length + 1;
    }
  }
};

module.exports = Station;
