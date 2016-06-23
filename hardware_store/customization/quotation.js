frappe.ui.form.on("Quotation Item","qty",function(doc, cdt, cdn){
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
	args['item_name'] = item.item_code
	args['qty'] = item.qty
	args['customer_group'] = customer_group
	return frappe.call({
				method : "hardware_store.customization.quotation.rate",
				args : { args },
			callback:function(r) {
				if(r.message) {
					item.rate =r.message[0]['rate']
					}																																																																																																																																																																																																																																																																																																																																																																																																																																															}
				})
}

 