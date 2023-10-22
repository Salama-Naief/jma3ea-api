const config = require("../config");
var { SendMailClient } = require("zeptomail");

module.exports.send_mail = function (from_name, to_email, to_name, subject, body) {
	const url = config.mail.host;
	const token = config.mail.token;
	const from_email = config.mail.from;

	if (!url || !token || !from_email) {
		return false;
	}

	let client = new SendMailClient({ url, token });

	const mailOptions = {
		"from": {
			"address": from_email,
			"name": from_name,
		},
		"to": [
			{
				"email_address": {
					"address": to_email,
					"name": to_name || "",
				},
			},
		],
		"subject": subject,
		"htmlbody": body,
	};

	return client
		.sendMail(mailOptions);
		/* .then((resp) => true)
		.catch((e) => console.error(e)) */
};
