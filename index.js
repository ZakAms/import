/**
 * Created by shadim on 5/17/15.
 */

'use strict';

var operations = {"filters": 1, "populate": 2, "details": 3, "images": 4};
var web = require('./web');
var cliArgs = require("command-line-args");

process.env.NODE_ENV = process.env.NODE_ENV || 'development';
var mongoose = require('mongoose');
var config = require('./environment');

// Connect to database
var socket = mongoose.connect(config.mongo.uri, config.mongo.options);

var options = handleCommand();

if (!options) {
  return;
}

var op = operations[options.op];


var q = (options.query) ? JSON.parse(options.query) : {};

switch (op) {
  case 1:
    web.buildCategoryTree();
    break;
  case 2:
    web.populateProducts(q);
    break;
  case 3:
    web.updateProductDetails(q);
    break;
  case 4:
    web.fetchImages(q);
}


function handleCommand() {
  var cli = cliArgs([
    {name: "op", type: String, alias: "o", description: "operation name [filters|populate|details|images]"},
    {name: "query", type: String, alias: "q", description: "query that will be use by the operation."},
    {name: "help", type: Boolean, description: "Print usage instructions"}
  ]);

  var options = cli.parse();

  console.log(options);

  var usage = cli.getUsage({
    header: "A synopsis application.",
    footer: "For more information, visit http://example.com"
  });

  if (options.help || !(options.op && operations[options.op])) {
    console.log(usage);
    return null;
  }

  return options;
}
