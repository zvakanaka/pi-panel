const restify = require('restify');
const plugins = require('restify-plugins');
const logger = require('morgan');
const fs = require('fs');
const fetch = require('node-fetch');
require('dotenv').config();
const weather = require('openweather-apis');

const server = restify.createServer({
  name: 'pi-panel',
  version: '1.0.0'
});
server.use(plugins.acceptParser(server.acceptable));
server.use(plugins.queryParser());
server.use(plugins.bodyParser());
server.use(
  function crossOrigin(req, res, next) { // allow cross-origin
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "X-Requested-With");
    return next();
  }
);
server.use(logger('dev'));
server.use(function testMiddleWare(req, res, next) {
  // console.log('hihihihihihihi');
  return next();
});

function addRoute(path, method = 'GET', inputFile = `./fixtures${path}.json`) {
  server[method.toLowerCase()](path, function (req, res, next) {
    res.setHeader('Content-Type', 'application/json');
    fs.readFile(inputFile, 'utf8', function (err, data) {
      if (err) {
        res.status(500);
        res.json(err);
      }
      res.json(JSON.parse(data));
      return next();
    });
  });
}

addRoute('/test');

server.get('/apod', function getApod(req, res, next) {
  res.setHeader('Content-Type', 'application/json');
  fetch(`https://api.nasa.gov/planetary/apod?api_key=${process.env.NASA_API_KEY}`)
    .then(resp => resp.json())
    .then(data => {
      res.json(data);
      return next();
    });
    // TODO: handle error
});

// direction = south | north
server.get('/train/:direction/:station', function getUtaSchedule(req, res, next) {
  const date = new Date();
  const TODAY = (date.getMonth() + 1).toString().padStart(2, "0") + '-' + date.getDate().toString().padStart(2, "0") + '-' +  date.getFullYear();
  const DIRECTION = req.params.direction.toLowerCase().indexOf('south') > -1 ? 'SOUTHBOUND' : 'NORTHBOUND';
  const STATION = `${req.params.station}+Station`;
  const body = `date=${TODAY}&direction=${DIRECTION}&stops%5B%5D=${STATION}&routeNumber=750`;
  fetch('http://www.rideuta.com/api/route/indexgrid', {
        method: 'POST',
        body: body,
        mode: 'cors',
        headers: {
          'Accept': 'application/json',
          'Content-type': 'application/x-www-form-urlencoded; charset=UTF-8'
        }
    })
    .then(resp => resp.json())
    .then(resp => {
      res.json(resp);
      return next();
    });
});

server.get('/weather/:type/:zip', function getWeather(req, res, next) {
  weather.setLang('en');
  weather.setZipCode(req.params.zip);
  weather.setUnits('imperial');
  weather.setAPPID(process.env.OPENWEATHER_API_KEY);
  switch (req.params.type) {
    case 'temp':
      weather.getTemperature(function(err, temp){
        res.json({temp});
        return next();
      });
      break;
    case 'forecast':
      weather.getWeatherForecastForDays(3, function(err, obj){
        res.status(obj.cod);
        res.json(obj);
        return next();
      });
    default:
      weather.getAllWeather(function(err, obj){
        res.status(obj.cod);
        res.json(obj);
        return next();
      });
  }
});


server.listen(process.env.PORT || 8080, function () {
  console.log('%s listening at %s', server.name, server.url);
});
