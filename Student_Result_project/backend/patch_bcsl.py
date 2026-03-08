import psycopg2

conn_str = 'postgresql://chetan:4myHina!@10.49.58.115:5432/gp_normalised'
conn = psycopg2.connect(conn_str)
cur = conn.cursor()

# Find any variations of BCSL305
cur.execute("SELECT subject_code, semester FROM subjects WHERE subject_code LIKE '%BCSL%' OR subject_code LIKE '%305%'")
print('Found:', cur.fetchall())

# Patch it forcefully
cur.execute("UPDATE subjects SET semester = 'sem3' WHERE subject_code LIKE '%BCSL305%' OR subject_code LIKE '%BCSL 305%'")
print('Updated rows:', cur.rowcount)
conn.commit()
cur.close()
conn.close()
