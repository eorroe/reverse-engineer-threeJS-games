import re

with open('/workspace/0a976afa-9d91-494d-85d2-5832b5541cb3/sessions/agent_da0d71bf-bc6f-44f1-9c4a-390410ab9e41/output/main.js', 'r') as f:
    content = f.read()

# Find all fetch calls
fetches = re.findall(r'fetch\([`"]([^`"]+)[`"]', content)
print('Fetch calls:')
for f in set(fetches):
    print(f)

# Find XMLHttpRequest open calls
xhr = re.findall(r'\.open\([`"]([A-Z]+)[`"],\s*[`"]([^`"]+)[`"]', content)
print('\nXHR calls:')
for method, url in set(xhr):
    print(f'{method} {url}')

# Find WebSocket
ws = re.findall(r'new WebSocket\([`"]([^`"]+)[`"]\)', content)
print('\nWebSocket:')
for w in set(ws):
    print(w)
