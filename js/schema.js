import {escapeHtml} from './util.js';
function pluralize(base) {
  if (/[^aeiou]y$/i.test(base)) return base.slice(0, -1) + 'ies';
  if (/(s|x|z|ch|sh)$/i.test(base)) return base + 'es';
  return base + 's';
}

export const DOMAIN_SCHEMA_ASSETS = {
  Banking: {
    schema: "CREATE TABLE customers (customer_id INT PRIMARY KEY, customer_name VARCHAR(100), city VARCHAR(50), segment VARCHAR(30), joined_date DATE);\nCREATE TABLE account_products (product_id INT PRIMARY KEY, product_name VARCHAR(100), category VARCHAR(50), status VARCHAR(30), base_value NUMERIC(14,2));\nCREATE TABLE accounts (account_id INT PRIMARY KEY, customer_id INT REFERENCES customers(customer_id), product_id INT REFERENCES account_products(product_id), open_date DATE, status VARCHAR(30), balance NUMERIC(14,2));\nCREATE TABLE transactions (transaction_id INT PRIMARY KEY, account_id INT REFERENCES accounts(account_id), transaction_date DATE, transaction_type VARCHAR(40), quantity INT, amount NUMERIC(14,2), status VARCHAR(30));",
    sample: "INSERT INTO customers (customer_id,customer_name,city,segment,joined_date) VALUES\n(1,'Arun','Chennai','Premium','2024-01-01'),\n(2,'Meena','Madurai','Standard','2025-02-01'),\n(3,'Divya','Bengaluru','Enterprise','2024-03-01'),\n(4,'Karthik','Coimbatore','Student','2025-04-01'),\n(5,'Nila','Salem','Premium','2024-05-01'),\n(6,'Vijay','Hyderabad','Standard','2025-06-01'),\n(7,'Asha','Mumbai','Enterprise','2024-07-01'),\n(8,'Rahul','Pune','Student','2025-08-01'),\n(9,'Zoya','Chennai','Standard','2025-01-01');\nINSERT INTO account_products (product_id,product_name,category,status,base_value) VALUES\n(101,'Savings Plan','Savings','Active',5000),\n(102,'Current Plan','Current','Active',12500),\n(103,'Salary Plan','Salary','Active',20000),\n(104,'NRI Plan','NRI','Active',27500),\n(105,'Student Plan','Student','Inactive',35000),\n(106,'Business Plan','Business','Active',42500),\n(107,'Archived Plan','Savings','Inactive',5000);\nINSERT INTO accounts (account_id,customer_id,product_id,open_date,status,balance) VALUES\n(1001,1,101,'2025-01-10','Active',12000),\n(1002,2,102,'2025-02-14','Pending',25000),\n(1003,3,103,'2025-03-20','Closed',50000),\n(1004,4,104,'2025-05-05','Active',75000),\n(1005,5,105,'2025-07-18','Active',100000),\n(1006,6,106,'2025-09-01','Pending',150000),\n(1007,7,101,'2025-11-22','Closed',8000),\n(1008,8,102,'2026-01-15','Active',42000),\n(1009,1,103,'2026-02-10','Pending',68000),\n(1010,2,104,'2026-03-12','Closed',91000),\n(1011,3,105,'2026-04-25','Active',30000),\n(1012,4,106,'2026-05-30','Active',54000),\n(1013,5,101,'2026-07-08','Pending',110000),\n(1014,6,102,'2026-08-19','Closed',18000),\n(1015,1,101,'2025-04-10','Active',25000),\n(1016,2,102,'2024-05-10','Active',35000);\nINSERT INTO transactions (transaction_id,account_id,transaction_date,transaction_type,quantity,amount,status) VALUES\n(5001,1001,'2025-01-15','Credit',1,500,'Completed'),\n(5002,1002,'2025-01-30','Debit',2,1200,'Pending'),\n(5003,1003,'2025-02-20','Transfer',3,2500,'Failed'),\n(5004,1004,'2025-03-02','Fee',4,5000,'Completed'),\n(5005,1005,'2025-03-21','Credit',5,7500,'Completed'),\n(5006,1006,'2025-04-12','Debit',1,10000,'Completed'),\n(5007,1007,'2025-05-18','Transfer',2,15000,'Pending'),\n(5008,1008,'2025-06-05','Fee',3,22000,'Failed'),\n(5009,1009,'2025-07-19','Credit',4,3000,'Completed'),\n(5010,1010,'2025-08-22','Debit',5,8500,'Completed'),\n(5011,1011,'2025-09-10','Transfer',1,12500,'Completed'),\n(5012,1012,'2025-10-03','Fee',2,18000,'Pending'),\n(5013,1013,'2025-11-28','Credit',3,27000,'Failed'),\n(5014,1014,'2025-12-17','Debit',4,4200,'Completed'),\n(5015,1001,'2026-01-18','Transfer',5,6800,'Completed'),\n(5016,1002,'2026-02-12','Fee',1,9400,'Completed'),\n(5017,1003,'2026-03-14','Credit',2,16000,'Pending'),\n(5018,1004,'2026-04-28','Debit',3,21000,'Failed'),\n(5019,1005,'2026-05-11','Transfer',4,33000,'Completed'),\n(5020,1006,'2026-05-31','Fee',5,2800,'Completed'),\n(5021,1007,'2026-06-20','Credit',1,5600,'Completed'),\n(5022,1008,'2026-07-10','Debit',2,11200,'Pending'),\n(5023,1009,'2026-07-25','Transfer',3,14500,'Failed'),\n(5024,1010,'2026-08-21','Fee',4,26000,'Completed'),\n(5025,1011,'2026-08-30','Credit',5,3900,'Completed'),\n(5026,1012,'2026-09-03','Debit',1,7200,'Completed'),\n(5027,1013,'2026-09-08','Transfer',2,13500,'Pending'),\n(5028,1014,'2026-09-12','Fee',3,19500,'Failed'),\n(5029,1016,'2025-03-15','Credit',1,2500,'Completed');"
  },
  Healthcare: {
    schema: "CREATE TABLE patients (patient_id INT PRIMARY KEY, patient_name VARCHAR(100), city VARCHAR(50), segment VARCHAR(30), joined_date DATE);\nCREATE TABLE doctors (doctor_id INT PRIMARY KEY, doctor_name VARCHAR(100), category VARCHAR(50), status VARCHAR(30), base_value NUMERIC(14,2));\nCREATE TABLE appointments (appointment_id INT PRIMARY KEY, patient_id INT REFERENCES patients(patient_id), doctor_id INT REFERENCES doctors(doctor_id), appointment_date DATE, status VARCHAR(30), bill_amount NUMERIC(14,2));\nCREATE TABLE visits (visit_id INT PRIMARY KEY, appointment_id INT REFERENCES appointments(appointment_id), visit_date DATE, visit_type VARCHAR(40), quantity INT, amount NUMERIC(14,2), status VARCHAR(30));",
    sample: "INSERT INTO patients (patient_id,patient_name,city,segment,joined_date) VALUES\n(1,'Ravi','Chennai','Premium','2024-01-01'),\n(2,'Meena','Madurai','Standard','2025-02-01'),\n(3,'John','Bengaluru','Enterprise','2024-03-01'),\n(4,'Asha','Coimbatore','Student','2025-04-01'),\n(5,'Bharathi','Salem','Premium','2024-05-01'),\n(6,'Sahana','Hyderabad','Standard','2025-06-01'),\n(7,'Anu','Mumbai','Enterprise','2024-07-01'),\n(8,'Kavin','Pune','Student','2025-08-01'),\n(9,'Zoya','Chennai','Standard','2025-01-01');\nINSERT INTO doctors (doctor_id,doctor_name,category,status,base_value) VALUES\n(101,'Cardiology Specialist','Cardiology','Active',5000),\n(102,'Orthopedics Specialist','Orthopedics','Active',12500),\n(103,'Dermatology Specialist','Dermatology','Active',20000),\n(104,'Pediatrics Specialist','Pediatrics','Active',27500),\n(105,'Neurology Specialist','Neurology','Inactive',35000),\n(106,'General Specialist','General','Active',42500),\n(107,'Archived Specialist','Cardiology','Inactive',5000);\nINSERT INTO appointments (appointment_id,patient_id,doctor_id,appointment_date,status,bill_amount) VALUES\n(1001,1,101,'2025-01-10','Active',12000),\n(1002,2,102,'2025-02-14','Pending',25000),\n(1003,3,103,'2025-03-20','Closed',50000),\n(1004,4,104,'2025-05-05','Active',75000),\n(1005,5,105,'2025-07-18','Active',100000),\n(1006,6,106,'2025-09-01','Pending',150000),\n(1007,7,101,'2025-11-22','Closed',8000),\n(1008,8,102,'2026-01-15','Active',42000),\n(1009,1,103,'2026-02-10','Pending',68000),\n(1010,2,104,'2026-03-12','Closed',91000),\n(1011,3,105,'2026-04-25','Active',30000),\n(1012,4,106,'2026-05-30','Active',54000),\n(1013,5,101,'2026-07-08','Pending',110000),\n(1014,6,102,'2026-08-19','Closed',18000),\n(1015,1,101,'2025-04-10','Active',25000),\n(1016,2,102,'2024-05-10','Active',35000);\nINSERT INTO visits (visit_id,appointment_id,visit_date,visit_type,quantity,amount,status) VALUES\n(5001,1001,'2025-01-15','Consultation',1,500,'Completed'),\n(5002,1002,'2025-01-30','Review',2,1200,'Pending'),\n(5003,1003,'2025-02-20','Procedure',3,2500,'Failed'),\n(5004,1004,'2025-03-02','Emergency',4,5000,'Completed'),\n(5005,1005,'2025-03-21','Consultation',5,7500,'Completed'),\n(5006,1006,'2025-04-12','Review',1,10000,'Completed'),\n(5007,1007,'2025-05-18','Procedure',2,15000,'Pending'),\n(5008,1008,'2025-06-05','Emergency',3,22000,'Failed'),\n(5009,1009,'2025-07-19','Consultation',4,3000,'Completed'),\n(5010,1010,'2025-08-22','Review',5,8500,'Completed'),\n(5011,1011,'2025-09-10','Procedure',1,12500,'Completed'),\n(5012,1012,'2025-10-03','Emergency',2,18000,'Pending'),\n(5013,1013,'2025-11-28','Consultation',3,27000,'Failed'),\n(5014,1014,'2025-12-17','Review',4,4200,'Completed'),\n(5015,1001,'2026-01-18','Procedure',5,6800,'Completed'),\n(5016,1002,'2026-02-12','Emergency',1,9400,'Completed'),\n(5017,1003,'2026-03-14','Consultation',2,16000,'Pending'),\n(5018,1004,'2026-04-28','Review',3,21000,'Failed'),\n(5019,1005,'2026-05-11','Procedure',4,33000,'Completed'),\n(5020,1006,'2026-05-31','Emergency',5,2800,'Completed'),\n(5021,1007,'2026-06-20','Consultation',1,5600,'Completed'),\n(5022,1008,'2026-07-10','Review',2,11200,'Pending'),\n(5023,1009,'2026-07-25','Procedure',3,14500,'Failed'),\n(5024,1010,'2026-08-21','Emergency',4,26000,'Completed'),\n(5025,1011,'2026-08-30','Consultation',5,3900,'Completed'),\n(5026,1012,'2026-09-03','Review',1,7200,'Completed'),\n(5027,1013,'2026-09-08','Procedure',2,13500,'Pending'),\n(5028,1014,'2026-09-12','Emergency',3,19500,'Failed'),\n(5029,1016,'2025-03-15','Consultation',1,2500,'Completed');"
  },
  Insurance: {
    schema: "CREATE TABLE customers (customer_id INT PRIMARY KEY, customer_name VARCHAR(100), city VARCHAR(50), segment VARCHAR(30), joined_date DATE);\nCREATE TABLE insurance_products (product_id INT PRIMARY KEY, product_name VARCHAR(100), category VARCHAR(50), status VARCHAR(30), base_value NUMERIC(14,2));\nCREATE TABLE policies (policy_id INT PRIMARY KEY, customer_id INT REFERENCES customers(customer_id), product_id INT REFERENCES insurance_products(product_id), start_date DATE, status VARCHAR(30), premium_amount NUMERIC(14,2));\nCREATE TABLE claims (claim_id INT PRIMARY KEY, policy_id INT REFERENCES policies(policy_id), claim_date DATE, claim_type VARCHAR(40), quantity INT, amount NUMERIC(14,2), status VARCHAR(30));",
    sample: "INSERT INTO customers (customer_id,customer_name,city,segment,joined_date) VALUES\n(1,'Arun','Chennai','Premium','2024-01-01'),\n(2,'Meena','Madurai','Standard','2025-02-01'),\n(3,'Divya','Bengaluru','Enterprise','2024-03-01'),\n(4,'Karthik','Coimbatore','Student','2025-04-01'),\n(5,'Nila','Salem','Premium','2024-05-01'),\n(6,'Vijay','Hyderabad','Standard','2025-06-01'),\n(7,'Asha','Mumbai','Enterprise','2024-07-01'),\n(8,'Rahul','Pune','Student','2025-08-01'),\n(9,'Zoya','Chennai','Standard','2025-01-01');\nINSERT INTO insurance_products (product_id,product_name,category,status,base_value) VALUES\n(101,'Health Plan','Health','Active',5000),\n(102,'Vehicle Plan','Vehicle','Active',12500),\n(103,'Life Plan','Life','Active',20000),\n(104,'Travel Plan','Travel','Active',27500),\n(105,'Home Plan','Home','Inactive',35000),\n(106,'Business Plan','Business','Active',42500),\n(107,'Archived Plan','Health','Inactive',5000);\nINSERT INTO policies (policy_id,customer_id,product_id,start_date,status,premium_amount) VALUES\n(1001,1,101,'2025-01-10','Active',12000),\n(1002,2,102,'2025-02-14','Pending',25000),\n(1003,3,103,'2025-03-20','Closed',50000),\n(1004,4,104,'2025-05-05','Active',75000),\n(1005,5,105,'2025-07-18','Active',100000),\n(1006,6,106,'2025-09-01','Pending',150000),\n(1007,7,101,'2025-11-22','Closed',8000),\n(1008,8,102,'2026-01-15','Active',42000),\n(1009,1,103,'2026-02-10','Pending',68000),\n(1010,2,104,'2026-03-12','Closed',91000),\n(1011,3,105,'2026-04-25','Active',30000),\n(1012,4,106,'2026-05-30','Active',54000),\n(1013,5,101,'2026-07-08','Pending',110000),\n(1014,6,102,'2026-08-19','Closed',18000),\n(1015,1,101,'2025-04-10','Active',25000),\n(1016,2,102,'2024-05-10','Active',35000);\nINSERT INTO claims (claim_id,policy_id,claim_date,claim_type,quantity,amount,status) VALUES\n(5001,1001,'2025-01-15','Medical',1,500,'Completed'),\n(5002,1002,'2025-01-30','Accident',2,1200,'Pending'),\n(5003,1003,'2025-02-20','Theft',3,2500,'Failed'),\n(5004,1004,'2025-03-02','Damage',4,5000,'Completed'),\n(5005,1005,'2025-03-21','Medical',5,7500,'Completed'),\n(5006,1006,'2025-04-12','Accident',1,10000,'Completed'),\n(5007,1007,'2025-05-18','Theft',2,15000,'Pending'),\n(5008,1008,'2025-06-05','Damage',3,22000,'Failed'),\n(5009,1009,'2025-07-19','Medical',4,3000,'Completed'),\n(5010,1010,'2025-08-22','Accident',5,8500,'Completed'),\n(5011,1011,'2025-09-10','Theft',1,12500,'Completed'),\n(5012,1012,'2025-10-03','Damage',2,18000,'Pending'),\n(5013,1013,'2025-11-28','Medical',3,27000,'Failed'),\n(5014,1014,'2025-12-17','Accident',4,4200,'Completed'),\n(5015,1001,'2026-01-18','Theft',5,6800,'Completed'),\n(5016,1002,'2026-02-12','Damage',1,9400,'Completed'),\n(5017,1003,'2026-03-14','Medical',2,16000,'Pending'),\n(5018,1004,'2026-04-28','Accident',3,21000,'Failed'),\n(5019,1005,'2026-05-11','Theft',4,33000,'Completed'),\n(5020,1006,'2026-05-31','Damage',5,2800,'Completed'),\n(5021,1007,'2026-06-20','Medical',1,5600,'Completed'),\n(5022,1008,'2026-07-10','Accident',2,11200,'Pending'),\n(5023,1009,'2026-07-25','Theft',3,14500,'Failed'),\n(5024,1010,'2026-08-21','Damage',4,26000,'Completed'),\n(5025,1011,'2026-08-30','Medical',5,3900,'Completed'),\n(5026,1012,'2026-09-03','Accident',1,7200,'Completed'),\n(5027,1013,'2026-09-08','Theft',2,13500,'Pending'),\n(5028,1014,'2026-09-12','Damage',3,19500,'Failed'),\n(5029,1016,'2025-03-15','Medical',1,2500,'Completed');"
  },
  "Capital Markets": {
    schema: "CREATE TABLE investors (investor_id INT PRIMARY KEY, investor_name VARCHAR(100), city VARCHAR(50), segment VARCHAR(30), joined_date DATE);\nCREATE TABLE securities (security_id INT PRIMARY KEY, security_name VARCHAR(100), category VARCHAR(50), status VARCHAR(30), base_value NUMERIC(14,2));\nCREATE TABLE holdings (holding_id INT PRIMARY KEY, investor_id INT REFERENCES investors(investor_id), security_id INT REFERENCES securities(security_id), acquired_date DATE, status VARCHAR(30), market_value NUMERIC(14,2));\nCREATE TABLE trades (trade_id INT PRIMARY KEY, holding_id INT REFERENCES holdings(holding_id), trade_date DATE, trade_type VARCHAR(40), quantity INT, amount NUMERIC(14,2), status VARCHAR(30));",
    sample: "INSERT INTO investors (investor_id,investor_name,city,segment,joined_date) VALUES\n(1,'Aarav','Chennai','Premium','2024-01-01'),\n(2,'Diya','Madurai','Standard','2025-02-01'),\n(3,'Ishaan','Bengaluru','Enterprise','2024-03-01'),\n(4,'Mira','Coimbatore','Student','2025-04-01'),\n(5,'Kabir','Salem','Premium','2024-05-01'),\n(6,'Tara','Hyderabad','Standard','2025-06-01'),\n(7,'Rohan','Mumbai','Enterprise','2024-07-01'),\n(8,'Leela','Pune','Student','2025-08-01'),\n(9,'Zoya','Chennai','Standard','2025-01-01');\nINSERT INTO securities (security_id,security_name,category,status,base_value) VALUES\n(101,'Equity Plan','Equity','Active',5000),\n(102,'Bond Plan','Bond','Active',12500),\n(103,'ETF Plan','ETF','Active',20000),\n(104,'REIT Plan','REIT','Active',27500),\n(105,'Commodity Plan','Commodity','Inactive',35000),\n(106,'Fund Plan','Fund','Active',42500),\n(107,'Archived Plan','Equity','Inactive',5000);\nINSERT INTO holdings (holding_id,investor_id,security_id,acquired_date,status,market_value) VALUES\n(1001,1,101,'2025-01-10','Active',12000),\n(1002,2,102,'2025-02-14','Pending',25000),\n(1003,3,103,'2025-03-20','Closed',50000),\n(1004,4,104,'2025-05-05','Active',75000),\n(1005,5,105,'2025-07-18','Active',100000),\n(1006,6,106,'2025-09-01','Pending',150000),\n(1007,7,101,'2025-11-22','Closed',8000),\n(1008,8,102,'2026-01-15','Active',42000),\n(1009,1,103,'2026-02-10','Pending',68000),\n(1010,2,104,'2026-03-12','Closed',91000),\n(1011,3,105,'2026-04-25','Active',30000),\n(1012,4,106,'2026-05-30','Active',54000),\n(1013,5,101,'2026-07-08','Pending',110000),\n(1014,6,102,'2026-08-19','Closed',18000),\n(1015,1,101,'2025-04-10','Active',25000),\n(1016,2,102,'2024-05-10','Active',35000);\nINSERT INTO trades (trade_id,holding_id,trade_date,trade_type,quantity,amount,status) VALUES\n(5001,1001,'2025-01-15','Buy',1,500,'Completed'),\n(5002,1002,'2025-01-30','Sell',2,1200,'Pending'),\n(5003,1003,'2025-02-20','Dividend',3,2500,'Failed'),\n(5004,1004,'2025-03-02','Split',4,5000,'Completed'),\n(5005,1005,'2025-03-21','Buy',5,7500,'Completed'),\n(5006,1006,'2025-04-12','Sell',1,10000,'Completed'),\n(5007,1007,'2025-05-18','Dividend',2,15000,'Pending'),\n(5008,1008,'2025-06-05','Split',3,22000,'Failed'),\n(5009,1009,'2025-07-19','Buy',4,3000,'Completed'),\n(5010,1010,'2025-08-22','Sell',5,8500,'Completed'),\n(5011,1011,'2025-09-10','Dividend',1,12500,'Completed'),\n(5012,1012,'2025-10-03','Split',2,18000,'Pending'),\n(5013,1013,'2025-11-28','Buy',3,27000,'Failed'),\n(5014,1014,'2025-12-17','Sell',4,4200,'Completed'),\n(5015,1001,'2026-01-18','Dividend',5,6800,'Completed'),\n(5016,1002,'2026-02-12','Split',1,9400,'Completed'),\n(5017,1003,'2026-03-14','Buy',2,16000,'Pending'),\n(5018,1004,'2026-04-28','Sell',3,21000,'Failed'),\n(5019,1005,'2026-05-11','Dividend',4,33000,'Completed'),\n(5020,1006,'2026-05-31','Split',5,2800,'Completed'),\n(5021,1007,'2026-06-20','Buy',1,5600,'Completed'),\n(5022,1008,'2026-07-10','Sell',2,11200,'Pending'),\n(5023,1009,'2026-07-25','Dividend',3,14500,'Failed'),\n(5024,1010,'2026-08-21','Split',4,26000,'Completed'),\n(5025,1011,'2026-08-30','Buy',5,3900,'Completed'),\n(5026,1012,'2026-09-03','Sell',1,7200,'Completed'),\n(5027,1013,'2026-09-08','Dividend',2,13500,'Pending'),\n(5028,1014,'2026-09-12','Split',3,19500,'Failed'),\n(5029,1016,'2025-03-15','Buy',1,2500,'Completed');"
  },
  Semiconductor: {
    schema: "CREATE TABLE clients (client_id INT PRIMARY KEY, client_name VARCHAR(100), city VARCHAR(50), segment VARCHAR(30), joined_date DATE);\nCREATE TABLE chip_products (product_id INT PRIMARY KEY, product_name VARCHAR(100), category VARCHAR(50), status VARCHAR(30), base_value NUMERIC(14,2));\nCREATE TABLE production_batches (batch_id INT PRIMARY KEY, client_id INT REFERENCES clients(client_id), product_id INT REFERENCES chip_products(product_id), production_date DATE, status VARCHAR(30), batch_cost NUMERIC(14,2));\nCREATE TABLE test_results (test_id INT PRIMARY KEY, batch_id INT REFERENCES production_batches(batch_id), test_date DATE, test_type VARCHAR(40), quantity INT, amount NUMERIC(14,2), status VARCHAR(30));",
    sample: "INSERT INTO clients (client_id,client_name,city,segment,joined_date) VALUES\n(1,'Orion Systems','Chennai','Premium','2024-01-01'),\n(2,'Nova Devices','Madurai','Standard','2025-02-01'),\n(3,'Vertex Labs','Bengaluru','Enterprise','2024-03-01'),\n(4,'Apex Mobility','Coimbatore','Student','2025-04-01'),\n(5,'Delta Controls','Salem','Premium','2024-05-01'),\n(6,'Zenith Tech','Hyderabad','Standard','2025-06-01'),\n(7,'Pixel Works','Mumbai','Enterprise','2024-07-01'),\n(8,'Quantum Auto','Pune','Student','2025-08-01'),\n(9,'Zoya','Chennai','Standard','2025-01-01');\nINSERT INTO chip_products (product_id,product_name,category,status,base_value) VALUES\n(101,'MCU Chip','MCU','Active',5000),\n(102,'Memory Chip','Memory','Active',12500),\n(103,'Sensor Chip','Sensor','Active',20000),\n(104,'Power Chip','Power','Active',27500),\n(105,'RF Chip','RF','Inactive',35000),\n(106,'Processor Chip','Processor','Active',42500),\n(107,'Archived Chip','MCU','Inactive',5000);\nINSERT INTO production_batches (batch_id,client_id,product_id,production_date,status,batch_cost) VALUES\n(1001,1,101,'2025-01-10','Active',12000),\n(1002,2,102,'2025-02-14','Pending',25000),\n(1003,3,103,'2025-03-20','Closed',50000),\n(1004,4,104,'2025-05-05','Active',75000),\n(1005,5,105,'2025-07-18','Active',100000),\n(1006,6,106,'2025-09-01','Pending',150000),\n(1007,7,101,'2025-11-22','Closed',8000),\n(1008,8,102,'2026-01-15','Active',42000),\n(1009,1,103,'2026-02-10','Pending',68000),\n(1010,2,104,'2026-03-12','Closed',91000),\n(1011,3,105,'2026-04-25','Active',30000),\n(1012,4,106,'2026-05-30','Active',54000),\n(1013,5,101,'2026-07-08','Pending',110000),\n(1014,6,102,'2026-08-19','Closed',18000),\n(1015,1,101,'2025-04-10','Active',25000),\n(1016,2,102,'2024-05-10','Active',35000);\nINSERT INTO test_results (test_id,batch_id,test_date,test_type,quantity,amount,status) VALUES\n(5001,1001,'2025-01-15','Functional',1,500,'Completed'),\n(5002,1002,'2025-01-30','Thermal',2,1200,'Pending'),\n(5003,1003,'2025-02-20','Voltage',3,2500,'Failed'),\n(5004,1004,'2025-03-02','Reliability',4,5000,'Completed'),\n(5005,1005,'2025-03-21','Functional',5,7500,'Completed'),\n(5006,1006,'2025-04-12','Thermal',1,10000,'Completed'),\n(5007,1007,'2025-05-18','Voltage',2,15000,'Pending'),\n(5008,1008,'2025-06-05','Reliability',3,22000,'Failed'),\n(5009,1009,'2025-07-19','Functional',4,3000,'Completed'),\n(5010,1010,'2025-08-22','Thermal',5,8500,'Completed'),\n(5011,1011,'2025-09-10','Voltage',1,12500,'Completed'),\n(5012,1012,'2025-10-03','Reliability',2,18000,'Pending'),\n(5013,1013,'2025-11-28','Functional',3,27000,'Failed'),\n(5014,1014,'2025-12-17','Thermal',4,4200,'Completed'),\n(5015,1001,'2026-01-18','Voltage',5,6800,'Completed'),\n(5016,1002,'2026-02-12','Reliability',1,9400,'Completed'),\n(5017,1003,'2026-03-14','Functional',2,16000,'Pending'),\n(5018,1004,'2026-04-28','Thermal',3,21000,'Failed'),\n(5019,1005,'2026-05-11','Voltage',4,33000,'Completed'),\n(5020,1006,'2026-05-31','Reliability',5,2800,'Completed'),\n(5021,1007,'2026-06-20','Functional',1,5600,'Completed'),\n(5022,1008,'2026-07-10','Thermal',2,11200,'Pending'),\n(5023,1009,'2026-07-25','Voltage',3,14500,'Failed'),\n(5024,1010,'2026-08-21','Reliability',4,26000,'Completed'),\n(5025,1011,'2026-08-30','Functional',5,3900,'Completed'),\n(5026,1012,'2026-09-03','Thermal',1,7200,'Completed'),\n(5027,1013,'2026-09-08','Voltage',2,13500,'Pending'),\n(5028,1014,'2026-09-12','Reliability',3,19500,'Failed'),\n(5029,1016,'2025-03-15','Functional',1,2500,'Completed');"
  },
  Education: {
    schema: "CREATE TABLE students (student_id INT PRIMARY KEY, student_name VARCHAR(100), city VARCHAR(50), segment VARCHAR(30), joined_date DATE);\nCREATE TABLE courses (course_id INT PRIMARY KEY, course_name VARCHAR(100), category VARCHAR(50), status VARCHAR(30), base_value NUMERIC(14,2));\nCREATE TABLE enrollments (enrollment_id INT PRIMARY KEY, student_id INT REFERENCES students(student_id), course_id INT REFERENCES courses(course_id), enrollment_date DATE, status VARCHAR(30), course_fee NUMERIC(14,2));\nCREATE TABLE assessments (assessment_id INT PRIMARY KEY, enrollment_id INT REFERENCES enrollments(enrollment_id), assessment_date DATE, assessment_type VARCHAR(40), quantity INT, amount NUMERIC(14,2), status VARCHAR(30));",
    sample: "INSERT INTO students (student_id,student_name,city,segment,joined_date) VALUES\n(1,'Bharathi','Chennai','Premium','2024-01-01'),\n(2,'Sahana','Madurai','Standard','2025-02-01'),\n(3,'Anu','Bengaluru','Enterprise','2024-03-01'),\n(4,'Kavin','Coimbatore','Student','2025-04-01'),\n(5,'Priya','Salem','Premium','2024-05-01'),\n(6,'Rahul','Hyderabad','Standard','2025-06-01'),\n(7,'Meera','Mumbai','Enterprise','2024-07-01'),\n(8,'Vikram','Pune','Student','2025-08-01'),\n(9,'Zoya','Chennai','Standard','2025-01-01');\nINSERT INTO courses (course_id,course_name,category,status,base_value) VALUES\n(101,'SQL Course','SQL','Active',5000),\n(102,'Python Course','Python','Active',12500),\n(103,'Databricks Course','Databricks','Active',20000),\n(104,'Power BI Course','Power BI','Active',27500),\n(105,'Data Modeling Course','Data Modeling','Inactive',35000),\n(106,'Cloud Course','Cloud','Active',42500),\n(107,'Archived Course','SQL','Inactive',5000);\nINSERT INTO enrollments (enrollment_id,student_id,course_id,enrollment_date,status,course_fee) VALUES\n(1001,1,101,'2025-01-10','Active',12000),\n(1002,2,102,'2025-02-14','Pending',25000),\n(1003,3,103,'2025-03-20','Closed',50000),\n(1004,4,104,'2025-05-05','Active',75000),\n(1005,5,105,'2025-07-18','Active',100000),\n(1006,6,106,'2025-09-01','Pending',150000),\n(1007,7,101,'2025-11-22','Closed',8000),\n(1008,8,102,'2026-01-15','Active',42000),\n(1009,1,103,'2026-02-10','Pending',68000),\n(1010,2,104,'2026-03-12','Closed',91000),\n(1011,3,105,'2026-04-25','Active',30000),\n(1012,4,106,'2026-05-30','Active',54000),\n(1013,5,101,'2026-07-08','Pending',110000),\n(1014,6,102,'2026-08-19','Closed',18000),\n(1015,1,101,'2025-04-10','Active',25000),\n(1016,2,102,'2024-05-10','Active',35000);\nINSERT INTO assessments (assessment_id,enrollment_id,assessment_date,assessment_type,quantity,amount,status) VALUES\n(5001,1001,'2025-01-15','Quiz',1,500,'Completed'),\n(5002,1002,'2025-01-30','Assignment',2,1200,'Pending'),\n(5003,1003,'2025-02-20','Project',3,2500,'Failed'),\n(5004,1004,'2025-03-02','Exam',4,5000,'Completed'),\n(5005,1005,'2025-03-21','Quiz',5,7500,'Completed'),\n(5006,1006,'2025-04-12','Assignment',1,10000,'Completed'),\n(5007,1007,'2025-05-18','Project',2,15000,'Pending'),\n(5008,1008,'2025-06-05','Exam',3,22000,'Failed'),\n(5009,1009,'2025-07-19','Quiz',4,3000,'Completed'),\n(5010,1010,'2025-08-22','Assignment',5,8500,'Completed'),\n(5011,1011,'2025-09-10','Project',1,12500,'Completed'),\n(5012,1012,'2025-10-03','Exam',2,18000,'Pending'),\n(5013,1013,'2025-11-28','Quiz',3,27000,'Failed'),\n(5014,1014,'2025-12-17','Assignment',4,4200,'Completed'),\n(5015,1001,'2026-01-18','Project',5,6800,'Completed'),\n(5016,1002,'2026-02-12','Exam',1,9400,'Completed'),\n(5017,1003,'2026-03-14','Quiz',2,16000,'Pending'),\n(5018,1004,'2026-04-28','Assignment',3,21000,'Failed'),\n(5019,1005,'2026-05-11','Project',4,33000,'Completed'),\n(5020,1006,'2026-05-31','Exam',5,2800,'Completed'),\n(5021,1007,'2026-06-20','Quiz',1,5600,'Completed'),\n(5022,1008,'2026-07-10','Assignment',2,11200,'Pending'),\n(5023,1009,'2026-07-25','Project',3,14500,'Failed'),\n(5024,1010,'2026-08-21','Exam',4,26000,'Completed'),\n(5025,1011,'2026-08-30','Quiz',5,3900,'Completed'),\n(5026,1012,'2026-09-03','Assignment',1,7200,'Completed'),\n(5027,1013,'2026-09-08','Project',2,13500,'Pending'),\n(5028,1014,'2026-09-12','Exam',3,19500,'Failed'),\n(5029,1016,'2025-03-15','Quiz',1,2500,'Completed');"
  },
  Retail: {
    schema: "CREATE TABLE customers (customer_id INT PRIMARY KEY, customer_name VARCHAR(100), city VARCHAR(50), segment VARCHAR(30), joined_date DATE);\nCREATE TABLE products (product_id INT PRIMARY KEY, product_name VARCHAR(100), category VARCHAR(50), status VARCHAR(30), base_value NUMERIC(14,2));\nCREATE TABLE orders (order_id INT PRIMARY KEY, customer_id INT REFERENCES customers(customer_id), product_id INT REFERENCES products(product_id), order_date DATE, status VARCHAR(30), order_total NUMERIC(14,2));\nCREATE TABLE order_items (order_item_id INT PRIMARY KEY, order_id INT REFERENCES orders(order_id), item_date DATE, item_type VARCHAR(40), quantity INT, amount NUMERIC(14,2), status VARCHAR(30));",
    sample: "INSERT INTO customers (customer_id,customer_name,city,segment,joined_date) VALUES\n(1,'Arun','Chennai','Premium','2024-01-01'),\n(2,'Meena','Madurai','Standard','2025-02-01'),\n(3,'Divya','Bengaluru','Enterprise','2024-03-01'),\n(4,'Karthik','Coimbatore','Student','2025-04-01'),\n(5,'Nila','Salem','Premium','2024-05-01'),\n(6,'Vijay','Hyderabad','Standard','2025-06-01'),\n(7,'Asha','Mumbai','Enterprise','2024-07-01'),\n(8,'Rahul','Pune','Student','2025-08-01'),\n(9,'Zoya','Chennai','Standard','2025-01-01');\nINSERT INTO products (product_id,product_name,category,status,base_value) VALUES\n(101,'Electronics Plan','Electronics','Active',5000),\n(102,'Grocery Plan','Grocery','Active',12500),\n(103,'Fashion Plan','Fashion','Active',20000),\n(104,'Home Plan','Home','Active',27500),\n(105,'Books Plan','Books','Inactive',35000),\n(106,'Sports Plan','Sports','Active',42500),\n(107,'Archived Plan','Electronics','Inactive',5000);\nINSERT INTO orders (order_id,customer_id,product_id,order_date,status,order_total) VALUES\n(1001,1,101,'2025-01-10','Active',12000),\n(1002,2,102,'2025-02-14','Pending',25000),\n(1003,3,103,'2025-03-20','Closed',50000),\n(1004,4,104,'2025-05-05','Active',75000),\n(1005,5,105,'2025-07-18','Active',100000),\n(1006,6,106,'2025-09-01','Pending',150000),\n(1007,7,101,'2025-11-22','Closed',8000),\n(1008,8,102,'2026-01-15','Active',42000),\n(1009,1,103,'2026-02-10','Pending',68000),\n(1010,2,104,'2026-03-12','Closed',91000),\n(1011,3,105,'2026-04-25','Active',30000),\n(1012,4,106,'2026-05-30','Active',54000),\n(1013,5,101,'2026-07-08','Pending',110000),\n(1014,6,102,'2026-08-19','Closed',18000),\n(1015,1,101,'2025-04-10','Active',25000),\n(1016,2,102,'2024-05-10','Active',35000);\nINSERT INTO order_items (order_item_id,order_id,item_date,item_type,quantity,amount,status) VALUES\n(5001,1001,'2025-01-15','Sale',1,500,'Completed'),\n(5002,1002,'2025-01-30','Return',2,1200,'Pending'),\n(5003,1003,'2025-02-20','Exchange',3,2500,'Failed'),\n(5004,1004,'2025-03-02','Discount',4,5000,'Completed'),\n(5005,1005,'2025-03-21','Sale',5,7500,'Completed'),\n(5006,1006,'2025-04-12','Return',1,10000,'Completed'),\n(5007,1007,'2025-05-18','Exchange',2,15000,'Pending'),\n(5008,1008,'2025-06-05','Discount',3,22000,'Failed'),\n(5009,1009,'2025-07-19','Sale',4,3000,'Completed'),\n(5010,1010,'2025-08-22','Return',5,8500,'Completed'),\n(5011,1011,'2025-09-10','Exchange',1,12500,'Completed'),\n(5012,1012,'2025-10-03','Discount',2,18000,'Pending'),\n(5013,1013,'2025-11-28','Sale',3,27000,'Failed'),\n(5014,1014,'2025-12-17','Return',4,4200,'Completed'),\n(5015,1001,'2026-01-18','Exchange',5,6800,'Completed'),\n(5016,1002,'2026-02-12','Discount',1,9400,'Completed'),\n(5017,1003,'2026-03-14','Sale',2,16000,'Pending'),\n(5018,1004,'2026-04-28','Return',3,21000,'Failed'),\n(5019,1005,'2026-05-11','Exchange',4,33000,'Completed'),\n(5020,1006,'2026-05-31','Discount',5,2800,'Completed'),\n(5021,1007,'2026-06-20','Sale',1,5600,'Completed'),\n(5022,1008,'2026-07-10','Return',2,11200,'Pending'),\n(5023,1009,'2026-07-25','Exchange',3,14500,'Failed'),\n(5024,1010,'2026-08-21','Discount',4,26000,'Completed'),\n(5025,1011,'2026-08-30','Sale',5,3900,'Completed'),\n(5026,1012,'2026-09-03','Return',1,7200,'Completed'),\n(5027,1013,'2026-09-08','Exchange',2,13500,'Pending'),\n(5028,1014,'2026-09-12','Discount',3,19500,'Failed'),\n(5029,1016,'2025-03-15','Sale',1,2500,'Completed');"
  }
};

