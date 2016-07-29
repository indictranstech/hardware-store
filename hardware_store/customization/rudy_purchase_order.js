frappe.ui.form.on("Purchase Order Item", "item_code", function(frm,cdt,cdn) {
	var row = locals[cdt][cdn]
	// if(frm.doc.__islocal && frm.doc.supplier) {
	if(frm.doc.supplier) {
		frappe.call({
			method: "hardware_store.customization.rudy_purchase_order.get_buying_prices",
			args: {
				"supplier": frm.doc.supplier,
				"item": row.item_code
			},
			callback: function(r){
				if(r.message[0][0]) {
					row.last_buying_price = r.message[0][0]
					row.second_last_buying_price = r.message[0][1]
					row.avg_buying_price = r.message[2] / r.message[1]
				}
				else{
					row.last_buying_price = 0.0
					row.second_last_buying_price = 0.0
					row.avg_buying_price = 0.0
				}
			}
		});
	}

	if(!frm.doc.supplier){
		frappe.throw(__("Please select Supplier first"));
	} 
});
