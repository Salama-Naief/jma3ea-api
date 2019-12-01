// Load required modules
require('dotenv').config();
const createError = require('http-errors');
const express = require('express');
const compression = require('compression');
const fs = require('fs');
const path = require('path');
const config = require('./libraries/config');
const cookieParser = require('cookie-parser');
const logger = require('morgan');

const app = express();

const middleware = require('./libraries/middleware');
app.use(middleware);

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
	app.use(`/v1/${moduleName}`, moduleRouter);
}

// catch 404 and forward to error handler
app.use(function (req, res, next) {
	next(createError(404));
});

// error handler
app.use(function (err, req, res, next) {
	// set locals, only providing error in development
	res.locals.message = err.message;
	res.locals.error = req.app.get('env') === 'development' ? err : {};
	console.log('[app.err]', err);
	// render the error page
	res.json({
		success: false,
		code: err.status,
		errors: err,
		results: null,
	});
});

module.exports = app;