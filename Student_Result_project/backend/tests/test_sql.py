import sqlite3
from models.config import db_path

#temp function to print table names
def print_table_names(db_path=db_path):
    try:
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()

        # Query to get all table names
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table';")
        tables = cursor.fetchall()

        # Print table names
        print("Tables in the database:")
        for table in tables:
            print(table[0])

    except sqlite3.Error as e:
        print(f"Database error occurred: {e}")
    finally:
        conn.close()

# Example usage
#print_table_names()

#temp function to print table columns

def print_column_names(db_path=db_path):
    try:
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()

        # Query to get all table names
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table';")
        tables = cursor.fetchall()

        # Loop through each table and get column names
        for table in tables:
            table_name = table[0]
            print(f"/nColumns in table '{table_name}':")
            
            # Get column names for the current table
            cursor.execute(f"PRAGMA table_info({table_name});")
            columns = cursor.fetchall()
            
            for column in columns:
                print(column[1])  # Column name is the second item in each row of PRAGMA result

    except sqlite3.Error as e:
        print(f"Database error occurred: {e}")
    finally:
        conn.close()

if __name__ == "__main__":
    # Example usage
    print_column_names()