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



 frappe.ui.form.on("Sales Invoice","onload",function(frm, doc, cdt, cdn){
 	var me = this;
 	if (cint(frappe.defaults.get_user_defaults("fs_pos_view"))===1)
						erpnext.pos.toggle(cur_frm, true);
	// if(frm.doc.__islocal){
	// 	console.log("onload...........")
	// 	return frappe.call({
	// 		method : "hardware_store.hardware_store.doctype.configuration.configuration.currency_data",
	// 		callback:function(r) {
	// 			if(r.message){
	// 				console.log(r.message[0])
	// 				console.log(frm.doc.currency)
	// 				frm.doc.currency = r.message[0]
	// 				refresh_field('currency')
	// 				console.log(frm.doc.currency)
	// 				// cur_frm.set_value("currency",r.message[0])
	// 				// cur_frm.set_value("conversion_rate",flt(r.message[2]))
	// 				// refresh_field('conversion_rate');
	// 				// refresh_field("currency","conversion_rate");
	// 			}
	// 		}
 // 		})
	// }
 })

// frappe.ui.form.on("Sales Invoice","refresh",function(frm,doc, cdt, cdn){
// 	if(frm.doc.__islocal){
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

frappe.ui.form.on("Sales Invoice Item", {
	item_code: function(doc, cdt, cdn) {
		var item = frappe.get_doc(cdt, cdn);
		return frappe.call({
			method: "hardware_store.customization.item.get_item_uom",
			args: {
				item_code: item.item_code
			},
			callback(r) {
				item.uoms = r.message;
				cur_frm.refresh_fields();
			}
		})
	},

	uom: function(doc, cdt, cdn) {
		var item = frappe.get_doc(cdt, cdn);
		if(item.item_code && item.uom) {
			return cur_frm.call({
				method: "erpnext.stock.get_item_details.get_conversion_factor",
				child: item,
				args: {
					item_code: item.item_code,
					uom: item.uom
				},
				callback: function(r) {
					if(!r.exc) {
						custom_conversion_factor(cur_frm.doc, cdt, cdn);
					}
				}
			});
		}
	},

	qty_in_uom: function(doc, cdt, cdn) {
		custom_conversion_factor(doc, cdt, cdn)
		cur_frm.refresh_fields()
	},

	conversion_factor: function(doc, cdt, cdn) {
		custom_conversion_factor(doc, cdt, cdn)
		cur_frm.refresh_fields()
	},
});

custom_conversion_factor = function(doc, cdt, cdn) {
	if(frappe.meta.get_docfield(cdt, "qty_in_uom", cdn)) {
		var item = frappe.get_doc(cdt, cdn);
		frappe.model.round_floats_in(item, ["qty_in_uom", "conversion_factor"]);
		item.qty = flt(item.qty_in_uom * item.conversion_factor, precision("qty_in_uom", item));
	}
}
