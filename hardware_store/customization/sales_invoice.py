from __future__ import unicode_literals
import frappe
from frappe import _, msgprint
 

def custom_for_pos(self, method):
		if self.mode_of_payment == "Credit to account":
			self.is_pos = 0
			self.paid_amount = 0.0
			self.base_paid_amount = 0.0
			self.write_off_amount = 0.0
			self.outstanding_amount = self.base_grand_total 

@frappe.whitelist()
def get_items(price_list, sales_or_purchase, customer_group, item=None):
	condition = ""
	order_by = ""
	args = {"price_list": price_list}

	item_price_list =""
	if customer_group == "Credit Customers":
		item_price_list = "tabCredit Customers"
	elif customer_group == "Resellers":
		item_price_list = "tabReseller Customers"
	else:
		item_price_list = "tabRegular Customers"

	if sales_or_purchase == "Sales":
		condition = "i.is_sales_item=1"
	else:
		condition = "i.is_purchase_item=1"

	if item:
		# search serial no
		item_code = frappe.db.sql("""select name as serial_no, item_code
			from `tabSerial No` where name=%s""", (item), as_dict=1)
		if item_code:
			item_code[0]["name"] = item_code[0]["item_code"]
			return item_code

		# search barcode
		item_code = frappe.db.sql("""select name, item_code from `tabItem`
			where barcode=%s""",
			(item), as_dict=1)
		if item_code:
			item_code[0]["barcode"] = item
			return item_code

		condition += " and ((CONCAT(i.name, i.item_name) like %(name)s) or (i.variant_of like %(name)s) or (i.item_group like %(name)s))"
		order_by = """if(locate(%(_name)s, i.name), locate(%(_name)s, i.name), 99999),
			if(locate(%(_name)s, i.item_name), locate(%(_name)s, i.item_name), 99999),
			if(locate(%(_name)s, i.variant_of), locate(%(_name)s, i.variant_of), 99999),
			if(locate(%(_name)s, i.item_group), locate(%(_name)s, i.item_group), 99999),"""
		args["name"] = "%%%s%%" % frappe.db.escape(item)
		args["_name"] = item.replace("%", "")

	# original Code

	# locate function is used to sort by closest match from the beginning of the value
	# return frappe.db.sql("""select i.name, i.item_name, i.image,
	# 	item_det.price_list_rate, item_det.currency
	# 	from `tabItem` i LEFT JOIN
	# 		(select item_code, price_list_rate, currency from
	# 			`tabItem Price`	where price_list=%(price_list)s) item_det
	# 	ON
	# 		(item_det.item_code=i.name or item_det.item_code=i.variant_of)
	# 	where
	# 		i.has_variants = 0 and
	# 		{condition}
	# 	order by
	# 		{order_by}
	# 		i.name
	# 	limit 24""".format(condition=condition, order_by=order_by), args, as_dict=1) 

	#end of original code

	query = frappe.db.sql("""select DISTINCT i.name, i.item_name , i.image, reg.price_list_rate, 
		reg.uom, reg.minimum_qty  
		from `tabItem`as  i LEFT JOIN 
			(select parent , CONCAT(' ',uom_quantity, '-' ,TRUNCATE(rate, 2) ) as price_list_rate, min(minimum_qty) as minimum_qty, uom_quantity as uom  from 
						`{child_table}` where minimum_qty !=0 group by parent) reg 
		ON 
			(i.name = reg.parent or reg.parent=i.variant_of )
		where
			i.has_variants = 0 and
			{condition}
		order by
			{order_by}
			i.name
		limit 24""".format(condition=condition, order_by=order_by, child_table=item_price_list), args, as_dict=1)
	
	price_acc_to_uom =frappe.db.sql("""select i.name as item_code, ifnull(CONCAT(' ',reg.uom_quantity, '-' , TRUNCATE(reg.rate,2)), 0.0) rate, reg.minimum_qty 
			from `tabItem` i , `{0}` reg  
			where 
				i.name = reg.parent and (reg.name,reg.minimum_qty) in 
				(select reg.name, min(reg.minimum_qty) from `{0}` reg where reg.minimum_qty !=0  group by reg.parent, reg.uom_quantity)""" .format(item_price_list),as_dict=1)
	
	c = {}
	for d in price_acc_to_uom:
		c.setdefault(d['item_code'], []).append(d['rate'])
	
	for i in query:
		if i['item_name'] in c.keys():
			i['price_list_rate'] = c[i['item_name']]
	return query





