module.exports = {
	cart_has_not_products: 'السلة لا تحتوي على منتجات',
	cart_coupon_added: 'تم إضافة الكوبون',
	cart_coupon_unavailable: 'الكوبون غير متاح',
	cart_product_added: 'تم إضافة المنتج إلى السلة',
	cart_product_exceeded_allowed: 'عفوا هذه الكمية أكبر من المسموح به لهذا المنتج',
	cart_product_exceeded_allowed_updated: 'عفوا هذه الكمية أكبر من المسموح به لهذا المنتج, تم تحديث الكمية',
	cart_product_exists: 'هذا المنتج موجود بالفعل في السلة',
	cart_product_not: 'المنتج غير موجود بالسلة',
	cart_product_removed: 'تم حذف المنتج',
	cart_product_unavailable: 'المنتج غير متاح',
	choose_city_first: 'إختر المدينة أولاً',
	city_is_not_exists: 'المدينة غير موجودة',
	dear: 'عزيزي',
	deleted_done: 'تم الحذف بنجاح',
	device_added: 'تم إضافة الجهاز بنجاح',
	device_removed: 'تم حذف الجهاز بنجاح',
	direction: 'rtl',
	discount: 'الخصم',
	evaluated_before: 'هذا الطلب تم تقييمه من قبل',
	failed_auth: 'خطأ في التحقق',
	failed_auth_app: 'خطأ في التحقق من التطبيق',
	failed_auth_user: 'خطا في التحقق من بيانات المستخدم',
	failed_create_auth_app: 'حدث خطأ أثناء إنشاء مفتاح جديد',
	hash_error: 'المفتاح غير صالح',
	id_not_valid: 'المعرف غير صالح',
	logout_done: 'تم تسجيل الخروج بنجاح',
	new_order: 'طلب شراء',
	no_data_found: 'لا يوجد بيانات',
	no_enough_points: 'لا يوجد نقاط كافية',
	no_user_found: 'هذا المستخدم غير مسجل',
	no_settings: 'لا يوجد إعدادات',
	no_token: 'لا يوجد مفتاح',
	order_date: 'تاريخ الطلب',
	order_id: 'رقم الطلب',
	password_has_been_updated: 'تم تحديث كلمة المرور بنجاح',
	price: 'السعر',
	quantity: 'الكمية',
	saved_done: 'تم الحفظ بنجاح',
	shipping_cost: 'تكلفة الشحن',
	subtotal: 'إجمالي المنتجات',
	the_payment_method: 'وسيلة الدفع',
	total: 'الإجمالي',
	unexpected_error: 'خطأ غير متوقع',
	unauthorized_user: "أنت لا تملك صلاحيات الدخول إلى هذه الصفحة",
	payment_method: {
		cod: 'الدفع عند الإستلام',
		knet: 'الدفع ببطاقة الكي نت',
		points: 'الدفع بنظام نقاطي',
	},
	order_status_list: {
		"0": 'لم يتم التأكيد',
		"1": 'معلق',
		"2": 'جاري التجهيز',
		"3": 'تم شحن الطلب',
		"4": 'مكتمل',
		"5": 'ملغي',
		"6": 'مرفوض',
		"7": 'إلغاء عكس الطلب',
		"8": 'مردود',
		"9": 'تم عكس الطلب',
		"10": 'إعادة جزء من المبلغ',
		"11": 'إعادة كامل المبلغ',
		"12": 'تم التجهيز',
		"13": 'انتهاء الوقت',
		"14": 'الطلب باطل',
	},
	mail: {
		checkout_items_in_cart: 'المنتجات الموجود في السلة الخاصة بك',
		checkout_this_paid_items: 'لقد قمت بشراء بعض المنتجات من موقعنا, إليك التفاصيل',
		forgotpassword_c_b: 'لإعادة ضبط كلمة مرورك ، يرجى اتباع الرابط أدناه',
		forgotpassword_q: 'نسيت كلمة المرور؟',
		forgotpassword_thanks: 'شكراً لكم',
		reset_password_link_sent: 'تم إرسال رابط إعادة تعيين كلمة المرور إلى بريدك الإلكتروني ، تحقق من بريدك الإلكتروني.',
		reset_password_subject: 'إعادة تعيين كلمة المرور',
		registerion_subject: `تسجيل مستخدم جديد`,
		registerion_message: `
        <table align="center" cellpadding="0" cellspacing="0" dir="rtl">
	<tbody>
		<tr>
			<td>مرحبــاً {fullname}،
            <p>للدخول إلى حسابك على {site_name}،
             اضغط على رابط <a href="{login_url}" target="_blank">دخول</a> أو 
             <a href="{profile_url}" target="_blank">حسابي </a>في أعلى الصفحة، ثم قم بإدخال بريدك الإلكتروني وكلمة السر .</p>
			<p>هام: إسم المستخدم الخاص بك حالياً هو: {username}<br />
             إسم المستخدم الخاص بك مُعلن و سيتم إستخدامه في رابط عنوان صفحتك الشخصية،
             إسم صفحتك الشخصية، و مربوط مع السلع اللتي ستقوم بشرائها
            </p>

			<ul>
				<li>عند دخولك إلى حسابك، سوف تستطيـع القيـام بالامور التاليـة:</li>
				<li>ستكون عملية الشراء بكاملها أسرع.</li>
				<li>سيكون بمقدورك متابعة طلباتك .</li>
				<li>بإمكانك استعراض الطلبات السابقة.</li>
				<li>سيكون باستطاعتك تغيير معلومات حسابك في أي وقت.</li>
				<li>بإمكانك تغيير كلمة السر متى شئت.</li>
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
                        اذا كنت بحاجة الى أية استفسارت أو مساندة أرسل ايميل الى {site_email} أو اتصل بنا على 
                        <strong>{site_phone}</strong>.</p>

						<p>التسوق معنا أسهل!<br />
						<a href="{site_url}" target="_blank">{site_name}</a></p>
						</td>
					</tr>
					<tr>
						<td>
						<table cellpadding="0" cellspacing="0" style="width:100%">
							<tbody>
								<tr>
									<td>
									<p>يرجى الإنتباه إلى أن الصفحة التي سيتم تحويلك إليها عبر أية رسالة إلكترونية صادرة من آب مارت أونلاين هي صفحة حسابك. كذلك، نود لفت نظرك إلى أن آب مارت أونلاين لن يقوم بتحويلك إلى صفحة غير موجودة على موقع آب مارت أونلاين.</p>
									<p>تعاونك معنا هو أهم وسيلة للحفاظ على نزاهة تعاملاتك عبر آب مارت أونلاين و على سرية معلوماتك و خصوصيتك.</p>
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