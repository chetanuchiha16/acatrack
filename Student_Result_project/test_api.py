import requests

url = 'http://127.0.0.1:5000/auth/Student/result'
params = {'usn': '1JS22CS001', 'semester': 'sem1'}

try:
    response = requests.get(url, params=params)
    print(f'Status Code: {response.status_code}')
    if response.status_code == 200:
        data = response.json()
        print('
--- API Response Structure ---')
        for key in data.keys():
            if key == 'subjects' and isinstance(data[key], list) and len(data[key]) > 0:
                print(f'{key}: List of {len(data[key])} items. First item keys: {list(data[key][0].keys())}')
            elif key == 'pdf_url':
                print(f'{key}: string (length: {len(data[key])})')
            else:
                 print(f'{key}: {type(data[key]).__name__} = {data[key]}')
    else:
        print(response.text)
except requests.exceptions.ConnectionError:
    print('Error: Server is not running. Please start the app.')

