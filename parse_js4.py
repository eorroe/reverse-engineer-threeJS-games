import re

with open('/workspace/0a976afa-9d91-494d-85d2-5832b5541cb3/sessions/agent_da0d71bf-bc6f-44f1-9c4a-390410ab9e41/output/main.js', 'r') as f:
    content = f.read()

# Find the Mg function to understand the entry submission
pattern = r'async function Mg\(e\)\{[^]+\}'
matches = list(re.finditer(pattern, content))
print(f'Found {len(matches)} Mg function matches')
for i, m in enumerate(matches):
    start = max(0, m.start() - 50)
    end = min(len(content), m.end() + 800)
    print(f'\n--- Mg function {i+1} ---')
    print(content[start:end])
    print('...')

# Find all calls to Ag with context
ag_context = r'Ag\([^)]+\)'
matches = list(re.finditer(ag_context, content))
print(f'\nFound {len(matches)} Ag calls')
for i, m in enumerate(matches[:10]):
    start = max(0, m.start() - 100)
    end = min(len(content), m.end() + 100)
    print(f'\n--- Ag call {i+1} ---')
    print(content[start:end])
