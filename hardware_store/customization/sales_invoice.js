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

 frappe.ui.form.on("Sales Invoice","onload",function(frm, doc, cdt, cdn){
 	var me = this;
 	if (cint(frappe.defaults.get_user_defaults("fs_pos_view"))===1)
						erpnext.pos.toggle(cur_frm, true);
	if(cur_frm.doc.__islocal){
		// cur_frm.set_value("customer","Rudy")
		frappe.call({
	 		method : "hardware_store.customization.customization.default_customer",
	 		callback:function(r) {
	 			if(r.message){
	 				console.log(JSON.stringify(r.message))
	 				cur_frm.set_value("customer",r.message[0]['name'])
	 			}
	 		}
	 	})
 	}
	
 })

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
