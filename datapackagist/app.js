var corsProxy = require('./src/scripts/components/backend/cors-proxy');
var express = require('express');
var app = express();


app.use(express.static(__dirname + '/dist'));
app.get('/cors-proxy/*', corsProxy);
app.get('*', function(request, response) { response.sendFile(__dirname + '/dist/index.html'); });
module.exports = app;
