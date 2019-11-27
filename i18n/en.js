module.exports = {
	cart_coupon_added: 'Coupon has been added',
	cart_coupon_unavailable: 'Coupon is unavailable',
	cart_has_not_products: 'Your cart has no products',
	cart_product_added: 'Product has been added to cart',
	cart_product_exceeded_allowed: 'Sorry you have exceeded the maximum allowed quantity',
	cart_product_exceeded_allowed_updated: 'Sorry you have exceeded the maximum allowed quantity, Quantity has been updated',
	cart_product_exists: 'Product is already exists in cart',
	cart_product_not: 'Product is not in cart',
	cart_product_removed: 'Product has been removed',
	cart_product_unavailable: 'Product is unavailable',
	choose_city_first: 'Choose city first',
	city_is_not_exists: 'City is not exists',
	dear: 'Dear',
	deleted_done: 'Item has been deleted successfully.',
	device_added: 'Device has been added successfully',
	device_removed: 'Device has been removed successfully',
	direction: 'ltr',
	discount: 'Discount',
	evaluated_before: 'This order is evaluated before',
	failed_auth: 'Failed to authenticate token.',
	failed_auth_app: 'There was a problem checking the application.',
	failed_auth_user: 'There was a problem checking user credentials.',
	failed_create_auth_app: 'There was a problem registering the application.',
	id_not_valid: 'Id is not valid',
	new_order: 'New Order',
	no_data_found: 'No data found',
	no_enough_points: 'There is no enough points',
	no_settings: 'No settings provided.',
	no_token: 'No token provided.',
	order_id: 'Order Number',
	password_has_been_updated: 'Password has been updated',
	price: 'Price',
	quantity: 'Quantity',
	saved_done: 'Item has been saved successfully.',
	shipping_cost: 'Shipping Cost',
	subtotal: 'Total Products',
	the_payment_method: 'Payment Method',
	total: 'Total',
	unexpected_error: 'Unexpected error',
	unauthorized_user: "You don't have permission to access this page",
	payment_method: {
		cod: 'Cash on delivery',
		knet: 'KNET Online Payment',
		ponts: 'Pay by Points',
	},
	order_status_list: {
		"0": 'Not confirmed',
		"1": 'Pending',
		"2": 'Processing',
		"3": 'Order has been shipped',
		"4": 'Completed',
		"5": 'Canceled',
		"6": 'Disapproved',
		"7": 'Reverse Request Revocation',
		"8": 'Returned',
		"9": 'Request reversed',
		"10": 'Return part of the amount',
		"11": 'Full refund',
		"12": 'Prepared',
		"13": 'Time is up',
		"14": 'Request is invalid',
	},
	mail: {
		checkout_items_in_cart: 'Products in your cart',
		checkout_this_paid_items: 'You have purchased some products from our website, here are the details',
		forgotpassword_c_b: 'To reset your password please follow the link below',
		forgotpassword_q: 'Forgot your password?',
		forgotpassword_thanks: 'Thanks.',
		reset_password_link_sent: 'Reset password link has been sent to your email, check your email.',
		reset_password_subject: 'Reset password',
		registerion_message: `
        <table align="center" cellpadding="0" cellspacing="0" dir="ltr">
   <tbody>
      <tr>
         <td>
            Hello {fullname},
                        
            <p> To access your account on {site_name},
                            Click the 
               <a href="{login_url}" target="_blank"> Sign in </a> link
                            
               <a href="{profile_url}" target="_blank"> My Account </a> at the top of the page, then enter your email address and password. 
            </p>
            <p> IMPORTANT: Your username is currently: {username} 
               <br />
                            Your username is declared and will be used in your personal page URL,
                            The name of your personal page, linked to the goods you will purchase
                           
            </p>
            <ul>
               <li> Once you've signed in to your account, you'll be able to: </li>
               <li> Your entire purchase will be faster. </li>
               <li> You will be able to follow up your requests. </li>
               <li> You can view previous requests. </li>
               <li> You will be able to change your account information at any time. </li>
               <li> You can change your password whenever you want. </li>
            </ul>
         </td>
      </tr>
   </tbody>
</table>
<table align="center" cellpadding="0" cellspacing="0" dir="rtl">
   <tbody>
      <tr>
         <td>
            <table cellpadding="0" style="width: 100%">
               <tbody>
                  <tr>
                     <td>
                        <p>
                           If you need any queries or support send an email to {site_email} or contact us at
                           <strong> {site_phone} </strong>. 
                        </p>
                        <p> Shopping with us is easier! 
                           <br />
                           <a href="{site_url}" target="_blank"> {site_name} </a>
                        </p>
                     </td>
                  </tr>
                  <tr>
                     <td>
                        <table cellpadding="0" cellspacing="0" style="width: 100%">
                           <tbody>
                              <tr>
                                 <td>
                                    <p> Please note that the page that will be forwarded to you via any e-mail issued by the Online Mart is your account page. Also, we would like to draw your attention to the fact that Ab Mart Online will not transfer you to a non-existent page on the Mart Online website. 
                                    </P>
                                    <p> Your cooperation with us is the most important way to maintain the integrity of your dealings with Ab Mart Online and to keep your information confidential. </p>
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
        `
	}
};