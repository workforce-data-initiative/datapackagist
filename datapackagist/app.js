var express = require('express');
var app = express();
var corsProxy = require('./src/scripts/components/backend/cors-proxy');
var multer  = require('multer');
var upload = multer({dest: '/tmp'});
var uploadResourceFile = require('./src/scripts/components/backend/upload-resource-file');


app.use(express.static(__dirname + '/dist'));
app.get('/cors-proxy/*', corsProxy);
app.get('/upload-resource-file/*', uploadResourceFile);
app.post('/upload-resource-file/?', upload.single('resource'), uploadResourceFile);
app.get('*', function(request, response) { response.sendFile(__dirname + '/dist/index.html'); });
module.exports = app;
