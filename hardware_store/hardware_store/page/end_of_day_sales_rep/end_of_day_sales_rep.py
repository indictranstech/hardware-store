# Copyright (c) 2015, Frappe Technologies Pvt. Ltd. and Contributors
# License: GNU General Public License v3. See license.txt

from __future__ import unicode_literals
import frappe
import frappe.defaults
from frappe.utils import flt, cstr, add_days, date_diff
from frappe.utils.csvutils import UnicodeWriter

@frappe.whitelist()
def get_sales_total(to_date):
	query = """SELECT  sum(grand_total) as grand_total, CONCAT('G',' ', TRUNCATE(sum(base_total), 2)) as base_total , posting_date 
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
				 		outstanding_amount <= 0
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
	query = """SELECT `item_name` ,sum(`rate`) as rate, CONCAT('G',' ',TRUNCATE(sum(`base_rate`),2)) as base_rate, `creation` 
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

@frappe.whitelist()
def create_csv(to_date):
	if not frappe.has_permission("Attendance", "create"):
		raise frappe.PermissionError

	args = frappe.local.form_dict

	w = UnicodeWriter()
	w = add_header(w)

	w = add_data(w, to_date)
	
	# write out response as a type csv
	frappe.response['result'] = cstr(w.getvalue())
	frappe.response['type'] = 'csv'
	frappe.response['doctype'] = "EOD Report"

def add_header(w):
	w.writerow(["End of day sales report"])
	return w

def add_data(w, to_date):

	sales_total = get_sales_total(to_date)
	if sales_total:
		w.writerow('\n')
		w.writerow(['Sales Total'])
		w.writerow(['', ' HTD', ' HTG'])
		for h in sales_total:
			row = (['', h['grand_total'], h['base_total']])
			w.writerow(row)

	payment = get_payment(to_date)
	if payment:
		w.writerow('\n')
		w.writerow(['Payment to Accounts'])
		w.writerow(['', 'Transaction Name', ' HTD', ' HTG', 'Mode of Payment'])
		for i in payment:
			row  = ['' , i['transction'], i['HTD'], i['HTG'], i['payment']]
			print row
			w.writerow(row)

	expense = get_expense(to_date)
	if expense:
		w.writerow('\n')
		w.writerow(['Expenses'])
		w.writerow(['', 'Expense Reason', ' HTD', ' HTG'])
		for j in expense:
			row = ['', j['expense_reason'], j['amount'], j['amount_htg']]
			w.writerow(row)

	currency_exchange =get_currency_exchange(to_date)
	if currency_exchange:
		w.writerow('\n')
		w.writerow(['Currency Exchange'])
		w.writerow(['', ' HTD', ' HTG'])
		for k in currency_exchange:
			row = ['', k['rate'], k['base_rate']]
			w.writerow(row)

	balance = get_balance(to_date)
	if balance:
		w.writerow('\n')
		w.writerow(['Balance'])
		w.writerow(['', 'Deposit HTD', 'Deposit HTG'])
		for l in balance:
			row = ['', l['deposit_htd'], l['deposit_htg']]
			w.writerow(row)
	return w