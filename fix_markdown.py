import re

# Fix README.md
with open('README.md', 'r', encoding='utf-8') as f:
    readme = f.read()

# Replace bare URL with markdown link
readme = readme.replace('| VITE_API_URL | No | http://localhost:5000 |', '| VITE_API_URL | No | [localhost](http://localhost:5000) |')

with open('README.md', 'w', encoding='utf-8') as f:
    f.write(readme)
print('Fixed README.md - bare URL resolved')

# Fix SCAN_SUMMARY.md
with open('SCAN_SUMMARY.md', 'r', encoding='utf-8') as f:
    scan = f.read()

# Fix table separators
scan = re.sub(r'\|---+\|---+\|---+\|', '| --- | --- | --- |', scan)
scan = re.sub(r'\|---+\|---+\|', '| --- | --- |', scan)

# Add blank lines before headings
scan = re.sub(r'([^\n])\n(###)', r'\1\n\n\2', scan)

# Add blank lines between heading and list
scan = re.sub(r'(###[^\n]+)\n(- |\d+\.)', r'\1\n\n\2', scan)

# Add spaces around code language specification
scan = scan.replace('```\n```', '```text\n```')

with open('SCAN_SUMMARY.md', 'w', encoding='utf-8') as f:
    f.write(scan)
print('Fixed SCAN_SUMMARY.md')
print('All markdown formatting complete!')
