frappe.ui.form.on("Sales Invoice Item","qty",function(doc, cdt, cdn){
	cur_doc = cur_frm.doc
	customer_group = cur_doc.customer_group
	var item = locals[cdt][cdn];
	if(item.qty && customer_group == "Regular Customers"){
		get_rate_from_item(item, customer_group)
	}
	else if(item.qty && customer_group == "Credit Customers"){
		get_rate_from_item(item, customer_group)
	}
	else {
		get_rate_from_item(item, customer_group)
	}

})

function get_rate_from_item (item, customer_group) {
	args ={}
	args['item_name'] = item.item_code || item.item_name
	args['qty'] = item.qty
	args['customer_group'] = customer_group
	return frappe.call({
		method : "hardware_store.customization.quotation.rate",
		args : { args },
		callback:function(r){
			if(r.message) {
				item.rate =r.message[0]['rate']
			}
		}
	})
}


 // frappe.ui.form.on("Sales Invoice","additional_discount_percentage",function(doc, dt, dn){
 // 	sales_invoice = frappe.get_doc(dt, dn)
	// return frappe.call({
 // 		method : "hardware_store.hardware_store.doctype.configuration.configuration.discount_limit",
 // 		callback:function(r) {
 // 			if(r.message){
 // 				if(r.message >= sales_invoice.net_total){
 // 					msgprint("To apply Discount , Net total should be greater the limit specified in configuration ")
 // 					// cur_frm.set_value("additional_discount_percentage", 0.0)
 // 				} 
 // 			}
 // 		}
 // 	})
 // })



 frappe.ui.form.on("Sales Invoice","onload",function(doc, cdt, cdn){
 	var me = this;
 	if (cint(frappe.defaults.get_user_defaults("fs_pos_view"))===1)
						erpnext.pos.toggle(cur_frm, true);
 })

// frappe.ui.form.on("Sales Invoice","refresh",function(doc, cdt, cdn){
// 	if(cur_frm.doc.__islocal){
// 	 return frappe.call({
// 			method : "hardware_store.hardware_store.doctype.configuration.configuration.currency_data",
// 			callback:function(r) {
// 				if(r.message){
// 					cur_frm.set_value("currency",r.message[0])
// 					cur_frm.set_value("conversion_rate",flt(r.message[2]))
// 					// refresh_field('conversion_rate');
// 					// refresh_field("currency","conversion_rate");
// 					}
// 				}
// 	 		})
// 	}
//  })