function splitTopLevelCommas(str) {
  const parts = [];
  let current = '';
  let depth = 0;
  let inSingleQuote = false;
  for (let i = 0; i < str.length; i++) {
    const ch = str[i];
    if (ch === "'" && str[i - 1] !== '\\') {
      inSingleQuote = !inSingleQuote;
      current += ch;
      continue;
    }
    if (!inSingleQuote) {
      if (ch === '(') depth++;
      else if (ch === ')' && depth > 0) depth--;
      else if (ch === ',' && depth === 0) {
        parts.push(current.trim());
        current = '';
        continue;
      }
    }
    current += ch;
  }
  if (current.trim()) parts.push(current.trim());
  return parts;
}

export function parseDdlMetadata(ddlSql) {
  const meta = {};
  if (!ddlSql || typeof ddlSql !== 'string') return meta;
  const createRegex = /CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?([a-zA-Z0-9_]+)\s*\(([\s\S]*?)\)\s*;/gi;
  let match;
  while ((match = createRegex.exec(ddlSql)) !== null) {
    const tableName = match[1].trim();
    const body = match[2].trim();
    const colDefs = splitTopLevelCommas(body);
    const colsMeta = {};
    colDefs.forEach(def => {
      if (/^(?:PRIMARY\s+KEY|FOREIGN\s+KEY|CONSTRAINT|UNIQUE|CHECK)\b/i.test(def)) return;
      const m = def.match(/^([a-zA-Z0-9_]+)\s+(.+)$/i);
      if (!m) return;
      const colName = m[1].trim();
      const rest = m[2].trim();
      const isPk = /\bPRIMARY\s+KEY\b/i.test(rest);
      const refMatch = rest.match(/\bREFERENCES\s+([a-zA-Z0-9_]+)(?:\s*\(\s*([a-zA-Z0-9_]+)\s*\))?/i);
      const isFk = Boolean(refMatch);
      const refTable = refMatch ? refMatch[1] : null;
      const refColumn = refMatch && refMatch[2] ? refMatch[2] : null;
      const typePart = rest
        .replace(/\bPRIMARY\s+KEY\b/gi, '')
        .replace(/\bNOT\s+NULL\b/gi, '')
        .replace(/\bUNIQUE\b/gi, '')
        .replace(/\bREFERENCES\s+[a-zA-Z0-9_]+(?:\s*\(\s*[a-zA-Z0-9_]+\s*\))?/gi, '')
        .replace(/\bDEFAULT\s+\S+/gi, '')
        .trim();
      colsMeta[colName] = {
        dataType: typePart || null,
        isPk,
        isFk,
        refTable,
        refColumn
      };
    });
    meta[tableName] = colsMeta;
  }
  return meta;
}

