var Sensor = {

  getClass: function(sensor) {
    var classn = "snormal";
    if (sensor.status == 'alarmed' || sensor.status == 'fired') {
      classn = "salarmed";
    } else if (sensor.status == 'warned') {
      classn = "swarned";
    }
    return classn;
  },

  render: function(sensor) {
    var classn = Sensor.getClass(sensor);
    return "<p class='" + classn + "' id='" + sensor.name + "' style='padding:0px;margin:0px;'>" + sensor.name + " <span id='s" + sensor.name + "'>" + sensor.value + "</span></p>";
  }
};
