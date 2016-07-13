# Copyright (c) 2015, Frappe Technologies Pvt. Ltd. and Contributors
# License: GNU General Public License v3. See license.txt

from __future__ import unicode_literals
import frappe
import frappe.defaults
from frappe.utils import flt, cstr, add_days, date_diff
from frappe.utils.csvutils import UnicodeWriter

@frappe.whitelist()
def get_sales_total(to_date):
	query = """SELECT  sum(grand_total) as grand_total, CONCAT('G',' ', TRUNCATE(sum(base_total),2)) as base_total, posting_date 
				from 
					`tabSales Invoice` 
				where 
						posting_date = '%s' 
					and 
						docstatus = 1""" %(to_date)
	return frappe.db.sql(query,as_dict=1)

@frappe.whitelist()
def get_payment(to_date):
	query = """SELECT COALESCE(name, 'TOTAL') AS transction, sum(grand_total) as HTD, CONCAT('G',' ', TRUNCATE(sum(base_total),2)) as HTG , COALESCE(mode_of_payment,"") as payment FROM `tabSales Invoice`
				 WHERE 
				 		posting_date= '%s' 
				 	and
				 		docstatus =1
				 GROUP BY 
				 	name WITH ROLLUP""" %(to_date)
	return frappe.db.sql(query,as_dict=1)

@frappe.whitelist()
def get_expense(to_date):
	query = """SELECT COALESCE(expense_reasons, 'TOTAL') AS expense_reason, SUM(expense_amount) as amount, CONCAT('G',' ', TRUNCATE(SUM(expense_amount *5),2)) as amount_htg
				FROM 
					`tabExpense Entries` 
				WHERE 
					date(creation)= '%s' 
				GROUP BY 
					expense_reasons WITH ROLLUP""" %(to_date)
	return frappe.db.sql(query,as_dict=1)

@frappe.whitelist()
def get_currency_exchange(to_date):
	query = """SELECT `item_name` ,sum(`rate`) as rate,CONCAT('G',' ',TRUNCATE(sum(`base_rate`),2)) as base_rate,`creation` 
				from 
					`tabSales Invoice Item` 
				where 
						docstatus =1 
					and 
						item_name ="Money Convertor" 
					and 
						item_code is NULL 
					and 
						Date(creation)='%s' 
				group by 
					item_name""" %(to_date)
	return frappe.db.sql(query,as_dict=1)

@frappe.whitelist()
def get_balance(to_date):
	query =  """SELECT
				(sales.grand_total + pay.HTD - exp.amount - money.rate) as deposit_htd, 
				CONCAT('G',' ', TRUNCATE((sales.base_total + pay.HTG - exp.amount_htg - money.base_rate),2))  as deposit_htg
			from 
				(
					SELECT  ifnull(sum(grand_total),0.0) as grand_total, ifnull(sum(base_total),0.0) as base_total 
						FROM 
							`tabSales Invoice` 
						where 
								posting_date = '%s' 
							and 
								docstatus = 1) as sales ,
				 (
					SELECT ifnull(sum(grand_total),0.0) as HTD, ifnull(sum(base_total),0.0) as HTG 
						FROM 
							`tabSales Invoice`
						WHERE 	
							 	posting_date = '%s'
						) as pay ,
				(
					SELECT  ifnull(SUM(expense_amount),0.0) as amount, ifnull(SUM(expense_amount *5),0.0) as amount_htg
						FROM 
							`tabExpense Entries` 
						WHERE 
							date(creation)= '%s' ) as exp,
				(
					SELECT ifnull(sum(`rate`),0.0) as rate, ifnull(sum(`base_rate`),0.0) as base_rate, `creation` 
						FROM 
							`tabSales Invoice Item` 
						where 
								docstatus =1 
							and 
								item_name ="Money Convertor" 
							and 
								item_code is NULL 
							and 
								Date(creation)= '%s' ) as money
							""" %(to_date, to_date, to_date, to_date)
	return frappe.db.sql(query,as_dict=1)

# @frappe.whitelist()
# def create_csv(to_date):
# 	sales_total = get_sales_total(to_date)
# 	payment = get_payment(to_date)
# 	expense = get_expense(to_date)
# 	currency_exchange =get_currency_exchange(to_date)
# 	balance = get_balance(to_date)
# 	print sales_total, payment, expense, currency_exchange, balance 

@frappe.whitelist()
def create_csv(to_date):
	if not frappe.has_permission("Attendance", "create"):
		raise frappe.PermissionError

	args = frappe.local.form_dict

	w = UnicodeWriter()
	w = add_header(w)

	# w = add_data(w, to_date)

	# write out response as a type csv
	frappe.response['result'] = cstr(w.getvalue())
	frappe.response['type'] = 'csv'
	frappe.response['doctype'] = "EOD Report"

def add_header(w):
	# status = ", ".join((frappe.get_meta("Attendance").get_field("status").options or "").strip().split("\n"))
	w.writerow(["End of day sales report"])
	# w.writerow(["Please do not change the template headings"])
	# # w.writerow(["Status should be one of these values: " + status])
	# w.writerow(["If you are overwriting existing attendance records, 'ID' column mandatory"])
	# w.writerow(["ID", "Employee", "Employee Name", "Date", "Status",
	# 	 "Company", "Naming Series"])
	return w

# def add_data(w, to_date):
# 	sales_total = get_sales_total(to_date)
# 	for sales_data in sales_total:
# 		w.write

# 	dates = get_dates(args)
# 	employees = get_active_employees()
# 	existing_attendance_records = get_existing_attendance_records(args)
# 	for date in dates:
# 		for employee in employees:
# 			existing_attendance = {}
# 			if existing_attendance_records \
# 				and tuple([date, employee.name]) in existing_attendance_records:
# 					existing_attendance = existing_attendance_records[tuple([date, employee.name])]
# 			row = [
# 				existing_attendance and existing_attendance.name or "",
# 				employee.name, employee.employee_name, date,
# 				existing_attendance and existing_attendance.status or "", employee.company,
# 				existing_attendance and existing_attendance.naming_series or get_naming_series(),
# 			]
# 			w.writerow(row)
# 	return w