export function parseSampleRecords(sampleSql) {
  const tables = {};
  if (!sampleSql || typeof sampleSql !== 'string') return tables;
  const insertRegex = /INSERT\s+INTO\s+([a-zA-Z0-9_]+)\s*\(([^)]+)\)\s*VALUES\s*([\s\S]*?);/gi;
  let match;
  while ((match = insertRegex.exec(sampleSql)) !== null) {
    const tableName = match[1].trim();
    const cols = match[2].split(',').map(c => c.trim()).filter(Boolean);
    const rawValues = match[3].trim();
    const rowRegex = /\(([^)]+)\)/g;
    const rows = [];
    let rowMatch;
    while ((rowMatch = rowRegex.exec(rawValues)) !== null) {
      const rawTokens = splitTopLevelCommas(rowMatch[1]);
      const vals = rawTokens.map(token => {
        const t = token.trim();
        if (/^NULL$/i.test(t)) return null;
        if (t.startsWith("'") && t.endsWith("'")) {
          return t.slice(1, -1).replace(/''/g, "'");
        }
        return t;
      });
      rows.push(vals);
    }
    if (!tables[tableName]) {
      tables[tableName] = { cols, rows };
    } else {
      tables[tableName].rows.push(...rows);
    }
  }
  return tables;
}

