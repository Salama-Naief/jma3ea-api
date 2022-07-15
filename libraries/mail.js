const config = require('../config');
const nodemailer = require('nodemailer');

module.exports.send_mail = async function (from, from_name, to, subject, body) {
	const valid_sender = from.host && from.port && from.secure && from.username && from.password;

	const host = valid_sender ? from.host : config.mail.host;
	const port = valid_sender ? from.port : config.mail.port;
	const secure = valid_sender ? from.secure : config.mail.secure;
	const username = valid_sender ? from.username : config.mail.username;
	const password = valid_sender ? from.password : config.mail.password;
	// create reusable transporter object using the default SMTP transport
	const transporter = nodemailer.createTransport({
		host: host,
		port: port,
		secure: secure, // true for 465, false for other ports
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
		from: `"${from_name} " <${username}>`, // sender address
		to: to, // list of receivers
		subject: `${from_name} : ${subject}`, // Subject line
		html: body // html body
	};
	var result = await transporter.sendMail(mailOptions);
	console.log(result,mailOptions);
	return result;

	// send mail with defined transport object
	return transporter.sendMail(mailOptions)
};
