module.exports.mail_register = function (user, custom) {
	const lang = custom.lang;
	const local = custom.local;
	const base_link = `${custom.config.site_base_url}`;
	const setting = custom.settings;
	let mail_register = `
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
				<table align="center" cellpadding="0" cellspacing="0" dir="rtl">
					<tbody>
						<tr>
							<td>${local.mail.registerion_welcome} ${user.fullname}،
							<p>${local.mail.registerion_to_login} ${setting.site_name[lang]}،
								${local.mail.registerion_click_on} 
								<a href="${base_link}/profile/login" target="_blank">									
									${local.mail.registerion_login} 
								</a>
								${local.or} 
							<a href="${base_link}/profile" target="_blank">
								${local.mail.registerion_profile} 
							</a>
								${local.mail.registerion_top_page} 	
							</p>
							<p>${local.mail.registerion_your_name} ${user.username}<br />
								${local.mail.registerion_your_username_description}
							</p>
				
							<ul>
								<li>${local.mail.registerion_note1}</li>
								<li>${local.mail.registerion_note2}</li>
								<li>${local.mail.registerion_note3}</li>
								<li>${local.mail.registerion_note4}</li>
								<li>${local.mail.registerion_note5}</li>
								<li>${local.mail.registerion_note6}</li>
							</ul>
							</td>
						</tr>
					</tbody>
				</table>
			
				<table align="center" cellpadding="0" cellspacing="0" dir="rtl">
					<tbody>
						<tr>
							<td>
							<table cellpadding="0" style="width:100%">
								<tbody>
									<tr>
										<td>
										<p>
										${local.mail.registerion_need_help_send_to} {site_email}
										${local.mail.registerion_or_call}
										<strong>${setting.site_phone}</strong>.</p>
				
										<p>${local.mail.registerion_easy_shopping}<br />
											<a href="${base_link}" target="_blank">${setting.site_name[lang]}</a>
										</p>
										</td>
									</tr>
									<tr>
										<td>
										<table cellpadding="0" cellspacing="0" style="width:100%">
											<tbody>
												<tr>
													<td>
													<p>
													${local.mail.registerion_footer1}
													</p>
													<p>
													${local.mail.registerion_footer2}
													</p>
													</td>
												</tr>
											</tbody>
										</table>
										</td>
									</tr>
								</tbody>
							</table>
							</td>
						</tr>
					</tbody>
				</table>
			</div>
		</body>
	</html>
	`;

	return mail_register;
};