function parseSchema(schemaText) {
  if (!schemaText) return [];
  if (Array.isArray(schemaText)) {
    return schemaText.map(t => ({
      name: String(t.name || t.tableName || '').trim(),
      columns: Array.isArray(t.columns) ? t.columns.map(c => {
        if (typeof c === 'string') return { name: c.trim(), key: null, dataType: null, references: null };
        return {
          name: String(c.name || c.column || '').trim(),
          key: c.key || (c.isPk || c.primaryKey ? 'PK' : (c.isFk || c.foreignKey ? 'FK' : null)),
          dataType: c.dataType || c.type || null,
          references: c.references || c.refTable || null
        };
      }).filter(c => c.name) : []
    })).filter(t => t.name);
  }
  if (typeof schemaText !== 'string') return [];

  // Support CREATE TABLE DDL strings directly if passed as schemaText
  if (/^\s*CREATE\s+TABLE\b/i.test(schemaText)) {
    const ddlMeta = parseDdlMetadata(schemaText);
    return Object.keys(ddlMeta).map(tableName => {
      const colMap = ddlMeta[tableName];
      return {
        name: tableName,
        columns: Object.keys(colMap).map(colName => {
          const info = colMap[colName];
          return {
            name: colName,
            key: info.isPk ? 'PK' : (info.isFk ? 'FK' : null),
            dataType: info.dataType || null,
            references: info.refTable ? (info.refColumn ? `${info.refTable}(${info.refColumn})` : info.refTable) : null
          };
        })
      };
    });
  }

  const tableChunks = schemaText.split(';').map(s => s.trim()).filter(Boolean);
  const tables = [];
  tableChunks.forEach(chunk => {
    const m = chunk.match(/^(\w+)\((.*)\)$/);
    if (!m) return;
    const name = m[1];
    const colParts = splitTopLevelCommas(m[2]);
    const cols = colParts.map(c => c.trim()).filter(Boolean).map(colDef => {
      let working = colDef;
      let references = null;
      const refMatch = working.match(/(?:->|→|\bREFERENCES\b)\s*([a-zA-Z0-9_]+(?:\([a-zA-Z0-9_]+\))?)/i);
      if (refMatch) {
        references = refMatch[1].trim();
        working = working.replace(refMatch[0], '').trim();
      }
      const parts = working.split(/\s+/).filter(Boolean);
      let key = null;
      if (parts.length > 1 && /^PK$/i.test(parts[parts.length - 1])) {
        key = 'PK';
        parts.pop();
      } else if (parts.length > 1 && /^FK$/i.test(parts[parts.length - 1])) {
        key = 'FK';
        parts.pop();
      }
      const colName = parts[0] || '';
      const inlineType = parts.length > 1 ? parts.slice(1).join(' ') : null;
      return { name: colName, key, dataType: inlineType, references };
    });
    tables.push({ name, columns: cols });
  });
  return tables;
}

