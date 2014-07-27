//The application server
//All the filtering and data processing happens here.
//Processes the ```data-sources.json``` and ```data-description.json``` files


//Dependencies
var express = require('express');
var routes = require('./routes');
var user = require('./routes/user');
var rest = require('./routes/rest');
var http = require('http');
var path = require('path');
var crossfilter = require("./crossfilter.js").crossfilter;
var fs = require('fs');
var d3 = require('d3');
var app = express();
var load_data_source = require('./load_data_source');   //Module for loading various data formats

// all environments
app.set('port', 3000);
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');
app.use(express.favicon());
app.use(express.logger('dev'));
app.use(express.bodyParser());
app.use(express.methodOverride());
app.use(app.router);
app.use(express.static(path.join(__dirname, 'public')));


//
//Stores all the data from various data soruces
//
var data="";

//Stores all visual attributes from data-description.json
var visual_attributes = []; 
//Stores all filtering attributes from data-description.json
var filtering_attributes = [];

var data_sources = [];

//Crossfilter specific
// - **dimensions** stores an array of dimensions.
// - **groups** stores an array of groups.
// - **ndx** is the crossfilter object.
var dimensions = {};
var groups = {};
var ndx;


init();


//
//#### init()
//Initializtion function
//

function init(){
	process_data_source();
}

//
//#### process_data_source()
//Reads data-source.json which provides information about the type, path and the attributes of the data.
//
function process_data_source(){
  //Read the ```data-source.json``` file
  var data_source_schema = fs.readFileSync("public/schemas/data-source.json");
  data_source_schema = JSON.parse(data_source_schema);
  //For each data source in the ```data-source.json``` file add to the ```data_sources``` array
  for(var data_source in data_source_schema){
    console.log(data_source_schema[data_source]);
    data_sources.push(data_source_schema[data_source]);
  }
  //**Todo** Join logic. Joining data from multiple data sources

  console.log(data_sources);
  load_data();

}


//
//#### load_data()
//Loads data using the type and path specified in ```data-sources.json```.
//Currently supports
// * JSON
// * CSV
// * REST JSON
// * REST CSV
//
//The system can be extended to support more types using ```load_data_sources.js```
//
function load_data()
{
  for(var data_source in data_sources){
    var type=  data_sources[data_source].type;
    var path = data_sources[data_source].path;
    if(type== "json"){
      load_data_source.json(path, data, process_data);
    } else if(type == "csv") {
      load_data_source.csv(path, data, process_data);
    } else if(type == "rest/json") {
      var options = data_sources[data_source].options
      load_data_source.rest_json(path, data,options, process_data);
    } else if (type == "rest/csv"){
      var options = data_sources[data_source].options;
      load_data_source.rest_json(path, data,options, process_data);
    }
  }

}


function process_data(){
        data = load_data_source.data;
        process_backend_schema();
}


//
//#### process_backend_schema()
//Reads the backend schema and fills the ```visual_attributes``` and ```filtering_attributes``` 
//
function process_backend_schema(){
  var schema = fs.readFileSync("public/schemas/backend-schema.json");
  schema = JSON.parse(schema);
  for(var attribute in schema){
    if(schema[attribute]["visual-attribute"])
      visual_attributes.push(schema[attribute]);
    if(schema[attribute]["filtering-attribute"])
      filtering_attributes.push(schema[attribute]);
  }

  apply_crossfilter();

}




//
//#### apply_crossfilter()
//Applies crossfilter to all the ```dimensions``` and ```groups```
//
function apply_crossfilter(){
  var ndx = crossfilter(data);
  for(var attr in filtering_attributes){
      if(filtering_attributes[attr]["datatype"] == "integer")
      dimension = ndx.dimension(function(d){return 1*d[filtering_attributes[attr]["name"]]});
    else
      dimension = ndx.dimension(function(d){return d[filtering_attributes[attr]["name"]]});

    if(filtering_attributes[attr]["dimension"])
      dimension = ndx.dimension(filtering_attributes[attr]["dimensions"]())

    dimensions[filtering_attributes[attr]["name"]] = dimension;
    var bin_factor = filtering_attributes[attr]["bin-factor"];
    if(bin_factor){
      group = dimension.group(function(d){
        return Math.floor(d/(bin_factor))*(bin_factor);
      });
    } else {
      group = dimension.group();
    }
    groups[filtering_attributes[attr]["name"]] = group;
  }

  size = ndx.size(),
  all = ndx.groupAll();

  listen();
}

//
// listen to the specified port for HTTP requests
//
function listen(){

  var port = app.settings["port"];
  app.listen(port,function() {
    console.log("listening to port "+port)  
  })

}






//
//#### handle_filter_request(request, response, next)
//Is fired on GET '/data' request. Performs filtering using the filtering information provided in the GET parameter:  ```filter```  
//
function handle_filter_request(req,res,next) {
  
  filter = req.param("filter") ? JSON.parse(req.param("filter")) : {}
  // Loop through each dimension and check if user requested a filter

  // Assemble group results and and the maximum value for each group
  var results = {} 
  var filter_dim;
  var filter_range=[];
  for(var key in filter){
    filter_dim= key;
  }
  
  Object.keys(dimensions).forEach(function (dim) {

    if (filter[dim]) {
    
      //If enumerated
      //todo fix for numerical enumerated types
      if(filter[dim].length > 1){
        if(typeof filter[dim][0] == "string"){
          
          dimensions[dim].filterFunction(
          function(d){
            for(var i=0; i<filter[dim].length; i++){
              var f = filter[dim][i];
              if(f == d ){
                return true;
              }
            }
            return false;  
          });
        
        } else {
          dimensions[dim].filter(filter[dim])
        }
      }
      else{
        dimensions[dim].filter(filter[dim][0])
      }
    } else {
      dimensions[dim].filterAll(null)
    }
  })
  
  if(Object.keys(filter).length === 0){
      results["table_data"] = {data:dimensions[filtering_attributes[0]["name"]].top(100)}
  }
  else{
      results["table_data"] = {data:dimensions[filter_dim].top(100)}
  }
  Object.keys(groups).forEach(function(key) {
      results[key] = {values:groups[key].all(),top:groups[key].top(1)[0].value}
  })

  res.writeHead(200, { 'content-type': 'application/json' });
  res.end((JSON.stringify(results)))
}



// Listen for filtering requests on ```/data```
app.use("/data",handle_filter_request);

// Change this to the static directory of the index.html file
app.get('/', routes.index);
app.get('/rest/json', rest.index);
app.get('/index2.html', routes.index2)
app.get('/index3.html', routes.index3)
app.get('/index4.html', routes.index4)
app.get('/test.html', routes.test)
app.get('/users', user.list);