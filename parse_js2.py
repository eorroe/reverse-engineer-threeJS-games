import re

with open('/workspace/0a976afa-9d91-494d-85d2-5832b5541cb3/sessions/agent_da0d71bf-bc6f-44f1-9c4a-390410ab9e41/output/main.js', 'r') as f:
    content = f.read()

# Find the fetch pattern with escaped braces
pattern = r'fetch\(`/api/\$\{e\}`,([^)]+)\)'
matches = list(re.finditer(pattern, content))
print(f'Found {len(matches)} matches')
for i, m in enumerate(matches[:5]):
    start = max(0, m.start() - 300)
    end = min(len(content), m.end() + 300)
    print(f'\n--- Match {i+1} ---')
    print(content[start:end])