function inferReference(colName, tableNames, currentTable) {
  if (!colName.endsWith('_id')) return null;
  const base = colName.slice(0, -3);
  const guess = pluralize(base);
  const candidates = [guess, base, base + 's'];
  for (const c of candidates) {
    if (tableNames.includes(c) && c !== currentTable) return c;
  }
  return null;
}

export const TABLE_ICONS = {
  customers: '👤', accounts: '🏦', transactions: '💳', account_products: '📦',
  patients: '🧑‍⚕️', doctors: '🩺', appointments: '📅', visits: '📋',
  insurance_products: '🛡️', policies: '📄', claims: '🧾',
  investors: '💼', securities: '📈', holdings: '📊', trades: '⚡',
  clients: '🏢', chip_products: '🔲', production_batches: '🏭', test_results: '🔬',
  students: '🎓', courses: '📚', enrollments: '📝', assessments: '🎯',
  products: '📦', orders: '🧺', order_items: '🧾', healthcare: '🏥', payments: '💳'
};

export { parseSchema, inferReference };

function resolveDomainAssetForTables(tables, options = {}) {
  if (options && Object.prototype.hasOwnProperty.call(options, 'asset')) {
    return options.asset;
  }
  if (options && options.domain && DOMAIN_SCHEMA_ASSETS[options.domain]) {
    return DOMAIN_SCHEMA_ASSETS[options.domain];
  }
  if (!Array.isArray(tables) || tables.length === 0) return null;
  const tableNames = tables.map(t => t.name);
  const matchingDomains = Object.keys(DOMAIN_SCHEMA_ASSETS).filter(dk => {
    const dm = parseDdlMetadata(DOMAIN_SCHEMA_ASSETS[dk].schema);
    return tableNames.every(tn => Object.prototype.hasOwnProperty.call(dm, tn));
  });
  if (matchingDomains.length === 1) {
    return DOMAIN_SCHEMA_ASSETS[matchingDomains[0]];
  }
  return null;
}

