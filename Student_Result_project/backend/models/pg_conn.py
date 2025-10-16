import psycopg2

postgres_db_url = "postgresql+psycopg2://chetan:chetan@localhost:5433/Group_Project"
class PostgresConnection:
    def __init__(self, batch_year):
        self.batch_year = batch_year
        self.conn = psycopg2.connect(
            "dbname=Group_Project user=chetan password=chetan host=localhost port=5433"
        )

    def cursor(self):
        return self.conn.cursor()

    def commit(self):
        self.conn.commit()

    def close(self):
        self.conn.close()
