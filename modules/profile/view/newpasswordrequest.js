module.exports.newpasswordrequest = function (forgotpassword, custom) {
	const lang = custom.lang;
	const local = custom.local;
	const setting = custom.settings;
	const user = forgotpassword.user;
	const otp = forgotpassword.otp_code;
	let mail_newpasswordrequest = `
	<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
	<html xmlns="http://www.w3.org/1999/xhtml">
		<head>
			<meta http-equiv="Content-Type" content="text/html; charset=utf-8" />
			<meta name="viewport" content="width=device-width, initial-scale=1.0"/>
			<meta name="format-detection" content="telephone=no" />
			<meta http-equiv="X-UA-Compatible" content="IE=edge" />
			<title>Email - Forgot password</title>
			<style type="text/css">
				body {
					direction: ${local.direction};
					margin: 0 !important;
					padding: 0 !important;
					width: 100% !important;
					-webkit-text-size-adjust: 100% !important;
					-ms-text-size-adjust: 100% !important;
					-webkit-font-smoothing: antialiased !important;
				}
				img {
					border: 0 !important;
					outline: none !important;
				}
				a {
					border-collapse: collapse;
					mso-line-height-rule: exactly;
				}
				span {
					border-collapse: collapse;
					mso-line-height-rule: exactly;
				}
				#mailbody{
					display: block;
					margin: auto;
				}
				@media only screen and (max-width:480px) {
					#mailbody, table {
						width: 100% !important;
					}
				}
				@media only screen and (min-width:481px) and (max-width:599px) {
					#mailbody, table {
						width: 100% !important;
					}
					td{
						padding:0px 5px !important;
					}
				}
				@media only screen and (min-width:600px) {
					#mailbody, table {
						padding: 10px;
						width: 100% !important;
					}
				}
			</style>
		</head>
		<body dir="${local.direction}">
			<div id="mailbody" dir="${local.direction}">
				<table cellspacing="0" cellpadding="0" bgcolor="#fefefe">
					<tbody>
						<tr>
							<td>
								<table cellspacing="0" cellpadding="0">
									<tbody>
										<tr>
											<td height="48"><img src="${custom.config.site_base_url}/assets/img/jm3eia-logo.jpeg" height="48" /></td>
										</tr>
									</tbody>
								</table>
								<div>
									${local.dear} ${user.fullname}
									<br /><br />
									${local.fields.username}:- ${user.username}
									<br /><br />
									${local.mail.forgotpassword_q}
									<br /><br />
									${local.mail.forgotpassword_c_b} :
									<br />
									${otp}
									<br /><br />
									${local.mail.forgotpassword_thanks},									<br /><span class="HOEnZb"><span style="color: #888888;">${ setting.site_name[lang] }</span></span>
								</div>
							</td>
						</tr>
					</tbody>
				</table>
				<table cellspacing="0" cellpadding="0">
					<tbody>
						<tr>
							<td height="16">&nbsp;</td>
						</tr>
					</tbody>
				</table>
			</div>
		</body>
	</html>
	`;

	return mail_newpasswordrequest;
};