function buildSampleRecordsTableHtml(tableObj, parsedSampleTable) {
  if (!parsedSampleTable || !Array.isArray(parsedSampleTable.rows) || parsedSampleTable.rows.length === 0) {
    return '<div class="schema-sample-empty" role="status">No sample records available for this table.</div>';
  }
  const schemaColNames = tableObj.columns.map(c => c.name);
  const sampleColMap = new Map();
  parsedSampleTable.cols.forEach((colName, idx) => {
    sampleColMap.set(colName.toLowerCase(), idx);
  });

  // Use exact matching column headers from the table's declared schema
  const activeCols = schemaColNames.filter(colName => sampleColMap.has(colName.toLowerCase()));
  if (activeCols.length === 0) {
    return '<div class="schema-sample-empty" role="status">No matching sample records available for this table schema.</div>';
  }

  const displayRows = parsedSampleTable.rows.slice(0, 8);
  const theadCells = activeCols.map(colName => '<th>' + escapeHtml(colName) + '</th>').join('');
  const tbodyRows = displayRows.map(row => {
    const cells = activeCols.map(colName => {
      const colIdx = sampleColMap.get(colName.toLowerCase());
      const val = colIdx !== undefined ? row[colIdx] : undefined;
      if (val === null || val === undefined || /^NULL$/i.test(String(val))) {
        return '<td class="sample-cell-null"><span class="sample-null-badge">NULL</span></td>';
      }
      return '<td>' + escapeHtml(String(val)) + '</td>';
    }).join('');
    return '<tr>' + cells + '</tr>';
  }).join('');

  const totalCount = parsedSampleTable.rows.length;
  const footerNote = totalCount > displayRows.length
    ? '<div class="schema-sample-caption">Showing ' + displayRows.length + ' of ' + totalCount + ' sample records</div>'
    : '<div class="schema-sample-caption">Showing all ' + totalCount + ' sample records</div>';

  return (
    '<div class="table-scroll" tabindex="0" role="region" aria-label="Sample records for ' + escapeHtml(tableObj.name) + '">' +
      '<table class="sample-table">' +
        '<thead><tr>' + theadCells + '</tr></thead>' +
        '<tbody>' + tbodyRows + '</tbody>' +
      '</table>' +
    '</div>' +
    footerNote
  );
}

