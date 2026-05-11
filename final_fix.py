import re

# Fix README
with open('README.md', 'r', encoding='utf-8') as f:
    readme = f.read()

# Fix heading levels - #### Results should be ###
readme = readme.replace('#### Results', '### Results')

# Add blank lines before headings if missing
readme = re.sub(r'([^\n])\n(### )', r'\1\n\n\2', readme)

# Add blank lines before lists
readme = re.sub(r'(###[^\n]+)\n(-)', r'\1\n\n\2', readme)

# Fix Phase 2/3 lists
readme = re.sub(r'(### Phase \d \(.*?\))\n(\- \[)', r'\1\n\n\2', readme)

with open('README.md', 'w', encoding='utf-8') as f:
    f.write(readme)
print('✓ Fixed README.md')

# Fix SCAN_SUMMARY
with open('SCAN_SUMMARY.md', 'r', encoding='utf-8') as f:
    scan = f.read()

# Fix empty links (remove #)
scan = scan.replace('](#)', ']')

# Fix table separators with misaligned columns
scan = re.sub(r'\| --- \| --- \| --- \|\-+\|', '| --- | --- | --- | --- |', scan)
scan = re.sub(r'\| --- \| --- \| --- \|-+\|', '| --- | --- | --- | --- |', scan)

# Add language to all code fences
scan = re.sub(r'```\n```', '```text\n```', scan)

# Fix numbered lists starting at 4, 5, 6...
scan = re.sub(r'^4\. ', '1. ', scan, flags=re.MULTILINE)
scan = re.sub(r'^5\. ', '2. ', scan, flags=re.MULTILINE)
scan = re.sub(r'^6\. ', '3. ', scan, flags=re.MULTILINE)
scan = re.sub(r'^7\. ', '4. ', scan, flags=re.MULTILINE)
scan = re.sub(r'^8\. ', '5. ', scan, flags=re.MULTILINE)
scan = re.sub(r'^9\. ', '1. ', scan, flags=re.MULTILINE)
scan = re.sub(r'^10\. ', '2. ', scan, flags=re.MULTILINE)
scan = re.sub(r'^11\. ', '3. ', scan, flags=re.MULTILINE)
scan = re.sub(r'^12\. ', '4. ', scan, flags=re.MULTILINE)

# Add blank lines before lists/headings
scan = re.sub(r'([^\n])\n(### )', r'\1\n\n\2', scan)
scan = re.sub(r'(### [^\n]+)\n(\- \[|[0-9]\.)', r'\1\n\n\2', scan)

with open('SCAN_SUMMARY.md', 'w', encoding='utf-8') as f:
    f.write(scan)
print('✓ Fixed SCAN_SUMMARY.md')

print('✅ All markdown files fixed!')
