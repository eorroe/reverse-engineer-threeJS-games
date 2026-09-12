import re

with open('/workspace/0a976afa-9d91-494d-85d2-5832b5541cb3/sessions/agent_da0d71bf-bc6f-44f1-9c4a-390410ab9e41/output/main.js', 'r') as f:
    content = f.read()

# Find the Ag function and all API endpoints it uses
pattern = r'async function Ag\(e,t\)\{[^}]+\}'
matches = list(re.finditer(pattern, content))
print(f'Found {len(matches)} Ag function matches')

# Find all /api/... endpoints
api_pattern = r'`/api/([^`]+)`'
api_matches = re.findall(api_pattern, content)
print('\nAll API endpoints found:')
for endpoint in set(api_matches):
    print(f'  /api/{endpoint}')

# Find where Ag is called with different first arguments
ag_calls = re.findall(r'Ag\([`"]([^`"]+)[`"]', content)
print('\nAg calls with static strings:')
for call in set(ag_calls):
    print(f'  {call}')