export function renderSchemaCards(schemaText, options = {}) {
  const container = document.getElementById('schema');
  if (!container) return;
  const tables = parseSchema(schemaText);

  if (!tables.length) {
    container.innerHTML = '<div class="schema-text">' + escapeHtml(String(schemaText || '')) + '</div>';
    return;
  }

  const resolvedAsset = resolveDomainAssetForTables(tables, options);
  const ddlSql = options?.ddlSql ?? resolvedAsset?.schema ?? '';
  const sampleSql = options?.sampleSql ?? resolvedAsset?.sample ?? '';
  const ddlMetadata = parseDdlMetadata(ddlSql);
  const parsedSamples = options?.sampleData || parseSampleRecords(sampleSql);

  const tableNames = tables.map(t => t.name);
  container.innerHTML = tables.map(t => {
    const tableDdlMeta = ddlMetadata[t.name] || {};
    const tableSample = parsedSamples[t.name] || null;
    const sampleCount = tableSample && Array.isArray(tableSample.rows) ? tableSample.rows.length : 0;
    const panelId = 'schema-sample-panel-' + escapeHtml(t.name);

    const rows = t.columns.map(c => {
      const colDdl = tableDdlMeta[c.name] || null;
      const dataType = c.dataType || (colDdl && colDdl.dataType ? colDdl.dataType : null);
      let badges = '';
      let ref = '';

      if (c.key === 'PK') {
        badges += '<span class="badge-pk" title="Primary Key">PK</span>';
      }
      if (c.key === 'FK') {
        badges += '<span class="badge-fk" title="Foreign Key">FK</span>';
        const explicitTarget = c.references || (colDdl && colDdl.refTable ? colDdl.refTable : null);
        const target = explicitTarget || inferReference(c.name, tableNames, t.name);
        if (target) {
          ref = '<span class="fk-ref" title="References ' + escapeHtml(target) + '">→ ' + escapeHtml(target) + '</span>';
        }
      }

      const typeHtml = dataType
        ? '<span class="schema-col-type">' + escapeHtml(dataType) + '</span>'
        : '';

      return (
        '<li class="schema-row">' +
          '<div class="schema-col-main">' +
            '<span class="schema-col-name">' + escapeHtml(c.name) + '</span>' +
            typeHtml +
          '</div>' +
          (ref || badges ? '<div class="schema-badges">' + ref + badges + '</div>' : '') +
        '</li>'
      );
    }).join('');

    const icon = TABLE_ICONS[t.name] || '🗂️';
    const sampleHtml = buildSampleRecordsTableHtml(t, tableSample);
    const countBadge = sampleCount > 0
      ? '<span class="schema-sample-count">' + sampleCount + ' rows</span>'
      : '<span class="schema-sample-count empty">0 rows</span>';

    return (
      '<article class="schema-card" data-table="' + escapeHtml(t.name) + '">' +
        '<header class="schema-card-head">' +
          '<div class="schema-card-title-wrap">' +
            '<span class="tbl-icon" aria-hidden="true">' + icon + '</span>' +
            '<h4 class="schema-table-name">' + escapeHtml(t.name) + '</h4>' +
          '</div>' +
          '<span class="schema-col-count">' + t.columns.length + ' cols</span>' +
        '</header>' +
        '<ul class="schema-card-body" aria-label="Columns for ' + escapeHtml(t.name) + '">' + rows + '</ul>' +
        '<div class="schema-sample-section">' +
          '<button type="button" class="schema-sample-toggle" aria-expanded="false" aria-controls="' + panelId + '" onclick="if(window.toggleSchemaSampleCard)window.toggleSchemaSampleCard(this)">' +
            '<span class="schema-sample-toggle-label">View sample records</span>' +
            '<span class="schema-sample-toggle-right">' +
              countBadge +
              '<span class="schema-sample-chevron" aria-hidden="true">▾</span>' +
            '</span>' +
          '</button>' +
          '<div class="schema-sample-panel" id="' + panelId + '" hidden>' +
            sampleHtml +
          '</div>' +
        '</div>' +
      '</article>'
    );
  }).join('');
}

