var Server = function(server) {
  this.props = server;
  this.locked = false;
};

Server.prototype.render = function() {
  var self = this;

  if ($('#servers_dashboard').find('#' + this.props.id).length === 0) {
    if (this.props.status != 'normal' || this.locked === true || this.props.connected === false) {
      var serverg = this.create();

      serverg.attr('class', self.getClass());

      this.renderSensors(serverg);
      $('#servers_dashboard').isotope('insert', serverg);
    }
  } else {
    if (this.props.status == 'normal' && this.locked === false && this.props.connected === true) {
      $('#servers_dashboard').isotope('remove', $('#servers_dashboard').find('#' + this.props.id)).isotope('layout');
    } else {
      $('#servers_dashboard').find('#' + self.props.id).attr('class', self.getClass());
      this.renderSensors($('#' + this.props.id));
    }
  }
};

Server.prototype.getClass = function() {
  var classes = 'server';
  if (this.props.connected === false) {
    classes += ' disconnected';
  } else {
    classes += ' ' + this.props.status;
  }

  if (this.locked === true) {
    classes += ' pinned';
  }

  return classes;
};

Server.prototype.deRender = function() {
  // body...
};

Server.prototype.renderSensors = function(serverg) {
  if (this.props.sensors.length > 0) {
    var cpus = this.getSensor('load');
    if (cpus) {
      $("#sload", serverg).html(parseFloat(cpus.value).toFixed(2));
      $("#sload", serverg).attr('class', Sensor.getClass(cpus));
    }
    var users = this.getSensor('users');
    if (users) {
      $("#susers", serverg).html(users.value);
      $("#susers", serverg).attr('class', Sensor.getClass(users));
    }

    if (this.props.ips) {
      $("#sips", serverg).html(this.props.ips.length + 1);
    } else {
      $("#sips", serverg).html(0);
    }

    for (var i = 0; i < this.props.sensors.length; i++) {
      if (this.props.sensors[i].name !== 'users' && this.props.sensors[i].name !== 'load') {
        if ($("#" + this.props.sensors[i].name, serverg).length > 0) {
          $("#" + this.props.sensors[i].name, serverg).attr('class', Sensor.getClass(this.props.sensors[i]));
          $("#s" + this.props.sensors[i].name, serverg).html(this.props.sensors[i].value);
        } else {
          $(".scontent", serverg).append(Sensor.render(this.props.sensors[i]));
        }
      }
    }
  }
};

Server.prototype.create = function() {
  var lockhtml = '';
  if (this.locked === true) {
    lockhtml = '<div class="opin"></div>';
  }
  var serverg = $('<div id="' + this.props.id + '" class="server">' + lockhtml + '<div class="swrapper"><div class="scontent"></div></div></div>');

  $(".scontent", serverg).html("<p class='hostname'>" + this.props.hostname.substr(0, 16) + "</p>");
  $(".scontent", serverg).append("<p class='address'>" + this.props.address + "</p>");

  var ostats_content = "<i class='icon-user'></i><span id='susers'>n/a</span> | <i class='icon-globe'></i><span id='sips'>n/a</span> | <i class='icon-signal'></i>  <span id='sload' class='snormal'>n/a</span>";

  if (this.props.sensors.length > 0) {
    var cpus = this.getSensor('load');
    var users = this.getSensor('users');

    var ips = this.props.ips || 0;

    if (cpus && users) {
      ostats_content = "<i class='icon-user'></i><span id='susers'  class='" + Sensor.getClass(users) + "'>" + users.value + "</span> | <i class='icon-globe'></i><span id='sips'>" + ips + "</span> | <i class='icon-signal'></i>  <span id='sload' class='" + Sensor.getClass(cpus) + "'>" + parseFloat(cpus.value).toFixed(2) + "</span>";
    }
  }

  $(".scontent", serverg).append("<p class='ostats'>" + ostats_content + "</p>");

  return serverg;
};

Server.prototype.getSensor = function(name) {
  for (var i = 0; i < this.props.sensors.length; i++) {
    if (this.props.sensors[i].name === name) {
      return this.props.sensors[i];
    }
  }
  return undefined;
};
