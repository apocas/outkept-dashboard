var Outkept = function () {
  this.servers = [];
  this.counter = 0;
  this.mpoints = [0];
  this.stats = {};
  this.playing = false;

  var self = this;

  self.renderHeartbeat();

  this.connection = io();
  window.connection = this.connection;

  this.connection.on('disconnect', function () {
    console.log('Disconnected');
    //self.notification('Connection status', 'Disconnected.');
  });

  this.connection.on('connect', function() {

    self.connection.on('server', function (server) {
      //console.log(server);
      self.counter++;
      var aux = self.findServer(server.id);
      if (aux === undefined) {
        var serv = new Server(server);
        self.servers.push(serv);
        serv.render();
      } else {
        aux.props = server;
        aux.render();
      }
    });

    self.connection.on('servers', function (servers) {
      self.counter++;
      var sensors = 0;
      for (var i = 0; i < servers.length; i++) {
        sensors += servers[i].sensors.length;
        var aux = self.findServer(servers[i].id);
        if (aux === undefined) {
          var server = new Server(servers[i]);
          self.servers.push(server);
          server.render();
        } else {
          aux.props = servers[i];
          aux.render();
        }
      }

      self.renderSearch();

      $('#vservers').html(servers.length);
      $('#vsensors').html(sensors);
    });

    self.connection.on('message', function (message) {
      self.counter++;
      var d = new Date(message.date);
      var aux = '(' + d.getHours() + ':' + d.getMinutes() + ') ' + message.message;
      window.terminal.terminal.echo(aux);
      $('#output_message').html(aux);
    });

    self.connection.on('event', function (ev) {
      self.counter++;
      if(ev.type == 'trigger') {
        var d = new Date(ev.date * 1000);
        var daux = '(' + d.getHours() + ':' + d.getMinutes() + ') ';
        var maux = 'Server ' + ev.hostname + ', ' + ev.level + ' with value ' + parseFloat(ev.value).toFixed(2) + ' at ' + ev.sensor + '.';

        var aux = daux + maux;
        window.terminal.terminal.echo(aux);
        $('#output_message').html(aux);

        var serv = self.findServer(ev.id);
        if(serv) {
          var sens = serv.getSensor(ev.sensor);

          if(!sens) {
            sens = {
              'name': ev.sensor,
              'value': ev.value,
              'status': ev.status
            };
            serv.props.sensors.push(sens);
          } else {
              sens.value = ev.value;
          }

          if(ev.level === 'warned') {
            sens.status = ev.level;
            serv.props.status = ev.level;
          } else if(ev.level === 'fired' || ev.level === 'alarmed') {
            sens.status = 'alarmed';
            serv.props.status = 'alarmed';
            self.notification(maux);
          }

          serv.render();
        }
      }
    });

    self.connection.on('stats', function (data) {
      self.counter++;
      self.stats = data;

      self.counter++;
      self.renderStats(data);
    });

    console.log('Connected');
  });
};


Outkept.prototype.notification = function (message) {
  var self = this;
  if (window.GoogleTTS && (!$.cookie('mute') || $.cookie('mute') === "false") && this.playing === false) {
    this.playing = true;
    if(!this.googleTTS) {
      this.googleTTS = new window.GoogleTTS();
    }
    this.googleTTS.play(message, 'en', function(err) {
      self.playing = false;
    });
  }
};

Outkept.prototype.findServer = function (id) {
  for (var i = 0; i < this.servers.length; i++) {
    if (this.servers[i].props.id === id) {
      return this.servers[i];
    }
  }
};

Outkept.prototype.renderSearch = function() {
  var search_strings = [];
  var self = this;
  for (var i = 0; i < this.servers.length; i++) {
    if(this.servers[i].props.hostname != undefined && this.servers[i].props.address != undefined) {
      search_strings.push(this.servers[i].props.hostname);
      search_strings.push(this.servers[i].props.address);
    }

    for (var y = 0; y < this.servers[i].props.sensors.length; y++) {
      if(this.servers[i].props.sensors[y] !== null && search_strings.indexOf(this.servers[i].props.sensors[y].name) < 0 && this.servers[i].props.sensors[y].name != undefined) {
        search_strings.push(this.servers[i].props.sensors[y].name);
      }
    }
  }

  $('.typeahead_search').typeahead({source: search_strings, updater:function (item) {
      var s = self.searchServer(item);
      if(s !== undefined) {
        if($('#servers_dashboard').find('#' + s.props.id).length === 0) {
          s.locked = true;
          s.render();
        }
      } else {
        var results = self.searchSensor(item);
        var container = $('#searchModal').find('.modal-body');
        container.html('');
        var html = '';
        html += '<table class="table table-striped table-hover">';
        html += '<thead><tr><th>Value</th><th>Hostname</th><th>Address</th><th></th></tr></thead><tbody>';
        for (var i = 0; i < results.length; i++) {
          html += '<tr data-serverid="' + results[i].id + '"><td ><span class="spvalue">' + results[i].value + '</span></td><td>' + results[i].hostname + '</td><td>' + results[i].address + '</td><td><button type="button" class="btn_pin btn btn-primary" data-loading-text="Pinned">Pin</button></td></tr>';
        }
        html += '</tbody></table>';
        container.append(html);
        $('#searchModal').modal();
      }
      return '';
    }
  });
};

Outkept.prototype.searchSensor = function(expression) {
  var sbuffer = [];
  for (var i = 0; i < this.servers.length; i++) {
    for (var y = 0; y < this.servers[i].props.sensors.length; y++) {
      if (this.servers[i].props.sensors[y] !== null && this.servers[i].props.sensors[y].name == expression) {
        sbuffer.push({id: this.servers[i].props.id, address: this.servers[i].props.address, hostname: this.servers[i].props.hostname, value: this.servers[i].props.sensors[y].value});
      }
    }
  }
  return sbuffer;
};

Outkept.prototype.searchServer = function(expression) {
  for (var i = 0; i < this.servers.length; i++) {
    if(this.servers[i].props.hostname == expression || this.servers[i].props.address == expression) {
      return this.servers[i];
    }
  }
};

Outkept.prototype.renderStats = function(data, parent) {
  if(parent === undefined) {
    parent = $('#stats');
  }

  if (data.alarmed !== undefined) {
    $('#vwarnings', parent).html(data.warned);
  }
  if (data.warned !== undefined) {
    $('#valerts', parent).html(data.alarmed);
  }
  if (data.fired !== undefined) {
    $('#vreactives', parent).html(data.fired);
  }
  if (data.feeds !== undefined) {
    $('#vfeeds', parent).html(data.feeds);
  }
};

Outkept.prototype.renderHeartbeat = function () {
  var mpoints_max = 30;
  var self = this;

  setInterval(function () {
    self.mpoints.push(self.counter);
    if (self.mpoints.length > mpoints_max) {
      self.mpoints.splice(0,1);
    }

    $('.sparkline').sparkline(self.mpoints, {
      width: 110,
      height: 20,
      lineColor: '#f8844b',
      fillColor: '#f2f7f9',
      spotColor: '#467e8c',
      maxSpotColor: '#b9e672',
      minSpotColor: '#FA5833',
      spotRadius: 2,
      lineWidth: 1,
      tooltipSuffix: ' events per sec'
    });

    self.counter = 0;
  },1000);
};