/**
 * Formats single-line or multi-line text into safe SQL line comments (`-- ...`).
 * Every line—including blank lines and lines after \n or \r\n—is prefixed with `--`
 * so no business-question or instruction text ever appears as executable SQL.
 */
export function formatSqlCommentLines(label, text) {
  const normalized = String(text ?? '')
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .trim();

  if (!normalized) {
    return label ? [`-- ${label}: N/A`] : ['--'];
  }

  const rawLines = normalized.split('\n');
  return rawLines.map((line, idx) => {
    const cleanLine = line.trimEnd();
    if (idx === 0) {
      return label
        ? (cleanLine ? `-- ${label}: ${cleanLine}` : `-- ${label}:`)
        : (cleanLine ? `-- ${cleanLine}` : '--');
    }
    return cleanLine.trim() ? `-- ${cleanLine}` : '--';
  });
}

/**
 * Splits a multi-statement SQL script into individual statements without breaking
 * on semicolons inside single-quoted literals, double-quoted identifiers,
 * single-line comments (--), or block comments (/* ... *\/).
 */
export function splitSqlStatements(rawSql) {
  const normalized = String(rawSql ?? '')
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .trim();
  if (!normalized) return [];

  const statements = [];
  let current = '';
  let inSingleQuote = false;
  let inDoubleQuote = false;
  let inLineComment = false;
  let inBlockComment = false;

  for (let i = 0; i < normalized.length; i++) {
    const ch = normalized[i];
    const next = normalized[i + 1];

    if (inLineComment) {
      current += ch;
      if (ch === '\n') {
        inLineComment = false;
      }
      continue;
    }

    if (inBlockComment) {
      current += ch;
      if (ch === '*' && next === '/') {
        current += next;
        i++;
        inBlockComment = false;
      }
      continue;
    }

    if (inSingleQuote) {
      current += ch;
      if (ch === "'" && next === "'") {
        current += next;
        i++;
        continue;
      }
      if (ch === "'" && normalized[i - 1] !== '\\') {
        inSingleQuote = false;
      }
      continue;
    }

    if (inDoubleQuote) {
      current += ch;
      if (ch === '"' && next === '"') {
        current += next;
        i++;
        continue;
      }
      if (ch === '"') {
        inDoubleQuote = false;
      }
      continue;
    }

    if (ch === '-' && next === '-') {
      inLineComment = true;
      current += ch + next;
      i++;
      continue;
    }

    if (ch === '/' && next === '*') {
      inBlockComment = true;
      current += ch + next;
      i++;
      continue;
    }

    if (ch === "'") {
      inSingleQuote = true;
      current += ch;
      continue;
    }

    if (ch === '"') {
      inDoubleQuote = true;
      current += ch;
      continue;
    }

    if (ch === ';') {
      const trimmed = current.trim();
      if (trimmed) {
        statements.push(trimmed + ';');
      }
      current = '';
      continue;
    }

    current += ch;
  }

  const tail = current.trim();
  if (tail) {
    statements.push(tail.endsWith(';') ? tail : tail + ';');
  }

  return statements;
}

/**
 * Prepares a complete SQL practice package containing:
 * 1. The scenario's CREATE TABLE schema statements
 * 2. The scenario's INSERT statements for sample data
 * 3. The correct reference SQL query answer for that specific question
 * 4. Clear SQL comments separating the schema, sample data, and reference answer
 */
export function buildFiddlePracticePackage(scenario, asset) {
  if (!scenario || !asset) return '';

  const activeVariant = (scenario.selectedVariant && typeof scenario.selectedVariant === 'object')
    ? scenario.selectedVariant
    : null;

  const domain = String(scenario.domain || '').trim();
  const level = String(scenario.level || '').trim();
  const questionText = String(
    activeVariant?.question ??
    activeVariant?.business_scenario ??
    scenario.question ??
    scenario.business_scenario ??
    ''
  ).trim();
  const referenceSql = String(
    activeVariant?.sql ??
    activeVariant?.answer_sql ??
    scenario.sql ??
    scenario.answer_sql ??
    ''
  ).trim();

  const schemaRaw = String(asset.schema || '').trim();
  const sampleRaw = String(asset.sample || '').trim();

  // Require executable CREATE TABLE DDL, matching INSERT sample statements, and a non-empty reference query.
  // Never export descriptive schema shorthand such as `customers(customer_id PK, ...)` as executable DDL.
  if (!schemaRaw || !/\bCREATE\s+TABLE\b/i.test(schemaRaw)) return '';
  if (!sampleRaw || !/\bINSERT\s+INTO\b/i.test(sampleRaw)) return '';
  if (!referenceSql) return '';

  const schemaStatements = splitSqlStatements(schemaRaw);
  const sampleStatements = splitSqlStatements(sampleRaw);
  const queryStatements = splitSqlStatements(referenceSql);

  if (schemaStatements.length === 0 || sampleStatements.length === 0 || queryStatements.length === 0) {
    return '';
  }

  const formattedSchema = schemaStatements.join('\n\n');
  const formattedSample = sampleStatements.join('\n\n');
  const formattedQuery = queryStatements.join('\n\n');

  const questionCommentLines = formatSqlCommentLines('Question', questionText);

  const packageLines = [
    '-- ====================================================================',
    '-- CRACK SQL PRACTICE PACKAGE',
    ...formatSqlCommentLines('Scenario', scenario.id || 'N/A'),
    ...formatSqlCommentLines('Domain', `${domain || 'N/A'} | Level: ${level || 'N/A'}`),
    '-- Database Engine: PostgreSQL (Select PostgreSQL v15 / v16 in DB Fiddle)',
    '-- DB Fiddle Instructions:',
    '--   1. Set the Database Engine dropdown in DB Fiddle to PostgreSQL.',
    '--   2. Paste Section 1 (Table Schema) and Section 2 (Sample Data) into',
    '--      the Schema SQL (left) panel, and Section 3 (Reference SQL Query)',
    '--      into the Query SQL (right) panel — or paste this full script —',
    '--      then click Run.',
    ...questionCommentLines,
    '-- ====================================================================',
    '',
    '-- --------------------------------------------------------------------',
    '-- 1. TABLE SCHEMA (CREATE TABLE STATEMENTS)',
    '-- --------------------------------------------------------------------',
    formattedSchema,
    '',
    '-- --------------------------------------------------------------------',
    '-- 2. SAMPLE DATA (INSERT STATEMENTS)',
    '-- --------------------------------------------------------------------',
    formattedSample,
    '',
    '-- --------------------------------------------------------------------',
    '-- 3. REFERENCE SQL QUERY (CORRECT ANSWER)',
    ...questionCommentLines,
    '-- --------------------------------------------------------------------',
    formattedQuery,
    ''
  ];

  return packageLines.join('\n');
}

