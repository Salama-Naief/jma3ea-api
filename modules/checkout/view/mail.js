module.exports.mail_checkout = function (checkout, custom) {
	const lang = custom.lang;
	const local = custom.local;
	const setting = custom.settings;
	const symbol = custom.authorizationObject.currency[custom.lang];
	let mail_checkout = `
	<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
	<html xmlns="http://www.w3.org/1999/xhtml">
		<head>
			<meta http-equiv="Content-Type" content="text/html; charset=utf-8" />
			<meta name="viewport" content="width=device-width, initial-scale=1.0"/>
			<meta name="format-detection" content="telephone=no" />
			<meta http-equiv="X-UA-Compatible" content="IE=edge" />
			<title>Email Checkout Products</title>
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
				table {
					border-collapse: collapse;
					mso-table-lspace: 0px;
					mso-table-rspace: 0px;
					width: 100%;
				}
				td {
					border: #888888 thin;
					border-collapse: collapse;
					mso-line-height-rule: exactly;
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
					th[class=price]{
						width:50px !important;
					}
					th[class=qty]{
						width:30px !important;
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
					td{
						padding:0px 5px !important;
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
											<td height="48"><img src="${custom.config.site_base_url}/assets/img/logo.png" height="48" /></td>
										</tr>
									</tbody>
								</table>
								<div>
									${local.dear} ${checkout.user_data.fullname}
									<br />
									${local.mail.checkout_this_paid_items}
									<br />
									${local.mail.checkout_items_in_cart}
									<br />
									<table>
										<thead>
											<tr>
												<th>&nbsp;</th>
												<th>
												</th>
												<th class="qty">
													${local.quantity}
												</th>
												<th class="price">
													${local.price}
												</th>
												<th class="price">
													${local.total}
												</th>
											</tr>
										</thead>
										<tbody>`;
	for (const s of Object.keys(checkout.products)) {
		for (const i of checkout.products[s]) {
			mail_checkout += `<tr>
													<td>
														<img src="${i.picture}?w=48&h=48" />
													</td>
													<td>
														${ i.name[lang] }
													</td>
													<td>
														${ i.quantity }
													</td>
													<td>
														${ i.price }
														${ symbol }
													</td>
													<td>
													
													</td>
												</tr>`
		}
	}

	mail_checkout += `</tbody>
										<tfoot>
											<tr>
												<td colspan="5">
													${ local.shipping_cost }
													:
													${ checkout.shipping_cost }
													${ symbol }
												</td>
											</tr>
											<tr>
												<td colspan="5">
													${ local.discount }
													:
													${ checkout.coupon.value }
													${ symbol }
												</td>
											</tr>
											<tr>
												<td colspan="5">
													${ local.order_id }
													:
													${ checkout.order_id }
												</td>
											</tr>
											<tr>
												<td colspan="5">
													${ local.order_date }
													:
													${ checkout.created }
												</td>
											</tr>
											<tr>
												<td colspan="5">
													${ local.total }
													:
													${ checkout.total }
													${ symbol }
												</td>
											</tr>
											<tr>
												<td colspan="5">
													${ local.the_payment_method }
													:
													${ checkout.payment_method.name }
												</td>
											</tr>
										</tfoot>
									</table>
									<br />
									<table>
										<tbody>`;
	if (checkout.payment_details) {
		for (pdk of Object.keys(checkout.payment_details)) {
			mail_checkout += `<tr>
														<td>
															${pdk}
														</td>
														<td>
															${checkout.payment_details[pdk]}
														</td>
													</tr>`;

		}
	}

	mail_checkout += `</tbody>
									</table>
									<br /><span class="HOEnZb"><span style="color: #888888;">${ setting.site_name[lang] }</span></span>
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

	return mail_checkout;
};