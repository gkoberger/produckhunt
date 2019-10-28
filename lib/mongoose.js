var MongoClient = require('mongodb').MongoClient;

// First, go here and add the DB
// Next, add the user

const config = {
  url: 'mongodb://user:password@aws-us-east-1-portal.26.dblayer.com:17527/dn_name',
  database: 'db_name',
};

var options = {
  mongos: {
    ssl: true,
    sslValidate: false,
  }
};

module.exports = function() {
  let db = false;
  var url = config.url;
  return function(req, res, next) {
    if (!db) {
      const connection = MongoClient.connect(url, options, (err, client) => {
        db = client.db(config.database);
        req.db = db;
        next();
      });
    } else {
      req.db = db;
      next();
    }
  };
};
