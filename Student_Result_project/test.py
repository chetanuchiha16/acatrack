import ssl
from urllib.request import Request, urlopen
from urllib.error import HTTPError

url = "http://localhost:5000/auth/Student/analysis?usn=1JS23CS032&semester=1"
try:
    response = urlopen(url)
    print(response.read().decode())
except HTTPError as e:
    print(e.read().decode())
