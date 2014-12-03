// influx -> multiple entries on single point of time.

var myModule = angular.module('myModule', []);

myModule.controller("myCtrl",function($scope, $timeout, $http, $interval){
	var username = 'root';
	var password = 'root';
	var database = 'TempDB';
	$scope.influxdb = new InfluxDB({host : 'localhost', username : username, password : password, database : database});
	var baseUrl = "http://"+$scope.influxdb.host+":"+$scope.influxdb.port+"/db/"+$scope.influxdb.database+"/series?u="+$scope.influxdb.username+"&p="+$scope.influxdb.password;
	var _this = this;
	
	/* INFO:
		METHOD: GET
		URL: /db/<database>/series?u=<user>&p=<pass>&q=SELECT * FROM <entity>
		SELECT_PARAMS:
			LIMIT -> numeric
			TIME_RANGE_FORMAT -> YYYY-MM-DD HH:MM:SS.mmm OR YYYY-MM-DD OR TIMESTAMP
			GROUP BY -> time(10m) 10 minute intervals, time(30s) 0 second intervals
		FUNCTIONS:
			COUNT -> (column_name)
			TIME -> (column_name)
			NOW -> (column_name)
			FILL -> ?
			MIN -> (column_name)
			MAX -> (column_name)
			MEAN -> (column_name)
			MODE -> (column_name)
			MEDIAN -> (column_name)
			DISTINCT -> (column_name)
			PERCENTILE -> (column_name, N)
			HISTOGRAM -> (column_name) OR (column_name, bucket_size) (DEFAULT: bucket_size : 1.0)
			DERIVATIVE -> (column_name)
			SUM -> (column_name)
			STDDEV -> (column_name)
			FIRST -> (column_name)
			LAST -> (column_name)
			DIFFERENCE -> (column_name)
			TOP -> (column_name, N)
			BOTTOM -> (column_name, N)
	*/
	$scope.readSeries = function(){
		var entityName = $scope.readEntity;
		//var read = $scope.influxdb.readPoint("*", entityName);
		var groupBy = "10m"; // m minutes, s seconds
		var limit = 1;
		var param = {
			"entity": entityName,
			"group by": "time("+groupBy+")", // that has to be before "limit"
			"limit": limit,
			"match_map": [{
				"field": "key",
				"operation": "equals",
				"value": "Nc"
			},{
				"field": "time",
				"operation": "range",
				"value": ["2014-04-02 09:34:23.234", "2014-04-09 12:34:45.123"]
			}]
		};
		var url = baseUrl+"&q="+selectQuery(entityName, param);
		get(url, function(data, status){
			$scope.readMessage = data;
		});
	}

	/* INFO:
		METHOD: POST
		URL: /db/<database>/series?u=<user>&p=<pass>
		DATA: [
			{
				"name" : "hd_used",
				"columns" : ["value", "host", "mount"],
				"points" : [
					[23.2, "serverA", "/mnt"]
				]
			}
		]
	*/
	$scope.writeSeries = function(){
		var entityName = $scope.writeEntity;
		var columns = $scope.writeColumns.split(",");
		var points = $scope.writeData.split(",");
		_.each(points,function(item, i){
			if(!isNaN(parseInt(item)))
				points[i] = parseInt(item);
		})

		$scope.writeMessage = "Please wait...";

		var data = [
			{
				"name" : entityName,
				"columns" : columns,
				"points" : [
					points
				]
			}
		];
		var url = baseUrl;
		post(url, data, function(data, status){
			$scope.writeMessage = status;
		});
	}

	/* INFO:
		METHOD: GET
		URL: /db/<database>/series?u=<user>&p=<pass>&q=DROP SERIES <entity>
	*/
	$scope.dropSeries = function(){
		var entityName = $scope.dropEntity;
		$scope.dropMessage = "Please wait...";
		var url = baseUrl+"&q="+dropQuery(entityName);
		get(url, function(data, status){
			$scope.dropMessage = status;
		});
	}

	var log = function(message){
		// console.log()
		console.log(message);
	}
	var get = function(url, callback){
		$http.get(url).
			success(function(data, status, headers, config) {
				log("GET SUCCESS");
				callback(data, status);
			}).
			error(function(data, status, headers, config) {
				log("GET ERROR");
				callback(data, status);
			});
	}
	var post = function(url, data, callback){
		$http.post(url, data).
			success(function(data, status, headers, config) {
				log("POST SUCCESS");
				callback(data, status);
			}).
			error(function(data, status, headers, config) {
				log("POST ERROR");
				callback(data, status);
			});
	}
	var selectQuery = function(entity, param){
		if(param){
			var serial = ["group by","limit"]
			
			var q = "SELECT * FROM "+entity;
			_.each(param, function(value, key){
				if(["group by","limit"].indexOf(key) > -1)
					q += " "+key+" "+value;
				if(key === "match_map" && value.length){
					q += " WHERE";
					_.each(value,function(item,index){
						if(item.operation === "equals"){
							if(isNaN(parseInt(item.value)))
								q += " "+item.field+"='"+item.value+"'";
							else
								q += " "+item.field+"="+item.value;
						}
						else if(item.operation === "range"){
							if(isNaN(parseInt(item.value[0])) && isNaN(parseInt(item.value[1])))
								q += " "+item.field+" > '"+item.value[0]+"' AND "+item.field+" < '"+item.value[1]+"'";
							else
								q += " "+item.field+" > "+item.value[0]+" AND "+item.field+" < "+item.value[1];
						}
						if(index+1 !== value.length)
							q += " AND"
					});
				}
			});

			var q1 = "SELECT * FROM "+entity;
			if(param["match_map"] && param["match_map"].length){
				q1 += " WHERE";
				_.each(param["match_map"],function(item, index){
					if(item.operation === "equals"){
						if(isNaN(parseInt(item.value)))
							q1 += " "+item.field+"='"+item.value+"'";
						else
							q1 += " "+item.field+"="+item.value;
					}
					else if(item.operation === "range"){
						if(isNaN(parseInt(item.value[0])) && isNaN(parseInt(item.value[1])))
							q1 += " "+item.field+" > '"+item.value[0]+"' AND "+item.field+" < '"+item.value[1]+"'";
						else
							q1 += " "+item.field+" > "+item.value[0]+" AND "+item.field+" < "+item.value[1];
					}
					if(index+1 !== param["match_map"].length)
							q1 += " AND"
				});
			}
			_.each(serial, function(item){
				if(param[item])
					q1 += " "+item+" "+param[item];
			});

		}
		log("q: "+q);
		log("q1: "+q1);
		return "SELECT * FROM "+entity;
	}
	var dropQuery = function(entity){
		return "DROP SERIES "+entity;
	}
});