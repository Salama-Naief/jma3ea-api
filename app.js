// Load required modules
require('dotenv').config();

const http = require('http');
const https = require('https');

http.globalAgent.maxSockets = Infinity;
https.globalAgent.maxSockets = Infinity;

const createError = require('http-errors');
const express = require('express');
const compression = require('compression');
const fs = require('fs');
const path = require('path');
const config = require('./config');
const status_message = require('./enums/status_message');
const cookieParser = require('cookie-parser');
const logger = require('morgan');

process.env.TZ = config.date.timezone || process.env.TZ;

const app = express();

const authorization = require('./libraries/middlewares/authorization');
const analytics = require('./libraries/middlewares/analytics');
const app_version = require('./libraries/middlewares/app_version');
const cache = require('./libraries/middlewares/cache');
const database = require('./libraries/middlewares/database');
const filter = require('./libraries/middlewares/filter');
const i18n = require('./libraries/middlewares/i18n');
const initialize = require('./libraries/middlewares/initialize');
const pagination = require('./libraries/middlewares/pagination');
const response = require('./libraries/middlewares/response');
const settings = require('./libraries/middlewares/settings');
const sorting = require('./libraries/middlewares/sorting');
const update_language = require('./libraries/middlewares/update_language');
const validation = require('./libraries/middlewares/validation');

app.use(initialize(__dirname));
app.use(response);
app.use(i18n(path.resolve('i18n')));
app.use(app_version);
app.use(database);
app.use(cache);
app.use(authorization);
app.use(settings);
app.use(analytics);
app.use(update_language);
app.use(filter);
app.use(sorting);
app.use(pagination);
app.use(validation);

app.use(logger('dev'));
app.use(express.json());
app.use(compression());
app.use(express.urlencoded({
	extended: false
}));
app.use(cookieParser());

const cors = require('cors')
const corsOptions = {
	origin: config.origin,
	optionsSuccessStatus: 200
}

app.use(cors(corsOptions))

const all_modules = fs.readdirSync(path.join(__dirname, `modules`));
for (const moduleName of all_modules) {
	// api
	const moduleRouter = require(`./modules/${moduleName}/route`);
	app.use(`/v2/${moduleName}`, moduleRouter);
}

// error handler
app.use(function (err, req, res, next) {
	// set locals, only providing error in development
	res.locals.message = err.message;
	res.locals.error = req.app.get('env') === 'development' ? err : {};
	console.log('=====================Start of Error====================');
	console.log('=========================================');
	console.log('--------[DateTime]------', '::', new Date());
	console.log('--------[Protocol]------', '::', req.protocol);
	console.log('--------[Hostname]------', '::', req.hostname);
	console.log('--------[OriginalUrl]---', '::', req.originalUrl);
	console.log('--------[IP]------------', '::', req.ip);
	console.log('--------[Method]--------', '::', req.method);
	console.log('--------[Params]--------', '::', req.params);
	console.log('--------[User-Agent]----', '::', req.get('User-Agent'));
	console.log('--------[User-IP]-------', '::', req.headers['x-forwarded-for'] || req.connection.remoteAddress);
	console.log('--------[Query]---------', '::', req.query);
	console.log('--------[Body]----------', '::', req.body);
	console.log('--------------[Error Details]--------------');
	console.log(err);
	console.log('--------------[End Error Details]--------------');
	console.log('=========================================');
	console.log('=====================End of Error====================');

	// render the error page
	res.out({
		errors: 'Error!',
	}, status_message.UNEXPECTED_ERROR);
});

module.exports = app;
