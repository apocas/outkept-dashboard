var Router = Backbone.Router.extend({
  routes: {
    "": "index"
  },

  initialize: function() {
    this.outkept = new Outkept();
  },

  index: function() {
    var self = this;
    templateLoader.load(["DashboardView"], function() {
      $('#app_container').html(new DashboardView(self.outkept).render().el);
    });
  }
});

app = new Router();
Backbone.history.start();
