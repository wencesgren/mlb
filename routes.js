module.exports = function(app) {
	// route to handle all angular requests
	app.get('/', function(req, res) {
		var options = {
		  root: 'app',
		  dotfiles: 'deny',
		  headers: {
		    'x-timestamp': Date.now(),
		    'x-sent': true
		  }
		};

		res.sendFile('index.html', options, function (err) {
		  if (err) {
		    console.log(err);
		    res.status(err.status).end();
		  }
		});
	});
};
