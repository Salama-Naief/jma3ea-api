const config = require("./config");
const nodemailer = require("nodemailer");

module.exports.send_mail = async function (fromName, to, subject, body) {
	// create reusable transporter object using the default SMTP transport
	let transporter = nodemailer.createTransport({
		host: config.mail.host,
		port: config.mail.port,
		secure: config.mail.secure, // true for 465, false for other ports
		auth: {
			user: config.mail.username, // generated ethereal user
			pass: config.mail.password // generated ethereal password
		},
		tls: {
			rejectUnauthorized: false
		}
	});

	// setup email data with unicode symbols
	let mailOptions = {
		from: `"${fromName} " <${config.mail.username}>`, // sender address
		to: to, // list of receivers
		subject: `${fromName} : ${subject}`, // Subject line
		html: body // html body
	};

	// send mail with defined transport object
	return await transporter.sendMail(mailOptions)

}