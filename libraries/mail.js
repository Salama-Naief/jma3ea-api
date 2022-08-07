const config = require('../config');
const nodemailer = require('nodemailer');

module.exports.send_mail = async function (from, from_name, to, subject, body) {
	// const valid_sender = from.host && from.port && from.secure && from.username && from.password;
	// console.log(valid_sender);
	const host = config.mail.host;
	const port = config.mail.port;
	const secure = config.mail.secure;
	const username = config.mail.username;
	const password = config.mail.password;
	const fromEmail = config.mail.from;
	const transporter = nodemailer.createTransport({
		host: host,
		port: port,
		secure: true, // true for 465, false for other ports
		auth: {
			user: username, // generated ethereal user
			pass: password // generated ethereal password
		},
		tls: {
			rejectUnauthorized: false
		}
	});
	// setup email data with unicode symbols
	const mailOptions = {
		from: `"${from_name} " <${fromEmail}>`, // sender address
		to: to, // list of receivers
		subject: `${from_name} : ${subject}`, // Subject line
		html: body // html body
	};
	transporter.sendMail(mailOptions, function(error, info){
		if(error){
			console.log(error, 'to:' + to);
		}else{
			console.log(info,'to:' + to);
			resolve( info);
		}
	});
};
